import { createHash, createPublicKey, createVerify, randomBytes } from "node:crypto";
import { Parser } from "htmlparser2";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  bodyProgressEntrySchema,
  dietPlanSchema,
  notificationSchema,
  publicUserEmail,
  isInternalPhoneEmail,
  getAppEnv,
  isQaDemoIdentifier,
  isQaFreshIdentifier,
  isSeededDemoIdentifier,
  QA_DEMO_ACCOUNT_EMAIL,
  QA_DEMO_ACCOUNT_PHONE,
  QA_TEST_OTP,
  orgRoles,
  validateRuntimeConfig,
  type PaymentMandateStatus,
  type NotificationType,
  type OrgRole,
  type PlanType,
} from "@zook/core";
import {
  getEmailProvider,
  getEmailProviderDiagnostics,
  getMapProvider,
  getMapProviderDiagnostics,
  getPaymentProvider,
  getPaymentProviderDiagnostics,
  getStorageProvider,
  getStorageProviderDiagnostics,
  getSmsProvider,
  getSmsProviderDiagnostics,
  type StorageFileCategory,
  type ParsedPaymentWebhookEvent,
} from "@zook/core/providers";
import {
  AuthService,
  canReceiveNotification,
  canAssignPlanToUser,
  badgeMilestoneDefinitions,
  computeSubscriptionWindow,
  consumeVisit,
  createPlanVersionSnapshot,
  enforceNotificationRateLimits,
  type OtpChallengeRecord,
  applyCoupon,
  assertManualPaymentRecordContext,
  evaluateBadgeMilestones,
  getNextBadgeMilestone,
  MANUAL_MEMBERSHIP_PAYMENT_TOLERANCE_PAISE,
  validateManualMembershipPaymentAmount,
  validateReferralRedemption,
} from "@zook/core/services";
import { Prisma, prisma } from "@zook/db";
import { refreshSessionCookieName, sessionCookieName } from "../context";
import { ensurePaymentInvoiceDocument } from "../invoices/generate";
import { renderInvoicePdfBuffer } from "../invoices/pdf";
import {
  getRequestContext,
  requireAuth,
  requireOrgPermission,
} from "../access";
import {
  ApiRouteError,
  conflictError,
  forbiddenError,
  notFoundError,
  serviceUnavailableError,
  unauthorizedError,
  validationError,
} from "../errors";
import { fail, ok, readJson } from "../response";
import { resolveSessionSummaryFromToken } from "../session";
import { createUniqueMemberSlug } from "../member-slug";
import { privateUserHandle } from "../private-user-handle";
import { writeAuditLog } from "../audit";
import { assertRateLimit, defaultRateLimitRules } from "../rate-limit";
import { currentRequestId } from "../request-state";
import { getClientIp } from "../security";
import {
  assertFileAssetBelongsToOrg,
  assertFileAssetOwnedByUser,
} from "../files";
import { applyAutopayProviderEvent, applyPaymentSessionStatus } from "../payment-runtime";
import { deliverPushForNotification } from "../push-runtime";
import { assertMinorConsentGranted } from "../minor-gates";
import { getOrganizationPaymentsPage } from "../domains/payments";
import {
  pricingFromPlanCatalog,
  saasPlanCatalogFromSetting,
  type PaidSaasTier,
  type SaasBillingCycle,
  type SaasEntitlements,
  type SaasTier,
} from "../domains/billing/saas-plans";
import {
  accruePtClawback,
  accruePtSessionFee,
  accruePtSubscriptionCommission,
  addPayoutAdjustment,
  getPayoutConfig,
  listPayouts,
  markPayoutPaid,
  upsertPayoutConfig,
} from "../domains/payouts";
import { extractPlanExercises } from "../domains/plans";

const subscriptionCheckoutSchema = z.object({
  planId: z.string(),
  couponCode: z.string().trim().toUpperCase().optional(),
  referralCode: z.string().trim().toUpperCase().optional(),
});

const subscriptionRenewSchema = z.object({
  planId: z.string().optional(),
  couponCode: z.string().trim().toUpperCase().optional(),
  referralCode: z.string().trim().toUpperCase().optional(),
});

export const referralRedeemSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .transform((value) => value.toUpperCase()),
});

export const publicCouponValidateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .transform((value) => value.toUpperCase()),
  planId: z.string(),
});

const membershipAutopaySchema = z.object({
  planId: z.string().optional(),
});

const subscriptionSwitchSchema = z.object({
  planId: z.string(),
  effectiveAt: z.string().datetime().optional(),
});

const subscriptionPauseSchema = z.object({
  resumesAt: z.string().datetime(),
  reason: z.string().trim().max(240).optional(),
});

const manualMembershipPaymentSchema = z
  .object({
    purpose: z.enum(["MEMBERSHIP", "SHOP_ORDER", "OTHER"]).default("MEMBERSHIP"),
    memberUserId: z.string().optional(),
    planId: z.string().optional(),
    subscriptionId: z.string().optional(),
    shopOrderId: z.string().optional(),
    description: z.string().trim().max(500).optional(),
    amountPaise: z.number().int().positive(),
    mode: z.enum(["CASH", "DIRECT_UPI", "BANK_TRANSFER", "CARD", "OTHER"]),
    proofAssetId: z.string().optional(),
    receiptNumber: z.string().optional(),
    notes: z.string().max(500).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.purpose === "MEMBERSHIP" && !value.memberUserId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "A member is required." });
    }
    if (value.purpose === "MEMBERSHIP" && !value.planId && !value.subscriptionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A plan or subscription is required.",
      });
    }
    if (value.purpose === "SHOP_ORDER" && !value.shopOrderId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "A shop order is required." });
    }
    if (value.purpose === "OTHER" && !value.description) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "A description is required." });
    }
  });

export const attendanceRejectSchema = z.object({
  reason: z.string().trim().min(2).max(200),
});

export const attendanceDetailParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export const receptionCodeVerifySchema = z.object({
  code: z.string().trim().min(3).max(40),
});

export const manualAttendanceSchema = z.object({
  memberUserId: z.string(),
  branchId: z.string().optional(),
  reason: z.string().trim().min(2).max(200),
  notes: z.string().max(500).optional(),
});

const notificationAudienceKinds = [
  "selected_members",
  "single_member",
  "all_active_members",
  "expiring_soon",
  "assigned_clients",
  "membership_plan",
  "branch_members",
] as const;

export const notificationComposerSchema = notificationSchema
  .extend({
    audience: z.enum(notificationAudienceKinds),
    branchId: z.string().optional().nullable(),
    singleUserId: z.string().optional(),
    selectedUserIds: z.array(z.string()).default([]),
    planId: z.string().optional(),
    daysAhead: z.number().int().min(1).max(30).default(7),
    templateId: z.string().optional(),
    metadata: z.record(z.string(), z.string()).optional(),
    excludeMinors: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.audience === "single_member" && !value.singleUserId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Choose one member." });
    }
    if (value.audience === "selected_members" && value.selectedUserIds.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Choose at least one member." });
    }
    if (value.audience === "membership_plan" && !value.planId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Choose a plan." });
    }
    if (value.audience === "branch_members" && !value.branchId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Choose a branch." });
    }
  });

export const paymentRefundSchema = z.object({
  amountPaise: z.number().int().positive().optional(),
  reason: z.string().trim().min(2).max(200).default("Owner requested refund"),
});

export const platformImpersonateSchema = z.object({
  reason: z.string().trim().min(6).max(240),
  ttlMinutes: z.number().int().min(1).max(60).default(15),
  targetOrgId: z.string().optional(),
});

export const platformBroadcastSchema = z.object({
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(2).max(1000),
  severity: z.enum(["INFO", "WARN", "CRITICAL"]).default("INFO"),
  status: z.enum(["DRAFT", "SCHEDULED", "LIVE", "EXPIRED"]).default("DRAFT"),
  targetOrgIds: z.array(z.string()).max(100).default([]),
  targetRoles: z
    .array(z.enum(["OWNER", "ADMIN", "RECEPTIONIST", "TRAINER", "MEMBER"]))
    .default([]),
  scheduledAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export const platformFlagPatchSchema = z.object({
  key: z.string().trim().min(2).max(120),
  enabled: z.boolean().optional(),
  description: z.string().trim().max(500).optional(),
  rolloutPercent: z.number().int().min(0).max(100).optional(),
  overrideOrgIds: z.array(z.string()).max(500).optional(),
});

export const platformOrgTrialExtendSchema = z.object({
  days: z.number().int().min(1).max(365),
  reason: z.string().trim().min(2).max(240),
});

export const platformOrgCreditSchema = z.object({
  paise: z.number().int().min(-10_000_000).max(10_000_000),
  reason: z.string().trim().min(2).max(240),
});

export const platformOrgTierSchema = z.object({
  tier: z.enum(["FREE", "STARTER", "GROWTH", "PRO"]),
  effectiveAt: z.string().datetime().optional(),
});

const saasEntitlementsSchema = z.object({
  memberLimit: z.number().int().min(0).nullable().optional(),
  branchLimit: z.number().int().min(0).nullable().optional(),
  staffLimit: z.number().int().min(0).nullable().optional(),
  trainerLimit: z.number().int().min(0).nullable().optional(),
  productLimit: z.number().int().min(0).nullable().optional(),
  notificationMonthlyLimit: z.number().int().min(0).nullable().optional(),
  aiTextMonthlyLimit: z.number().int().min(0).optional(),
  aiImageMonthlyLimit: z.number().int().min(0).optional(),
});

const platformSaasPlanPatchSchema = z.object({
  monthlyPaise: z.number().int().positive().max(100_000_000),
  yearlyPaise: z.number().int().positive().max(1_000_000_000),
  entitlements: saasEntitlementsSchema.optional(),
});

export const platformSaasPricingSchema = z.object({
  starter: platformSaasPlanPatchSchema,
  growth: platformSaasPlanPatchSchema,
  pro: platformSaasPlanPatchSchema,
});

export const platformSubscriptionNoteSchema = z.object({
  note: z.string().trim().max(1000),
});

export const platformReferralPolicySchema = z.object({
  enabled: z.boolean().default(true),
  referrerRewardType: z.enum(["TRIAL_DAYS", "CREDIT_PAISE", "NONE"]).default("TRIAL_DAYS"),
  referrerRewardValue: z.number().int().min(0).max(10_000_000).default(30),
  referredRewardType: z.enum(["TRIAL_DAYS", "DISCOUNT_PERCENT_BPS", "CREDIT_PAISE", "NONE"]).default("TRIAL_DAYS"),
  referredRewardValue: z.number().int().min(0).max(10_000_000).default(30),
  maxRedemptionsPerOrg: z.number().int().min(1).max(1000).default(25),
  expiresInDays: z.number().int().min(1).max(730).default(180),
});

export const platformOrgRenameSchema = z.object({
  name: z.string().trim().min(2).max(120),
  username: z.string().trim().min(3).max(64).regex(/^[a-z0-9-]+$/),
  reason: z.string().trim().min(2).max(240),
});

export const platformOrgReasonSchema = z.object({
  reason: z.string().trim().min(2).max(240),
});

export const platformOrgTransferSchema = z.object({
  newOwnerUserId: z.string(),
  reason: z.string().trim().min(2).max(240),
});

export const platformModerationDecisionSchema = z.object({
  id: z.string(),
  decision: z.enum(["APPROVED", "REMOVED"]),
  reason: z.string().trim().min(2).max(240),
});

export const subscriptionReminderResolveSchema = z.object({
  status: z.enum(["RESOLVED", "CANCELLED"]).default("RESOLVED"),
});

const planContentInputSchema = z.object({
  title: z.string().trim().min(2).max(120),
  type: z
    .enum([
      "WORKOUT",
      "DIET",
      "EXERCISE_ROUTINE",
      "TRANSFORMATION_PROGRAM",
      "TRAINER_NOTE",
      "GYM_ADVISORY",
      "MACHINE_GUIDE",
      "RECOVERY",
    ])
    .default("WORKOUT"),
  description: z.string().max(500).optional(),
  content: z.record(z.string(), z.any()).default({ blocks: [] }),
  imageAssetId: z.string().optional(),
  visibility: z.string().default("selected"),
  aiGenerated: z.boolean().default(false),
});

const planContentUpdateSchema = planContentInputSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Provide at least one plan field to update.");

export const aiStructuredPlanContentSchema = z.object({
  title: z.string().trim().min(2).max(120),
  type: z
    .enum([
      "WORKOUT",
      "DIET",
      "EXERCISE_ROUTINE",
      "TRANSFORMATION_PROGRAM",
      "TRAINER_NOTE",
      "GYM_ADVISORY",
      "MACHINE_GUIDE",
      "RECOVERY",
    ])
    .default("WORKOUT"),
  days: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        exercises: z
          .array(
            z.object({
              name: z.string().trim().min(1).max(120),
              sets: z.string().trim().max(40).optional(),
              reps: z.string().trim().max(40).optional(),
              equipment: z.string().trim().max(80).optional(),
              notes: z.string().trim().max(240).optional(),
            }),
          )
          .min(1),
      }),
    )
    .min(1),
  goal: z.string().trim().max(240).optional(),
  notes: z.string().trim().max(1000).optional(),
});

const allowedRichTextTags = new Set([
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "p",
  "br",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "a",
]);
const richTextVoidTags = new Set(["br"]);

function escapeRichTextHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeRichTextHref(value: string | undefined) {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const schemeMatch = trimmed.match(/^([a-z][a-z0-9+.-]*):/i);
  if (!schemeMatch) {
    return undefined;
  }
  const scheme = schemeMatch[1]?.toLowerCase();
  if (scheme !== "http" && scheme !== "https" && scheme !== "mailto") {
    return undefined;
  }
  return trimmed;
}

function sanitizeAllowedRichText(value: string) {
  const output: string[] = [];
  const openTags: string[] = [];
  const parser = new Parser(
    {
      onopentag(name, attributes) {
        const tag = name.toLowerCase();
        if (!allowedRichTextTags.has(tag)) {
          return;
        }
        if (tag === "a") {
          const href = normalizeRichTextHref(attributes.href);
          const target =
            attributes.target && ["_blank", "_self", "_parent", "_top"].includes(attributes.target)
              ? attributes.target
              : undefined;
          output.push("<a");
          if (href) output.push(` href="${escapeRichTextHtml(href)}"`);
          if (target) output.push(` target="${escapeRichTextHtml(target)}"`);
          output.push(' rel="noopener noreferrer">');
        } else {
          output.push(`<${tag}>`);
        }
        if (!richTextVoidTags.has(tag)) {
          openTags.push(tag);
        }
      },
      ontext(text) {
        output.push(escapeRichTextHtml(text));
      },
      onclosetag(name) {
        const tag = name.toLowerCase();
        if (!allowedRichTextTags.has(tag) || richTextVoidTags.has(tag)) {
          return;
        }
        const index = openTags.lastIndexOf(tag);
        if (index === -1) {
          return;
        }
        for (let cursor = openTags.length - 1; cursor >= index; cursor -= 1) {
          output.push(`</${openTags[cursor]}>`);
        }
        openTags.splice(index);
      },
    },
    { decodeEntities: true },
  );
  parser.write(value);
  parser.end();
  for (let cursor = openTags.length - 1; cursor >= 0; cursor -= 1) {
    output.push(`</${openTags[cursor]}>`);
  }
  return output.join("");
}

export function sanitizeRichText(value: string | undefined) {
  if (value === undefined) {
    return undefined;
  }
  return sanitizeAllowedRichText(value).trim();
}

export function sanitizeJsonRichText(value: unknown): unknown {
  if (typeof value === "string") {
    return sanitizeRichText(value);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeJsonRichText(entry));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        sanitizeJsonRichText(entry),
      ]),
    );
  }
  return value;
}

export const profilePhotoAssetSchema = z.object({
  fileAssetId: z.string(),
  orgId: z.string().optional(),
  consentToAttendanceUse: z.boolean().optional(),
});

export const memberWellnessProfileSchema = z.object({
  orgId: z.string().optional(),
  name: z.string().trim().min(2).max(120).optional(),
  email: z
    .union([z.string().trim().toLowerCase().email(), z.literal("").transform(() => null), z.null()])
    .optional(),
  phone: z
    .union([z.string().trim().min(6).max(24), z.literal("").transform(() => null), z.null()])
    .optional(),
  dateOfBirth: z.string().trim().optional(),
  gender: z
    .union([z.string().trim().max(80), z.literal("").transform(() => null), z.null()])
    .optional(),
  emergencyContact: z
    .object({
      name: z.union([z.string().trim().max(120), z.null()]).optional(),
      phone: z.union([z.string().trim().max(24), z.null()]).optional(),
    })
    .optional(),
  fitnessGoal: z.string().trim().max(240).optional(),
  marketingOptIn: z.boolean().optional(),
  aiConsent: z.boolean().optional(),
  preferredLocale: z.enum(["en", "hi"]).optional(),
  weeklyWorkoutGoal: z.number().int().min(1).max(14).optional(),
  weightKg: z.number().positive().max(500).optional(),
  dietPreference: z.string().trim().max(120).optional(),
  allergies: z.string().trim().max(240).optional(),
  summaryNote: z.string().trim().max(500).optional(),
});

export const appleAuthCallbackSchema = z.object({
  identityToken: z.string().trim().min(20),
  fullName: z.string().trim().min(1).max(160).optional(),
});

export const googleAuthCallbackSchema = z.object({
  idToken: z.string().trim().min(20),
});

export const organizationBillingDetailsSchema = z.object({
  legalName: z.string().trim().min(2).max(160),
  gstNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/),
  contactEmail: z.string().trim().email(),
  contactPhone: z.string().trim().min(8).max(20).optional().or(z.literal("")),
  address: z.string().trim().min(3).max(240),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
});

export const saasBillingMandateSchema = z.object({
  amountPaise: z.number().int().positive().max(2_000_000).optional(),
});

export const saasUpgradeSchema = z.object({
  tier: z.enum(["STARTER", "GROWTH", "PRO"]),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
});

const trainerProfileAssetSchema = z.object({
  upiId: z.string().trim().max(120).optional(),
  upiQrAssetId: z.string().optional(),
  bio: z.string().max(500).optional(),
});

const ptSubscriptionSchema = z.object({
  memberUserId: z.string(),
  trainerUserId: z.string(),
  ptPlanId: z.string().optional(),
  amountPaise: z.number().int().positive(),
  paymentMode: z.enum(["CASH", "DIRECT_UPI", "OTHER"]),
  totalSessions: z.number().int().positive().optional(),
  notes: z.string().max(500).optional(),
  proofAssetId: z.string().optional(),
});

const ptSessionLogSchema = z.object({
  subscriptionId: z.string(),
  sessionAt: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

const payoutConfigSchema = z.object({
  baseMonthlyPaise: z.number().int().nonnegative(),
  ptCommissionPercent: z.number().int().min(0).max(100),
  perSessionFeePaise: z.number().int().nonnegative(),
  payDay: z.number().int().min(1).max(28),
});

const payoutAdjustmentSchema = z.object({
  amountPaise: z.number().int(),
  description: z.string().trim().min(2).max(160),
});

const payoutMarkPaidSchema = z.object({
  method: z.string().trim().min(2).max(40),
  note: z.string().trim().max(240).optional(),
  proofFileAssetId: z.string().optional(),
});

const planAssignSchema = z.object({
  assignedToUserId: z.string().optional(),
  audience: z.enum(["selected_member"]).default("selected_member"),
});

export const planProgressInputSchema = z.object({
  orgId: z.string().optional(),
  progressJson: z.record(z.string(), z.any()).default({}),
  completionPct: z.number().int().min(0).max(100).default(0),
  feedback: z.string().max(500).optional(),
});

export const planCompletionInputSchema = z.object({
  orgId: z.string().optional(),
  exercises: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().trim().min(1),
        completed: z.boolean().default(true),
        setsCompleted: z.number().int().nonnegative().optional(),
        reps: z.number().int().nonnegative().optional(),
        weightKg: z.number().nonnegative().optional(),
        notes: z.string().max(500).optional(),
      }),
    )
    .default([]),
  progressJson: z.record(z.string(), z.any()).default({}),
  feedback: z.string().max(500).optional(),
});

const planFeedbackSchema = z.object({
  planAssignmentId: z.string(),
  message: z.string().trim().min(1).max(500),
});

const trainerClientNoteSchema = z.object({
  note: z.string().max(2_000).default(""),
});

export function clean<T extends Record<string, unknown>>(input: T): any {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

export async function isFeatureFlagEnabled(key: string, orgId?: string) {
  const flag = await prisma.featureFlag.findUnique({ where: { key } });
  if (!flag) {
    return false;
  }
  if (orgId && flag.overrideOrgIds.includes(orgId)) {
    return true;
  }
  return flag.enabled && flag.rolloutPercent > 0;
}

export function assertNotImpersonating(ctx: { impersonationSessionId?: string }, action: string) {
  if (ctx.impersonationSessionId) {
    throw forbiddenError(`${action} is blocked during impersonation.`);
  }
}

export function jsonObject(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function refundPaymentForActor(input: {
  request: NextRequest;
  paymentId: string;
  actorUserId: string;
  reason: string;
  amountPaise?: number;
  platformRefund?: boolean;
}) {
  const { payment, requestedRefund, refundAmountPaise, orgId } = await prisma.$transaction(
    async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: input.paymentId } });
      if (!payment) {
        throw notFoundError("Payment not found");
      }
      const orgId = payment.orgId;
      if (!orgId) {
        throw validationError("Only organization payments can be refunded.");
      }
      if (!["SUCCEEDED", "PARTIALLY_REFUNDED"].includes(payment.status)) {
        throw conflictError("Only successful or partly refunded payments can be refunded.");
      }

      const existingRefunds = await tx.paymentRefund.findMany({
        where: {
          paymentId: payment.id,
          orgId,
          status: { notIn: ["FAILED", "CANCELLED"] },
        },
      });
      const alreadyRefundedPaise = existingRefunds.reduce(
        (total, refund) => total + refund.amountPaise,
        0,
      );
      const refundableAmountPaise = Math.max(payment.amountPaise - alreadyRefundedPaise, 0);
      if (refundableAmountPaise <= 0) {
        throw conflictError("This payment has already been fully refunded.");
      }
      const refundAmountPaise = input.amountPaise ?? refundableAmountPaise;
      if (refundAmountPaise > refundableAmountPaise) {
        throw validationError(
          `Refund amount cannot exceed the remaining ${Math.round(refundableAmountPaise / 100)} rupees.`,
        );
      }

      const requestedRefund = await tx.paymentRefund.create({
        data: clean({
          orgId,
          branchId: payment.branchId,
          paymentId: payment.id,
          provider: payment.provider,
          amountPaise: refundAmountPaise,
          currency: payment.currency,
          status: "REQUESTED",
          reason: input.reason,
          requestedById: input.actorUserId,
          metadata: input.platformRefund ? { platformRefund: true } : undefined,
        }),
      });

      return { payment, requestedRefund, refundAmountPaise, orgId };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
  const requiresProviderRefund = Boolean(payment.providerRef && payment.provider);
  const provider = requiresProviderRefund ? getPaymentProviderOrThrow() : null;
  let refund;
  try {
    refund =
      provider && payment.providerRef
        ? await provider.refundPayment({
            paymentId: payment.providerRef,
            amountPaise: refundAmountPaise,
            reason: input.reason,
          })
        : {
            status: "REFUNDED" as const,
            providerRefundId: undefined,
          };
  } catch (cause) {
    await prisma.paymentRefund.update({
      where: { id: requestedRefund.id },
      data: {
        status: "FAILED",
        failureReason: cause instanceof Error ? cause.message : "Refund failed.",
      },
    });
    throw cause;
  }
  const processedAt = new Date();
  const { updatedRefund, updated, nextStatus } = await prisma.$transaction(
    async (tx) => {
      const updatedRefund = await tx.paymentRefund.update({
        where: { id: requestedRefund.id },
        data: {
          status: refund.status,
          providerRefundId: refund.providerRefundId ?? null,
          processedAt,
          providerResponse: refund as unknown as Prisma.InputJsonValue,
          metadata: clean({
            ...jsonObject(requestedRefund.metadata),
            platformRefund: input.platformRefund || undefined,
          }) as Prisma.InputJsonValue,
        },
      });
      const refreshedPayment = await tx.payment.findUnique({ where: { id: payment.id } });
      if (!refreshedPayment) {
        throw notFoundError("Payment not found");
      }
      const activeRefunds = await tx.paymentRefund.findMany({
        where: {
          paymentId: payment.id,
          orgId,
          status: { notIn: ["FAILED", "CANCELLED"] },
        },
      });
      const nextRefundedAmountPaise = activeRefunds.reduce(
        (total, activeRefund) => total + activeRefund.amountPaise,
        0,
      );
      const nextStatus =
        nextRefundedAmountPaise >= refreshedPayment.amountPaise ? "REFUNDED" : "PARTIALLY_REFUNDED";
      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: nextStatus,
          metadata: {
            ...jsonObject(refreshedPayment.metadata),
            refundedAmountPaise: nextRefundedAmountPaise,
            refund: {
              refundId: requestedRefund.id,
              status: refund.status,
              providerRefundId: refund.providerRefundId,
              amountPaise: refundAmountPaise,
              reason: input.reason,
              refundedAt: processedAt.toISOString(),
              refundedById: input.actorUserId,
              platformRefund: Boolean(input.platformRefund),
            },
          },
        },
      });
      return { updatedRefund, updated, nextStatus };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
  await writeAuditLog({
    request: input.request,
    orgId,
    actorUserId: input.actorUserId,
    action: input.platformRefund ? "platform.payment.refunded" : "payment.refunded",
    entityType: "payment",
    entityId: payment.id,
    riskLevel: "HIGH",
    metadata: {
      refundId: updatedRefund.id,
      providerRefundId: refund.providerRefundId,
      amountPaise: refundAmountPaise,
      status: nextStatus,
      platformRefund: Boolean(input.platformRefund),
    },
  });
  return { payment: updated, refund: updatedRefund };
}

const exclusiveOrgRoles = [...orgRoles];

const orgRoleLabels: Record<OrgRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  RECEPTIONIST: "Reception",
  TRAINER: "Trainer",
  MEMBER: "Member",
};

type RoleAssignmentClient = Pick<typeof prisma, "organizationRoleAssignment">;
type MembershipEnsureClient = Pick<
  typeof prisma,
  "organizationUser" | "organizationRoleAssignment" | "memberProfile"
>;

export async function assertSingleRoleForOrgUser(
  client: RoleAssignmentClient,
  input: { orgId: string; userId: string; nextRole: OrgRole; allowAssignmentId?: string },
) {
  const existingAssignment = await client.organizationRoleAssignment.findFirst({
    where: clean({
      orgId: input.orgId,
      userId: input.userId,
      role: { in: exclusiveOrgRoles.filter((role) => role !== input.nextRole) },
      id: input.allowAssignmentId ? { not: input.allowAssignmentId } : undefined,
    }),
  });
  if (!existingAssignment) {
    return;
  }
  const existingRole = orgRoleLabels[existingAssignment.role as OrgRole] ?? existingAssignment.role;
  const nextRole = orgRoleLabels[input.nextRole];
  throw conflictError(
    `This account already has ${existingRole} access for this gym. Change that role before adding ${nextRole} access.`,
  );
}

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function isHttpsRequest(request: NextRequest) {
  return (
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase() === "https"
  );
}

function shouldUseSecureSessionCookie(request: NextRequest) {
  const appEnv = getAppEnv();
  if (appEnv !== "local" && !isHttpsRequest(request)) {
    throw serviceUnavailableError(
      "HTTPS is required for session cookies outside local environments.",
    );
  }
  return appEnv !== "local" || isHttpsRequest(request);
}

function sessionCookieDomain() {
  return process.env.NODE_ENV === "production" ? ".zookfit.in" : undefined;
}

export function sharedSessionCookieOptions(request: NextRequest, expires: Date, path = "/") {
  const domain = sessionCookieDomain();
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: shouldUseSecureSessionCookie(request),
    expires,
    path,
    ...(domain ? { domain } : {}),
  };
}

export async function revokeActiveSessionsForUsers(userIds: string[]) {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  if (!uniqueUserIds.length) {
    return;
  }
  await prisma.userSession.updateMany({
    where: {
      userId: { in: uniqueUserIds },
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { revokedAt: new Date() },
  });
}

export function responseBodyForStorage(text: string): Prisma.InputJsonValue {
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text) as Prisma.InputJsonValue;
  } catch {
    return { rawBody: text };
  }
}

function isIdempotentOperation(path: string[], method: string) {
  if (method !== "POST") {
    return false;
  }
  const idempotentPostPatterns: Array<Array<string | RegExp>> = [
    ["payments", "checkout"],
    ["payments", "mock", /.+/, "complete"],
    ["attendance", "scan"],
    ["orgs", /.+/, "manual-payments"],
    ["orgs", /.+/, "manual-payments", "general"],
    ["orgs", /.+/, "payments", /.+/, "refund"],
    ["platform", "payments", /.+/, "refund"],
    ["orgs", /.+/, "payments", /.+/, "receipt"],
    ["orgs", /.+/, "payments", /.+/, "invoice"],
    ["orgs", /.+/, "shop", "orders", /.+/, "manual-payment"],
    ["orgs", /.+/, "saas-subscription", "cancel"],
    ["orgs", /.+/, "subscriptions", /.+/, "switch"],
    ["me", "subscriptions", /.+/, "switch"],
    ["me", "memberships", /.+/, "switch"],
    ["me", "memberships", /.+/, "autopay"],
    ["me", "payments", /.+/, "receipt"],
    ["me", "payments", /.+/, "invoice"],
    ["orgs", /.+/, "classes"],
    ["orgs", /.+/, "classes", /.+/, "enroll"],
    ["shop", "orders"],
  ];
  return idempotentPostPatterns.some((pattern) => pathMatches(path, pattern));
}

export async function withIdempotency(
  request: NextRequest,
  path: string[],
  execute: () => Promise<NextResponse>,
) {
  const idempotencyKey = request.headers.get("idempotency-key")?.trim();
  if (!idempotencyKey || !isIdempotentOperation(path, request.method)) {
    return execute();
  }

  const ctx = await getRequestContext(
    request,
    path[0] === "orgs" && path[1] ? { orgId: path[1] } : {},
  );
  const operation = `${request.method} /api/${path.join("/")}`;
  const requestHash = sha256(idempotencyKey);
  const createdAfter = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const idempotency = prisma.requestIdempotency;
  const existing = await idempotency.findFirst({
    where: {
      userId: ctx.userId ?? null,
      operation,
      requestHash,
      createdAt: { gte: createdAfter },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    const replay = NextResponse.json(existing.body, {
      status: existing.status,
      headers: {
        "x-idempotency-replay": "true",
      },
    });
    const requestId = currentRequestId();
    if (requestId) {
      replay.headers.set("x-request-id", requestId);
    }
    return replay;
  }

  const response = await execute();
  const responseText = await response.clone().text();
  const storedBody = responseBodyForStorage(responseText);
  try {
    await idempotency.create({
      data: {
        userId: ctx.userId ?? null,
        operation,
        requestHash,
        resultHash: sha256(responseText),
        status: response.status,
        body: storedBody,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const duplicate = await idempotency.findFirst({
        where: {
          userId: ctx.userId ?? null,
          operation,
          requestHash,
          createdAt: { gte: createdAfter },
        },
        orderBy: { createdAt: "desc" },
      });
      if (duplicate) {
        const replay = NextResponse.json(duplicate.body, {
          status: duplicate.status,
          headers: {
            "x-idempotency-replay": "true",
          },
        });
        const requestId = currentRequestId();
        if (requestId) {
          replay.headers.set("x-request-id", requestId);
        }
        return replay;
      }
    }
    throw error;
  }
  return response;
}

export function parseMemberProfileNotes(notes?: string | null) {
  if (!notes) {
    return {};
  }
  try {
    const parsed = JSON.parse(notes);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : { summaryNote: notes };
  } catch {
    return { summaryNote: notes };
  }
}

function dateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function operationalDateKey(date = new Date(), timeZone = "Asia/Kolkata") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return year && month && day ? `${year}-${month}-${day}` : dateKey(date);
}

export function entryCodeForAttendanceId(id: string) {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) % 10_000;
  }
  return `ZK-${String(hash).padStart(4, "0")}`;
}

export function attendanceWithEntryCode<T extends { id: string }>(record: T) {
  return { ...record, entryCode: entryCodeForAttendanceId(record.id) };
}

export const attendanceCheckoutSchema = z.object({
  reason: z.enum(["manual", "geofence", "qr_scan"]).default("manual"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

function attendanceDurationSeconds(checkedInAt: Date, checkedOutAt: Date) {
  return Math.max(0, Math.floor((checkedOutAt.getTime() - checkedInAt.getTime()) / 1000));
}

export async function closeAttendanceSession<
  T extends { id: string; checkedInAt: Date; checkedOutAt?: Date | null },
>(record: T, reason: "manual" | "geofence" | "qr_scan", now = new Date()) {
  if (record.checkedOutAt) {
    return record;
  }
  return prisma.attendanceRecord.update({
    where: { id: record.id },
    data: {
      checkedOutAt: now,
      checkoutReason: reason,
      durationSeconds: attendanceDurationSeconds(record.checkedInAt, now),
    },
  });
}

function addDaysToDate(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export async function getSaasPlanCatalog() {
  const setting = await prisma.platformSetting.findUnique({ where: { key: "saas.pricing" } });
  return saasPlanCatalogFromSetting(setting?.value);
}

export async function getSaasPricing() {
  return pricingFromPlanCatalog(await getSaasPlanCatalog());
}

async function getOrgSaasTier(orgId: string): Promise<SaasTier> {
  const subscription = await prisma.saaSSubscription.findUnique({
    where: { orgId },
    select: { tier: true },
  });
  const tier = subscription?.tier;
  return tier === "STARTER" || tier === "GROWTH" || tier === "PRO" ? tier : "FREE";
}

export async function getOrgSaasEntitlements(orgId: string): Promise<{
  tier: SaasTier;
  entitlements: SaasEntitlements;
}> {
  const [catalog, tier] = await Promise.all([getSaasPlanCatalog(), getOrgSaasTier(orgId)]);
  return { tier, entitlements: catalog[tier].entitlements };
}

export function assertLimitAvailable(input: {
  limit: number | null;
  used: number;
  add?: number;
  label: string;
  tier: SaasTier;
}) {
  if (input.limit === null) return;
  const add = input.add ?? 1;
  if (input.used + add <= input.limit) return;
  throw new ApiRouteError(
    402,
    "SAAS_PLAN_LIMIT_REACHED",
    `${input.label} limit reached for the ${input.tier.toLowerCase()} plan. Upgrade to continue.`,
    {
      tier: input.tier,
      limit: input.limit,
      used: input.used,
      requested: add,
      label: input.label,
    },
  );
}

export async function assertSaasMemberCapacity(orgId: string, userId?: string) {
  const existing = userId
    ? await prisma.memberProfile.findUnique({ where: { orgId_userId: { orgId, userId } } })
    : null;
  if (existing) return;
  const [{ tier, entitlements }, used] = await Promise.all([
    getOrgSaasEntitlements(orgId),
    prisma.memberProfile.count({ where: { orgId } }),
  ]);
  assertLimitAvailable({
    limit: entitlements.memberLimit,
    used,
    label: "Active member",
    tier,
  });
}

export async function assertSaasMemberCapacityForUsers(orgId: string, userIds: string[]) {
  const uniqueUserIds = Array.from(new Set(userIds));
  if (!uniqueUserIds.length) return;
  const [existingProfiles, { tier, entitlements }, used] = await Promise.all([
    prisma.memberProfile.findMany({
      where: { orgId, userId: { in: uniqueUserIds } },
      select: { userId: true },
    }),
    getOrgSaasEntitlements(orgId),
    prisma.memberProfile.count({ where: { orgId } }),
  ]);
  const existingUserIds = new Set(existingProfiles.map((profile) => profile.userId));
  const newMembers = uniqueUserIds.filter((userId) => !existingUserIds.has(userId)).length;
  assertLimitAvailable({
    limit: entitlements.memberLimit,
    used,
    add: newMembers,
    label: "Active member",
    tier,
  });
}

export async function getOrgSaasUsage(orgId: string) {
  const monthStart = startOfMonth();
  const notificationIds = await prisma.notification.findMany({
    where: { orgId, createdAt: { gte: monthStart } },
    select: { id: true },
  });
  const [
    activeMemberCount,
    branchCount,
    staffCount,
    trainerCount,
    productCount,
    notificationMonthlyCount,
    aiTextMonthlyCount,
    aiImageMonthlyCount,
  ] = await Promise.all([
    prisma.memberProfile.count({ where: { orgId } }),
    prisma.branch.count({ where: { orgId, active: true } }),
    prisma.organizationRoleAssignment.count({ where: { orgId, role: { not: "MEMBER" } } }),
    prisma.organizationRoleAssignment.count({ where: { orgId, role: "TRAINER" } }),
    prisma.product.count({ where: { orgId } }),
    notificationIds.length
      ? prisma.notificationRecipient.count({
          where: { notificationId: { in: notificationIds.map((row) => row.id) } },
        })
      : 0,
    prisma.aIUsageLog.count({
      where: {
        orgId,
        requestType: { in: ["CHAT", "STRUCTURED_PLAN"] },
        createdAt: { gte: monthStart },
      },
    }),
    prisma.aIUsageLog.count({
      where: { orgId, requestType: "IMAGE", createdAt: { gte: monthStart } },
    }),
  ]);
  return {
    activeMemberCount,
    branchCount,
    staffCount,
    trainerCount,
    productCount,
    notificationMonthlyCount,
    aiTextMonthlyCount,
    aiImageMonthlyCount,
  };
}

export function priceForSaasPlan(
  pricing: Awaited<ReturnType<typeof getSaasPricing>>,
  tier: PaidSaasTier,
  billingCycle: SaasBillingCycle,
) {
  return billingCycle === "YEARLY" ? pricing[tier].yearly : pricing[tier].monthly;
}

export function renewalAfter(start: Date, billingCycle: SaasBillingCycle) {
  const next = new Date(start);
  if (billingCycle === "YEARLY") {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}

function isSaasBillingRoute(path: string[]) {
  return (
    pathMatches(path, ["orgs", /.+/, "billing", "subscription"]) ||
    pathMatches(path, ["orgs", /.+/, "billing", "mandate"]) ||
    pathMatches(path, ["orgs", /.+/, "saas-subscription", "upgrade"]) ||
    pathMatches(path, ["orgs", /.+/, "saas-subscription", "cancel"]) ||
    pathMatches(path, ["orgs", /.+/, "billing-profile"]) ||
    pathMatches(path, ["orgs", /.+/, "profile"])
  );
}

export async function assertSaasWriteAccess(request: NextRequest, path: string[]) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) return;
  if (path[0] !== "orgs" || !path[1] || isSaasBillingRoute(path)) return;
  const orgId = path[1];
  const ctx = await getRequestContext(request, { orgId });
  if (!ctx.roles.some((role) => role === "OWNER" || role === "ADMIN")) return;
  const [subscription, mandate] = await Promise.all([
    prisma.saaSSubscription.findUnique({ where: { orgId } }),
    prisma.saaSBillingMandate.findUnique({ where: { orgId } }),
  ]);
  const trialEndAt = subscription?.trialEndAt
    ? new Date(subscription.trialEndAt)
    : (
        await prisma.organization.findUnique({
          where: { id: orgId },
          select: { trialEndAt: true },
        })
      )?.trialEndAt;
  const graceEndsAt = trialEndAt ? addDaysToDate(trialEndAt, 7) : null;
  const isPaid =
    subscription?.status === "ACTIVE" &&
    (!subscription.nextRenewalAt || subscription.nextRenewalAt.getTime() >= Date.now());
  const hasBillingSetup = Boolean(mandate && liveMandateStatuses.includes(mandate.status));
  if (!isPaid && !hasBillingSetup) {
    throw new ApiRouteError(
      403,
      "SAAS_BILLING_SETUP_REQUIRED",
      "Add billing before managing this gym.",
      { orgId, trialEndAt, graceEndsAt },
    );
  }
  if (isPaid || !graceEndsAt || graceEndsAt.getTime() >= Date.now()) return;
  throw new ApiRouteError(
    403,
    "SAAS_PAYMENT_REQUIRED",
    "Your Zook subscription expired. Renew to manage your gym.",
    { orgId, trialEndAt, graceEndsAt },
  );
}

export type EngagementBadgePayload = {
  id: string;
  badgeId: string;
  code: string;
  name: string;
  description: string;
  icon: string | null;
  awardedAt: Date;
  metadata: Prisma.JsonValue | null;
};

async function getEngagementStats(userId: string, orgId?: string) {
  const where = clean({
    userId,
    orgId,
    status: "APPROVED" as const,
  });
  const [totalCheckIns, attendance] = await Promise.all([
    prisma.attendanceRecord.count({ where }),
    prisma.attendanceRecord.findMany({
      where,
      orderBy: { checkedInAt: "desc" },
      select: { dateKey: true },
      take: 400,
    }),
  ]);
  const attendanceKeys = new Set(attendance.map((record) => record.dateKey));
  let streakDays = 0;
  for (let offset = 0; offset < 365; offset += 1) {
    if (!attendanceKeys.has(operationalDateKey(addDaysToDate(new Date(), -offset)))) {
      break;
    }
    streakDays += 1;
  }
  return { streakDays, totalCheckIns };
}

async function ensureBadgeRows(codes: string[]) {
  const definitions = badgeMilestoneDefinitions.filter((definition) =>
    codes.includes(definition.code),
  );
  return Promise.all(
    definitions.map((definition) =>
      prisma.badge.upsert({
        where: { code: definition.code },
        update: {
          name: definition.name,
          description: definition.description,
          icon: definition.icon,
        },
        create: {
          code: definition.code,
          name: definition.name,
          description: definition.description,
          icon: definition.icon,
        },
      }),
    ),
  );
}

export async function getBadgePayloads(userId: string, orgId?: string) {
  const userBadges = await prisma.userBadge.findMany({
    where: clean({ userId, orgId }),
    orderBy: { awardedAt: "desc" },
  });
  if (!userBadges.length) {
    return [] as EngagementBadgePayload[];
  }
  const badgeRows = await prisma.badge.findMany({
    where: { id: { in: Array.from(new Set(userBadges.map((badge) => badge.badgeId))) } },
  });
  const badgeById = new Map(badgeRows.map((badge) => [badge.id, badge]));
  return userBadges.map((userBadge) => {
    const badge = badgeById.get(userBadge.badgeId);
    return {
      id: userBadge.id,
      badgeId: userBadge.badgeId,
      code: badge?.code ?? "unknown",
      name: badge?.name ?? "Badge",
      description: badge?.description ?? "Badge earned.",
      icon: badge?.icon ?? null,
      awardedAt: userBadge.awardedAt,
      metadata: userBadge.metadata ?? null,
    };
  });
}

export async function awardEngagementBadges(input: { userId: string; orgId: string }) {
  const [stats, existingBadges] = await Promise.all([
    getEngagementStats(input.userId, input.orgId),
    getBadgePayloads(input.userId, input.orgId),
  ]);
  const newCodes = evaluateBadgeMilestones({
    ...stats,
    existingBadgeCodes: existingBadges.map((badge) => badge.code),
  });
  if (!newCodes.length) {
    return [] as EngagementBadgePayload[];
  }
  const badgeRows = await ensureBadgeRows(newCodes);
  await prisma.userBadge.createMany({
    data: badgeRows.map((badge) => ({
      orgId: input.orgId,
      userId: input.userId,
      badgeId: badge.id,
      metadata: {
        streakDays: stats.streakDays,
        totalCheckIns: stats.totalCheckIns,
      },
    })),
    skipDuplicates: true,
  });
  return getBadgePayloads(input.userId, input.orgId).then((badges) =>
    badges.filter((badge) => newCodes.includes(badge.code as (typeof newCodes)[number])),
  );
}

export async function getEngagementSummary(userId: string, orgId?: string) {
  const [stats, badges] = await Promise.all([
    getEngagementStats(userId, orgId),
    getBadgePayloads(userId, orgId),
  ]);
  return {
    ...stats,
    badges,
    latestBadge: badges[0] ?? null,
    nextMilestone: getNextBadgeMilestone({
      ...stats,
      existingBadgeCodes: badges.map((badge) => badge.code),
    }),
  };
}

export function checkInCodeForQrNonce(nonce: string) {
  const digest = createHash("sha256").update(`check-in:${nonce}`).digest();
  const letters = [digest[0], digest[1]]
    .map((value) => String.fromCharCode(65 + ((value ?? 0) % 26)))
    .join("");
  const digits = digest.readUInt32BE(2) % 10_000;
  return `${letters}-${String(digits).padStart(4, "0")}`;
}

export function normalizeCheckInCode(input: string) {
  const compact = input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const match = /^([A-Z]{2})([0-9]{4})$/.exec(compact);
  return match ? `${match[1]}-${match[2]}` : "";
}

export async function resolveOrgBranch(orgId: string, branchId?: string | null) {
  const branch = branchId
    ? await prisma.branch.findFirst({ where: { id: branchId, orgId, active: true } })
    : await prisma.branch.findFirst({ where: { orgId, isDefault: true, active: true } });
  if (!branch) {
    throw notFoundError(branchId ? "Branch not found" : "Default branch not found");
  }
  return branch;
}

function isDeskOnlyContext(ctx: Awaited<ReturnType<typeof getRequestContext>>) {
  return (
    !ctx.isPlatformAdmin &&
    ctx.roles.includes("RECEPTIONIST") &&
    !ctx.roles.some((role) => role === "OWNER" || role === "ADMIN")
  );
}

export async function assertBranchAccessForContext(
  ctx: Awaited<ReturnType<typeof getRequestContext>>,
  orgId: string,
  requestedBranchId?: string | null,
) {
  const allBranchesRequested = requestedBranchId === "all";
  const canUseAllBranches =
    ctx.isPlatformAdmin || ctx.roles.some((role) => role === "OWNER" || role === "ADMIN");
  if (!isDeskOnlyContext(ctx)) {
    if (allBranchesRequested) {
      if (!canUseAllBranches) {
        throw forbiddenError("Only owners and admins can open all branches.");
      }
      return undefined;
    }
    const branch = await resolveOrgBranch(orgId, requestedBranchId);
    return branch.id;
  }
  if (allBranchesRequested) {
    throw forbiddenError("This desk account can only open its assigned branch.");
  }
  if (!ctx.userId) {
    throw unauthorizedError();
  }
  const assignment = await prisma.organizationRoleAssignment.findFirst({
    where: { orgId, userId: ctx.userId, role: "RECEPTIONIST" },
    select: { branchId: true },
  });
  let branchId = assignment?.branchId;
  if (!branchId) {
    const defaultBranch = await prisma.branch.findFirst({
      where: { orgId, isDefault: true, active: true },
      select: { id: true },
    });
    branchId = defaultBranch?.id;
  }
  if (!branchId) {
    throw forbiddenError("This desk account is not assigned to a branch.");
  }
  if (requestedBranchId && requestedBranchId !== branchId) {
    throw forbiddenError("This desk account can only open its assigned branch.");
  }
  await resolveOrgBranch(orgId, branchId);
  return branchId;
}

export function queryBranchId(request: NextRequest) {
  const value = request.nextUrl.searchParams.get("branchId")?.trim();
  return value || undefined;
}

export function isAllBranchesRequest(branchId?: string | null) {
  return branchId === "all";
}

export async function enrichAttendanceRecords<
  T extends { id: string; branchId: string; userId: string; subscriptionId?: string | null },
>(records: T[]) {
  if (!records.length) {
    return [];
  }

  const branchIds = [...new Set(records.map((record) => record.branchId))];
  const userIds = [...new Set(records.map((record) => record.userId))];
  const subscriptionIds = [
    ...new Set(
      records
        .map((record) => record.subscriptionId)
        .filter((subscriptionId): subscriptionId is string => Boolean(subscriptionId)),
    ),
  ];

  const [branches, users, subscriptions] = await Promise.all([
    prisma.branch.findMany({
      where: { id: { in: branchIds } },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, phone: true },
    }),
    subscriptionIds.length
      ? prisma.memberSubscription.findMany({
          where: { id: { in: subscriptionIds } },
          select: { id: true, planId: true, endsAt: true, remainingVisits: true },
        })
      : Promise.resolve([]),
  ]);

  const planIds = [...new Set(subscriptions.map((subscription) => subscription.planId))];
  const plans = planIds.length
    ? await prisma.membershipPlan.findMany({
        where: { id: { in: planIds } },
        select: { id: true, name: true },
      })
    : [];

  const branchNamesById = new Map(branches.map((branch) => [branch.id, branch.name]));
  const usersById = new Map(users.map((user) => [user.id, user]));
  const subscriptionsById = new Map(
    subscriptions.map((subscription) => [subscription.id, subscription]),
  );
  const planNamesById = new Map(plans.map((plan) => [plan.id, plan.name]));

  return records.map((record) => {
    const user = usersById.get(record.userId);
    const subscription = record.subscriptionId
      ? subscriptionsById.get(record.subscriptionId)
      : undefined;
    const planName = subscription ? (planNamesById.get(subscription.planId) ?? null) : null;

    return {
      ...attendanceWithEntryCode(record),
      branchName: branchNamesById.get(record.branchId) ?? null,
      planName,
      user: user
        ? {
            id: user.id,
            name: user.name,
            email: publicUserEmail(user.email) ?? "",
            phone: user.phone,
          }
        : null,
      plan: planName ? { name: planName } : null,
      subscription: subscription
        ? {
            endsAt: subscription.endsAt,
            remainingVisits: subscription.remainingVisits,
          }
        : null,
    };
  });
}

export async function findFileAssetOrThrow(fileId: string) {
  const asset = await prisma.fileAsset.findUnique({ where: { id: fileId } });
  if (!asset || asset.deletedAt) {
    throw notFoundError("File not found");
  }
  return asset;
}

export async function getOrganizationScopedFileAsset(
  fileAssetId: string | undefined,
  orgId: string,
  allowedCategories: StorageFileCategory[],
) {
  if (!fileAssetId) {
    return null;
  }
  const asset = await findFileAssetOrThrow(fileAssetId);
  assertFileAssetBelongsToOrg({ asset, orgId, allowedCategories });
  return asset;
}

export async function getUserScopedFileAsset(input: {
  fileAssetId?: string;
  userId: string;
  allowedCategories: StorageFileCategory[];
  orgId?: string;
}) {
  if (!input.fileAssetId) {
    return null;
  }
  const asset = await findFileAssetOrThrow(input.fileAssetId);
  assertFileAssetOwnedByUser({
    asset,
    userId: input.userId,
    allowedCategories: input.allowedCategories,
    ...(input.orgId ? { orgId: input.orgId } : {}),
  });
  return asset;
}

export async function resolveFileUrl(
  asset: { storageKey: string; visibility: string | null; storageProvider?: string | null },
  signed = false,
) {
  const storageProvider = getStorageProviderOrThrow();
  assertFileStorageProviderMatches(asset, storageProvider.getDiagnostics().provider);
  if (!signed && asset.visibility === "public") {
    return storageProvider.getPublicUrl({ key: asset.storageKey });
  }
  return storageProvider.getSignedUrl({ key: asset.storageKey, expiresInSeconds: 5 * 60 });
}

function assertFileStorageProviderMatches(
  asset: { storageProvider?: string | null },
  activeProvider: string,
) {
  const storedProvider = asset.storageProvider ?? "local";
  if (storedProvider !== activeProvider) {
    throw validationError(
      `File was stored with ${storedProvider}, but the active storage provider is ${activeProvider}.`,
    );
  }
}

function startOfMonth(date = new Date()) {
  const value = new Date(date);
  value.setDate(1);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function pathMatches(path: string[], pattern: Array<string | RegExp>) {
  if (path.length !== pattern.length) {
    return false;
  }
  return pattern.every((part, index) =>
    typeof part === "string" ? part === path[index] : part.test(path[index] ?? ""),
  );
}

export function parseCursorPagination(request: NextRequest, defaultLimit: number, maxLimit: number) {
  const rawLimit = Number(request.nextUrl.searchParams.get("limit") ?? defaultLimit);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.floor(rawLimit), 1), maxLimit)
    : defaultLimit;
  const cursor = request.nextUrl.searchParams.get("cursor")?.trim() || undefined;
  return { limit, cursor };
}

export function pageResult<T extends { id: string }>(items: T[], limit: number) {
  const hasMore = items.length > limit;
  const pageItems = hasMore ? items.slice(0, limit) : items;
  return {
    items: pageItems,
    nextCursor: hasMore ? (pageItems.at(-1)?.id ?? null) : null,
  };
}

export const ADMIN_DETAIL_LIST_LIMIT = 50;
export const ANALYTICS_SUMMARY_LIST_LIMIT = 500;
export const USER_HISTORY_LIST_LIMIT = 50;

export async function listOrganizationPaymentsPage(orgId: string, request: NextRequest) {
  const { limit, cursor } = parseCursorPagination(request, 50, 100);
  const ctx = await getRequestContext(request, { orgId });
  const branchId = await assertBranchAccessForContext(ctx, orgId, queryBranchId(request));
  return getOrganizationPaymentsPage({ orgId, branchId, cursor: cursor ?? undefined, limit });
}

export async function listOrganizationAttendancePage(orgId: string, request: NextRequest) {
  const { limit, cursor } = parseCursorPagination(request, 50, 100);
  const ctx = await getRequestContext(request, { orgId });
  const branchId = await assertBranchAccessForContext(ctx, orgId, queryBranchId(request));
  const records = await prisma.attendanceRecord.findMany({
    where: { orgId, ...(branchId ? { branchId } : {}) },
    orderBy: { checkedInAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const page = pageResult(records, limit);
  return {
    attendance: await enrichAttendanceRecords(page.items),
    nextCursor: page.nextCursor,
    limit,
  };
}

export async function listPlanAssignmentsForUser(userId: string, assignmentId?: string) {
  const assignments = await prisma.planAssignment.findMany({
    where: clean({
      assignedToUserId: userId,
      active: true,
      ...(assignmentId ? { id: assignmentId } : {}),
    }),
    orderBy: { createdAt: "desc" },
  });
  const [plans, progress] = await Promise.all([
    prisma.planContent.findMany({
      where: { id: { in: assignments.map((assignment) => assignment.planId) } },
    }),
    prisma.planProgress.findMany({
      where: { assignmentId: { in: assignments.map((assignment) => assignment.id) }, userId },
    }),
  ]);

  return assignments.map((assignment) => ({
    ...assignment,
    plan: plans.find((plan) => plan.id === assignment.planId) ?? null,
    progress: progress.find((entry) => entry.assignmentId === assignment.id) ?? null,
  }));
}

async function getUserByEmailOrCreate(email: string) {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: email.split("@")[0] ?? "Zook User",
      slug: await createUniqueMemberSlug(),
    },
  });
}

function buildPhonePlaceholderEmail(phone: string) {
  return `phone-${createHash("sha256").update(phone).digest("hex").slice(0, 20)}@phone.zook.local`;
}

function nameFromPhone(phone: string) {
  return `Member ${phone.slice(-4)}`;
}

export function isDateUnder18(date: Date) {
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDelta = today.getMonth() - date.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < date.getDate())) {
    age -= 1;
  }
  return age < 18;
}

export function serializeUserForClient<
  T extends { id: string; email: string; phone?: string | null },
>(
  user: T,
) {
  const userWithSlug = user as T & { slug?: string | null };
  return {
    ...user,
    email: publicUserEmail(user.email) ?? "",
    slug: userWithSlug.slug ?? undefined,
    privateHandle: privateUserHandle(user.id),
  };
}

async function findSingleUserByPhone(phone: string) {
  const matches = await prisma.user.findMany({
    where: { phone },
    orderBy: { createdAt: "asc" },
    take: 2,
  });
  if (matches.length > 1) {
    throw conflictError(
      "This phone number is linked to multiple accounts. Please sign in with email or contact support.",
    );
  }
  return matches[0] ?? null;
}

async function getUserByPhoneOrCreate(phone: string) {
  const existing = await findSingleUserByPhone(phone);
  if (existing) {
    if (!existing.phoneVerifiedAt && !isInternalPhoneEmail(existing.email)) {
      throw validationError(
        "This phone number is not verified yet. Sign in with email and verify it in Settings.",
      );
    }
    return existing;
  }
  return prisma.user.create({
    data: {
      email: buildPhonePlaceholderEmail(phone),
      name: nameFromPhone(phone),
      slug: await createUniqueMemberSlug(),
      phone,
    },
  });
}

export async function getUserByIdentifierOrCreate(identifier: {
  kind: "email" | "phone";
  value: string;
}) {
  return identifier.kind === "email"
    ? getUserByEmailOrCreate(identifier.value)
    : getUserByPhoneOrCreate(identifier.value);
}

function parseCsvEnv(...names: string[]) {
  return names
    .flatMap((name) => (process.env[name] ?? "").split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

export function getGoogleAuthAudiences() {
  return Array.from(
    new Set(
      parseCsvEnv(
        "GOOGLE_OAUTH_CLIENT_ID",
        "GOOGLE_WEB_CLIENT_ID",
        "NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID",
        "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID",
        "GOOGLE_IOS_CLIENT_ID",
        "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID",
        "GOOGLE_ANDROID_CLIENT_ID",
        "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID",
      ),
    ),
  );
}

export function getAppleAuthAudiences() {
  return Array.from(
    new Set([
      ...parseCsvEnv(
        "APPLE_CLIENT_ID",
        "APPLE_SERVICE_ID",
        "NEXT_PUBLIC_APPLE_CLIENT_ID",
        "EXPO_PUBLIC_APPLE_CLIENT_ID",
        "APPLE_BUNDLE_ID",
        "IOS_BUNDLE_ID",
      ),
      "com.zook.app",
    ]),
  );
}

function decodeBase64UrlJson(value: string) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Record<string, unknown>;
}

export async function verifyRemoteJwt(input: {
  token: string;
  jwksUrl: string;
  issuers: string[];
  audiences: string[];
}) {
  if (!input.audiences.length) {
    throw serviceUnavailableError("Sign-in provider is not configured.");
  }
  const parts = input.token.split(".");
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    throw unauthorizedError("Invalid sign-in token.");
  }
  const header = decodeBase64UrlJson(parts[0]);
  const payload = decodeBase64UrlJson(parts[1]);
  if ((header.alg !== "RS256" && header.alg !== "ES256") || typeof header.kid !== "string") {
    throw unauthorizedError("Invalid sign-in token.");
  }
  const response = await fetch(input.jwksUrl, { cache: "force-cache" });
  if (!response.ok) {
    throw serviceUnavailableError("Sign-in provider is temporarily unavailable.");
  }
  const jwks = (await response.json()) as { keys?: Array<Record<string, unknown>> };
  const jwk = jwks.keys?.find((key) => key.kid === header.kid);
  if (!jwk) {
    throw unauthorizedError("Invalid sign-in token.");
  }
  const verifier = createVerify(header.alg === "RS256" ? "RSA-SHA256" : "SHA256");
  verifier.update(`${parts[0]}.${parts[1]}`);
  verifier.end();
  const signatureValid = verifier.verify(
    createPublicKey({ key: jwk as any, format: "jwk" }),
    Buffer.from(parts[2], "base64url"),
  );
  if (!signatureValid) {
    throw unauthorizedError("Invalid sign-in token.");
  }
  const issuer = typeof payload.iss === "string" ? payload.iss : "";
  if (!input.issuers.includes(issuer)) {
    throw unauthorizedError("Invalid sign-in issuer.");
  }
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.some((value) => typeof value === "string" && input.audiences.includes(value))) {
    throw unauthorizedError("Invalid sign-in audience.");
  }
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp <= nowSeconds) {
    throw unauthorizedError("Sign-in token expired.");
  }
  if (typeof payload.sub !== "string" || !payload.sub) {
    throw unauthorizedError("Sign-in token is missing an account id.");
  }
  return payload;
}

export function providerEmailVerified(payload: Record<string, unknown>) {
  return payload.email_verified === true || payload.email_verified === "true";
}

export function displayNameFromProvider(input: {
  explicitName?: string;
  name?: unknown;
  email?: string | null;
  fallback: string;
}) {
  const explicit = input.explicitName?.trim();
  if (explicit) {
    return explicit;
  }
  if (typeof input.name === "string" && input.name.trim()) {
    return input.name.trim().slice(0, 160);
  }
  if (input.email) {
    return input.email.split("@")[0] || input.fallback;
  }
  return input.fallback;
}

export async function getUserBySsoIdentityOrCreate(input: {
  provider: "APPLE" | "GOOGLE";
  providerUserId: string;
  email?: string | null;
  emailVerified: boolean;
  name: string;
}) {
  const identity = await prisma.authIdentity.findUnique({
    where: {
      provider_providerUserId: {
        provider: input.provider,
        providerUserId: input.providerUserId,
      },
    },
  });
  if (identity) {
    return prisma.user.findUniqueOrThrow({ where: { id: identity.userId } });
  }
  if (!input.email || !input.emailVerified) {
    throw validationError("This sign-in provider did not share a verified email address.");
  }
  const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
  const user =
    existingUser ??
    (await prisma.user.create({
      data: {
        email: input.email,
        emailVerifiedAt: new Date(),
        name: input.name,
        slug: await createUniqueMemberSlug(),
      },
    }));
  if (!user.emailVerifiedAt) {
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    });
  }
  await prisma.authIdentity.create({
    data: {
      userId: user.id,
      provider: input.provider,
      providerUserId: input.providerUserId,
      email: input.email,
      emailVerified: input.emailVerified,
    },
  });
  return user;
}

export async function createAuthSessionResponse(
  request: NextRequest,
  user: Awaited<ReturnType<typeof getUserByEmailOrCreate>>,
) {
  const token = AuthService.createToken();
  const refreshToken = AuthService.createToken();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get("user-agent") ?? undefined;
  await new PrismaAuthRepo().createSession({
    userId: user.id,
    tokenHash: AuthService.hash(token),
    refreshTokenHash: AuthService.hash(refreshToken),
    expiresAt,
    refreshExpiresAt,
    deviceFingerprintHash: AuthService.createDeviceFingerprint(clean({ userAgent, ipAddress })),
    ...(userAgent ? { userAgent } : {}),
    ipAddress,
  });
  const sessionSummary = await resolveSessionSummaryFromToken(token);
  const response = ok({
    user: serializeUserForClient(user),
    token,
    refreshToken,
    expiresAt,
    refreshExpiresAt,
    ...(sessionSummary ? { session: sessionSummary } : {}),
  });
  response.cookies.set(sessionCookieName, token, {
    ...sharedSessionCookieOptions(request, expiresAt),
  });
  response.cookies.set(refreshSessionCookieName, refreshToken, {
    ...sharedSessionCookieOptions(request, refreshExpiresAt),
  });
  return response;
}

export async function refreshAuthSession(refreshToken: string) {
  if (!refreshToken) {
    throw unauthorizedError("Refresh token required");
  }
  const now = new Date();
  const currentSession = await prisma.userSession.findFirst({
    where: {
      refreshTokenHash: AuthService.hash(refreshToken),
      revokedAt: null,
      refreshExpiresAt: { gt: now },
    },
  });
  if (!currentSession) {
    throw unauthorizedError("Refresh token expired");
  }
  const token = AuthService.createToken();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await prisma.userSession.update({
    where: { id: currentSession.id },
    data: { tokenHash: AuthService.hash(token), expiresAt, lastSeenAt: now },
  });
  const sessionSummary = await resolveSessionSummaryFromToken(token);
  return {
    token,
    refreshToken,
    expiresAt,
    refreshExpiresAt: currentSession.refreshExpiresAt,
    ...(sessionSummary ? { session: sessionSummary } : {}),
  };
}

export function setSessionCookie(
  response: NextResponse,
  request: NextRequest,
  token: string,
  expiresAt: Date,
) {
  response.cookies.set(sessionCookieName, token, {
    ...sharedSessionCookieOptions(request, expiresAt),
  });
}

function localQaIdentitiesAllowed() {
  return (
    process.env.APP_ENV === "local" ||
    process.env.ENV_PROFILE === "local" ||
    process.env.NODE_ENV !== "production"
  );
}

export function assertLocalQaIdentityAllowed() {
  if (!localQaIdentitiesAllowed()) {
    throw validationError("Fresh QA identities are only available in local development.");
  }
}

export function localSeededSimulatorAuthBypass(
  request: NextRequest,
  identifier: { kind: "email" | "phone"; value: string },
) {
  return (
    localQaIdentitiesAllowed() &&
    request.headers.get("x-zook-qa-auth") === "simulator" &&
    isSeededDemoIdentifier(identifier)
  );
}

async function createFreshQaUser(identifier: { kind: "email" | "phone"; value: string }) {
  assertLocalQaIdentityAllowed();
  const nonce = `${Date.now().toString(36)}${randomBytes(4).toString("hex")}`;
  return prisma.user.create({
    data: {
      email:
        identifier.kind === "email"
          ? `fresh+${nonce}@zook.local`
          : `fresh-phone+${nonce}@zook.local`,
      name: "Fresh QA User",
      slug: await createUniqueMemberSlug(),
      ...(identifier.kind === "phone"
        ? { phone: identifier.value, phoneVerifiedAt: new Date() }
        : {}),
      ...(identifier.kind === "email" ? { emailVerifiedAt: new Date() } : {}),
      marketingOptIn: false,
      aiConsent: false,
    },
  });
}

export async function getDemoQaUserOrCreate() {
  const existing = await prisma.user.findUnique({ where: { email: QA_DEMO_ACCOUNT_EMAIL } });
  const data = {
    phone: QA_DEMO_ACCOUNT_PHONE,
    emailVerifiedAt: new Date(),
    phoneVerifiedAt: new Date(),
  };
  if (existing) {
    return prisma.user.update({ where: { id: existing.id }, data });
  }
  return prisma.user.create({
    data: {
      email: QA_DEMO_ACCOUNT_EMAIL,
      name: "Nisha Member",
      slug: await createUniqueMemberSlug(),
      ...data,
    },
  });
}

async function getSeededDemoUserOrThrow(identifier: { kind: "email" | "phone"; value: string }) {
  const user =
    identifier.kind === "email"
      ? await prisma.user.findUnique({ where: { email: identifier.value.toLowerCase() } })
      : await prisma.user.findFirst({ where: { phone: identifier.value } });
  if (!user) {
    throw validationError("Demo account is not seeded yet.");
  }
  return user;
}

export async function createSeededDemoOtpChallenge(input: {
  identifier: { kind: "email" | "phone"; value: string };
  ipAddress?: string;
}) {
  const user = await getSeededDemoUserOrThrow(input.identifier);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);
  const row = await prisma.otpChallenge.create({
    data: {
      email: user.email,
      identifier: input.identifier.value,
      channel: input.identifier.kind,
      ...(input.identifier.kind === "phone" ? { phone: input.identifier.value } : {}),
      purpose: "login",
      codeHash: AuthService.hash(QA_TEST_OTP),
      maxAttempts: 5,
      expiresAt,
      createdAt: now,
      ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
    },
  });
  return {
    id: row.id,
    expiresAt: row.expiresAt,
  };
}

export async function getAuthUserForVerifiedIdentifier(identifier: {
  kind: "email" | "phone";
  value: string;
}) {
  if (isSeededDemoIdentifier(identifier)) {
    return getSeededDemoUserOrThrow(identifier);
  }
  if (isQaFreshIdentifier(identifier)) {
    return createFreshQaUser(identifier);
  }
  if (isQaDemoIdentifier(identifier)) {
    return getDemoQaUserOrCreate();
  }
  return getUserByIdentifierOrCreate(identifier);
}

export async function markUserIdentifierVerified(
  userId: string,
  identifier: { kind: "email" | "phone"; value: string },
) {
  if (identifier.kind === "email") {
    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerifiedAt: new Date(),
      },
    });
    return;
  }
  await prisma.user.update({
    where: { id: userId },
    data: {
      phone: identifier.value,
      phoneVerifiedAt: new Date(),
    },
  });
}

export function contactOtpPurpose(userId: string, kind: "email" | "phone") {
  return `contact_update:${userId}:${kind}`;
}

export async function assertContactIdentifierAvailable(
  userId: string,
  identifier: { kind: "email" | "phone"; value: string },
) {
  if (identifier.kind === "email") {
    const duplicate = await prisma.user.findUnique({ where: { email: identifier.value } });
    if (duplicate && duplicate.id !== userId) {
      throw conflictError("This email is already linked to another Zook account.");
    }
    return;
  }
  const duplicate = await prisma.user.findFirst({
    where: { phone: identifier.value, NOT: { id: userId } },
  });
  if (duplicate) {
    throw conflictError("This phone number is already linked to another Zook account.");
  }
}

export async function ensureOrganizationMembershipWithClient(
  client: MembershipEnsureClient,
  input: {
    orgId: string;
    userId: string;
    joinedAt?: Date;
    profilePhotoUrl?: string | null;
    marketingOptIn?: boolean;
    skipSaasMemberLimit?: boolean;
  },
) {
  await client.organizationUser.upsert({
    where: { orgId_userId: { orgId: input.orgId, userId: input.userId } },
    update: { status: "active", leftAt: null },
    create: {
      orgId: input.orgId,
      userId: input.userId,
      joinedAt: input.joinedAt ?? new Date(),
      status: "active",
    },
  });
  await assertSingleRoleForOrgUser(client, {
    orgId: input.orgId,
    userId: input.userId,
    nextRole: "MEMBER",
  });
  await client.organizationRoleAssignment.upsert({
    where: {
      orgId_userId_role: {
        orgId: input.orgId,
        userId: input.userId,
        role: "MEMBER",
      },
    },
    update: {},
    create: { orgId: input.orgId, userId: input.userId, role: "MEMBER" },
  });
  await client.memberProfile.upsert({
    where: { orgId_userId: { orgId: input.orgId, userId: input.userId } },
    update: clean({
      profilePhotoUrl: input.profilePhotoUrl ?? undefined,
      marketingOptIn: input.marketingOptIn,
    }),
    create: clean({
      orgId: input.orgId,
      userId: input.userId,
      profilePhotoUrl: input.profilePhotoUrl ?? undefined,
      marketingOptIn: input.marketingOptIn,
    }),
  });
}

export async function ensureOrganizationMembership(input: {
  orgId: string;
  userId: string;
  joinedAt?: Date;
  profilePhotoUrl?: string | null;
  marketingOptIn?: boolean;
  skipSaasMemberLimit?: boolean;
}) {
  if (!input.skipSaasMemberLimit) {
    await assertSaasMemberCapacity(input.orgId, input.userId);
  }
  await ensureOrganizationMembershipWithClient(prisma, input);
}

export async function createDirectNotification(input: {
  orgId?: string;
  createdById?: string;
  type: "TRANSACTIONAL" | "OPERATIONAL" | "PROMOTIONAL" | "ENGAGEMENT" | "PLAN" | "SECURITY";
  title: string;
  body: string;
  audience: string;
  metadata?: Prisma.InputJsonValue;
  userIds: string[];
  pushEnabled?: boolean;
}) {
  const notification = await prisma.notification.create({
    data: clean({
      orgId: input.orgId,
      createdById: input.createdById,
      type: input.type,
      title: input.title,
      body: input.body,
      audience: input.audience,
      pushEnabled:
        input.pushEnabled ?? (input.type === "TRANSACTIONAL" || input.type === "SECURITY"),
      metadata: input.metadata,
      status: "SENT",
      sentAt: new Date(),
    }),
  });
  if (input.userIds.length) {
    await prisma.notificationRecipient.createMany({
      data: input.userIds.map((userId) => ({
        notificationId: notification.id,
        userId,
        deliveryStatus: "in_app",
        deliveredAt: new Date(),
      })),
      skipDuplicates: true,
    });
  }
  await deliverPushForNotification({
    ...(input.orgId ? { orgId: input.orgId } : {}),
    notification: {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      pushEnabled: notification.pushEnabled,
      metadata: notification.metadata,
    },
    userIds: input.userIds,
  });
  return notification;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolvePlatformBroadcastRecipients(input: {
  targetOrgIds: string[];
  targetRoles: OrgRole[];
}) {
  const orgs = await prisma.organization.findMany({
    where: {
      ...(input.targetOrgIds.length ? { id: { in: input.targetOrgIds } } : {}),
      status: { notIn: ["SUSPENDED", "DELETED"] },
    },
    select: { id: true },
    take: 500,
  });
  const orgIds = orgs.map((org) => org.id);
  if (!orgIds.length) {
    return new Map<string, string[]>();
  }

  const memberships = await prisma.organizationUser.findMany({
    where: { orgId: { in: orgIds }, status: "active" },
    select: { orgId: true, userId: true },
  });
  if (!input.targetRoles.length) {
    const byOrg = new Map<string, Set<string>>();
    for (const membership of memberships) {
      const users = byOrg.get(membership.orgId) ?? new Set<string>();
      users.add(membership.userId);
      byOrg.set(membership.orgId, users);
    }
    return new Map(Array.from(byOrg, ([orgId, users]) => [orgId, Array.from(users)]));
  }

  const roleAssignments = await prisma.organizationRoleAssignment.findMany({
    where: { orgId: { in: orgIds }, role: { in: input.targetRoles } },
    select: { orgId: true, userId: true },
  });
  const activeByOrg = new Map<string, Set<string>>();
  for (const membership of memberships) {
    const users = activeByOrg.get(membership.orgId) ?? new Set<string>();
    users.add(membership.userId);
    activeByOrg.set(membership.orgId, users);
  }

  const byOrg = new Map<string, Set<string>>();
  for (const assignment of roleAssignments) {
    if (!activeByOrg.get(assignment.orgId)?.has(assignment.userId)) {
      continue;
    }
    const users = byOrg.get(assignment.orgId) ?? new Set<string>();
    users.add(assignment.userId);
    byOrg.set(assignment.orgId, users);
  }
  return new Map(Array.from(byOrg, ([orgId, users]) => [orgId, Array.from(users)]));
}

export async function fanOutPlatformBroadcast(input: {
  broadcast: {
    id: string;
    title: string;
    body: string;
    severity: string;
    targetOrgIds: string[];
    targetRoles: OrgRole[];
    createdByUserId: string;
  };
}) {
  const recipientsByOrg = await resolvePlatformBroadcastRecipients({
    targetOrgIds: input.broadcast.targetOrgIds,
    targetRoles: input.broadcast.targetRoles,
  });
  let notifications = 0;
  let recipients = 0;
  let chunksSent = 0;
  for (const [orgId, userIds] of recipientsByOrg) {
    for (const chunk of chunkArray(userIds, 500)) {
      if (chunksSent > 0) {
        await sleep(60_000);
      }
      const notification = await createDirectNotification({
        orgId,
        createdById: input.broadcast.createdByUserId,
        type: "OPERATIONAL",
        title: input.broadcast.title,
        body: input.broadcast.body,
        audience: "platform_broadcast",
        pushEnabled: true,
        metadata: {
          platformBroadcastId: input.broadcast.id,
          severity: input.broadcast.severity,
          throttle: "max_500_push_devices_per_minute",
        } as Prisma.InputJsonValue,
        userIds: chunk,
      });
      notifications += notification ? 1 : 0;
      recipients += chunk.length;
      chunksSent++;
    }
  }
  return { notifications, recipients, chunks: chunksSent, throttleMsBetweenChunks: 60_000 };
}

export async function processVerifiedPaymentWebhookEvent(input: {
  event: {
    id: string;
    status: string;
    processedAt: Date | null;
  };
  attempt: {
    attemptNo: number;
  };
  parsed: ParsedPaymentWebhookEvent | null;
  providerEventId: string;
  startedAt: number;
}) {
  const { event, attempt, parsed, providerEventId, startedAt } = input;
  if (event.processedAt && event.status !== "QUARANTINED") {
    await prisma.paymentWebhookAttempt.update({
      where: {
        paymentEventId_attemptNo: { paymentEventId: event.id, attemptNo: attempt.attemptNo },
      },
      data: {
        status: "SUCCEEDED",
        httpStatusCode: 200,
        durationMs: Date.now() - startedAt,
        completedAt: new Date(),
        result: { duplicate: true } as Prisma.InputJsonValue,
      },
    });
    return ok({ received: true, duplicate: true, providerEventId });
  }

  if (parsed?.eventType === "refund.created" || parsed?.eventType === "refund.processed") {
    const rawPayload = jsonObject(parsed.rawPayload as Prisma.JsonValue);
    const payload = jsonObject(rawPayload.payload as Prisma.JsonValue);
    const refundPayload = jsonObject(payload.refund as Prisma.JsonValue);
    const refundEntity = jsonObject(refundPayload.entity as Prisma.JsonValue);
    const providerRefundId =
      typeof refundEntity.id === "string" ? refundEntity.id : undefined;
    const payment = parsed.providerPaymentId
      ? await prisma.payment.findFirst({
          where: { provider: parsed.provider, providerRef: parsed.providerPaymentId },
          orderBy: { createdAt: "desc" },
        })
      : null;
    if (!payment?.orgId) {
      await prisma.paymentEvent.update({
        where: { id: event.id },
        data: {
          status: "QUARANTINED",
          processedAt: new Date(),
          processingError: "Refund payment not found for provider event.",
        },
      });
      await prisma.paymentWebhookAttempt.update({
        where: {
          paymentEventId_attemptNo: { paymentEventId: event.id, attemptNo: attempt.attemptNo },
        },
        data: {
          status: "SUCCEEDED",
          httpStatusCode: 200,
          durationMs: Date.now() - startedAt,
          completedAt: new Date(),
          result: { quarantined: true, reason: "refund_payment_not_found" } as Prisma.InputJsonValue,
        },
      });
      return ok({ received: true, quarantined: true, providerEventId });
    }

    const refund = providerRefundId
      ? await prisma.paymentRefund.findFirst({
          where: { paymentId: payment.id, providerRefundId },
          orderBy: { createdAt: "desc" },
        })
      : await prisma.paymentRefund.findFirst({
          where: {
            paymentId: payment.id,
            status: { in: ["REQUESTED", "PENDING"] },
            ...(parsed.amountPaise ? { amountPaise: parsed.amountPaise } : {}),
          },
          orderBy: { createdAt: "desc" },
        });
    const effectiveRefund =
      refund ??
      (await prisma.paymentRefund.create({
        data: {
          orgId: payment.orgId,
          branchId: payment.branchId,
          paymentId: payment.id,
          provider: parsed.provider,
          providerRefundId: providerRefundId ?? null,
          amountPaise: parsed.amountPaise ?? payment.amountPaise,
          currency: parsed.currency ?? payment.currency,
          status: "REQUESTED",
          reason: "Provider refund webhook",
        },
      }));
    const nextRefundStatus =
      parsed.eventType === "refund.processed" ? parsed.paymentStatus : "PENDING";
    const processedAt = parsed.eventType === "refund.processed" ? new Date() : effectiveRefund.processedAt;
    const updatedRefund = await prisma.paymentRefund.update({
      where: { id: effectiveRefund.id },
      data: clean({
        status: nextRefundStatus,
        providerRefundId: providerRefundId ?? effectiveRefund.providerRefundId ?? undefined,
        processedAt: processedAt ?? undefined,
        providerResponse: parsed.rawPayload as Prisma.InputJsonValue,
      }),
    });
    if (parsed.eventType !== "refund.processed") {
      await prisma.paymentEvent.update({
        where: { id: event.id },
        data: {
          orgId: payment.orgId,
          userId: payment.userId,
          paymentId: payment.id,
          status: "PROCESSED",
          processedAt: new Date(),
          processingError: null,
        },
      });
      await prisma.paymentWebhookAttempt.update({
        where: {
          paymentEventId_attemptNo: { paymentEventId: event.id, attemptNo: attempt.attemptNo },
        },
        data: {
          status: "SUCCEEDED",
          httpStatusCode: 200,
          durationMs: Date.now() - startedAt,
          completedAt: new Date(),
          result: {
            refundId: updatedRefund.id,
            paymentId: payment.id,
            refundStatus: updatedRefund.status,
          } as Prisma.InputJsonValue,
        },
      });
      return ok({
        received: true,
        providerEventId,
        paymentId: payment.id,
        refundId: updatedRefund.id,
      });
    }
    const successfulRefunds = await prisma.paymentRefund.findMany({
      where: {
        paymentId: payment.id,
        status: { notIn: ["FAILED", "CANCELLED", "REQUESTED", "PENDING"] },
      },
    });
    const refundedAmountPaise = successfulRefunds.reduce(
      (total, item) => total + item.amountPaise,
      0,
    );
    const paymentStatus =
      refundedAmountPaise >= payment.amountPaise ? "REFUNDED" : "PARTIALLY_REFUNDED";
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: paymentStatus,
        metadata: {
          ...jsonObject(payment.metadata),
          refundedAmountPaise,
          refund: {
            refundId: updatedRefund.id,
            status: updatedRefund.status,
            providerRefundId: updatedRefund.providerRefundId,
            amountPaise: updatedRefund.amountPaise,
            refundedAt: (updatedRefund.processedAt ?? new Date()).toISOString(),
          },
        },
      },
    });
    await prisma.paymentEvent.update({
      where: { id: event.id },
      data: {
        orgId: payment.orgId,
        userId: payment.userId,
        paymentId: payment.id,
        status: "PROCESSED",
        processedAt: new Date(),
        processingError: null,
      },
    });
    await prisma.paymentWebhookAttempt.update({
      where: {
        paymentEventId_attemptNo: { paymentEventId: event.id, attemptNo: attempt.attemptNo },
      },
      data: {
        status: "SUCCEEDED",
        httpStatusCode: 200,
        durationMs: Date.now() - startedAt,
        completedAt: new Date(),
        result: {
          refundId: updatedRefund.id,
          paymentId: payment.id,
          paymentStatus,
        } as Prisma.InputJsonValue,
      },
    });
    if (payment.userId && parsed.eventType === "refund.processed") {
      await createDirectNotification({
        orgId: payment.orgId,
        type: "TRANSACTIONAL",
        title: "Refund processed",
        body: `Rs. ${(updatedRefund.amountPaise / 100).toFixed(2)} has been refunded for your payment.`,
        audience: "single_member",
        userIds: [payment.userId],
        pushEnabled: true,
        metadata: { paymentId: payment.id, refundId: updatedRefund.id } as Prisma.InputJsonValue,
      });
    }
    return ok({ received: true, providerEventId, paymentId: payment.id, refundId: updatedRefund.id });
  }

  const saasBillingProcessed = parsed ? await applySaasBillingProviderEvent({ event: parsed }) : null;
  if (saasBillingProcessed) {
    const shouldRecordSaasPayment =
      parsed?.eventType === "invoice.paid" || parsed?.eventType === "subscription.charged";
    if (shouldRecordSaasPayment && saasBillingProcessed.mandate.paymentSessionId) {
      await prisma.paymentSession.updateMany({
        where: {
          id: saasBillingProcessed.mandate.paymentSessionId,
          purpose: "SAAS_BILLING",
          expiresAt: { lt: new Date() },
        },
        data: { expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
      });
    }
    const processedPayment =
      shouldRecordSaasPayment && saasBillingProcessed.mandate.paymentSessionId
        ? await applyPaymentSessionStatus({
            sessionId: saasBillingProcessed.mandate.paymentSessionId,
            nextStatus: "SUCCEEDED",
            provider: parsed.provider,
            ...(parsed.providerPaymentId || parsed.providerSubscriptionId
              ? { providerRef: parsed.providerPaymentId ?? parsed.providerSubscriptionId }
              : {}),
            paymentMode: "CARD",
            expectedAmountPaise: saasBillingProcessed.mandate.amountPaise,
            createNotification: createDirectNotification,
            ensureMembership: (membershipInput, tx) =>
              tx
                ? ensureOrganizationMembershipWithClient(tx, membershipInput)
                : ensureOrganizationMembership(membershipInput),
          })
        : null;
    await prisma.paymentEvent.update({
      where: { id: event.id },
      data: clean({
        orgId: saasBillingProcessed.mandate.orgId,
        sessionId: saasBillingProcessed.mandate.paymentSessionId,
        paymentId: processedPayment?.payment?.id,
        status: "PROCESSED",
        processedAt: new Date(),
        processingError: null,
      }),
    });
    await prisma.paymentWebhookAttempt.update({
      where: {
        paymentEventId_attemptNo: { paymentEventId: event.id, attemptNo: attempt.attemptNo },
      },
      data: {
        status: "SUCCEEDED",
        httpStatusCode: 200,
        durationMs: Date.now() - startedAt,
        completedAt: new Date(),
        result: clean({
          saasBillingMandateId: saasBillingProcessed.mandate.id,
          mandateStatus: saasBillingProcessed.mandate.status,
          subscriptionStatus: saasBillingProcessed.subscription.status,
          paymentId: processedPayment?.payment?.id,
        }) as Prisma.InputJsonValue,
      },
    });
    return ok({
      received: true,
      providerEventId,
      saasBillingMandateId: saasBillingProcessed.mandate.id,
      status: saasBillingProcessed.mandate.status,
    });
  }

  let autopayProcessed;
  try {
    autopayProcessed = parsed
      ? await applyAutopayProviderEvent({
          event: parsed,
          createNotification: createDirectNotification,
          ensureMembership: (membershipInput, tx) =>
            tx
              ? ensureOrganizationMembershipWithClient(tx, membershipInput)
              : ensureOrganizationMembership(membershipInput),
        })
      : null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Autopay event application failed.";
    await prisma.paymentEvent.update({
      where: { id: event.id },
      data: {
        status: "QUARANTINED",
        processedAt: new Date(),
        processingError: errorMessage,
      },
    });
    await prisma.paymentWebhookAttempt.update({
      where: {
        paymentEventId_attemptNo: { paymentEventId: event.id, attemptNo: attempt.attemptNo },
      },
      data: {
        status: "FAILED",
        httpStatusCode: 200,
        durationMs: Date.now() - startedAt,
        completedAt: new Date(),
        errorCode: "autopay_application_failed",
        errorMessage,
        result: {
          quarantined: true,
          reason: "autopay_application_failed",
        } as Prisma.InputJsonValue,
      },
    });
    return ok({ received: true, quarantined: true, providerEventId });
  }

  if (autopayProcessed) {
    await prisma.paymentEvent.update({
      where: { id: event.id },
      data: clean({
        orgId: autopayProcessed.mandate.orgId,
        userId: autopayProcessed.mandate.userId,
        paymentId: autopayProcessed.payment?.id,
        status: "PROCESSED",
        processedAt: new Date(),
        processingError: null,
      }),
    });
    await prisma.paymentWebhookAttempt.update({
      where: {
        paymentEventId_attemptNo: { paymentEventId: event.id, attemptNo: attempt.attemptNo },
      },
      data: {
        status: "SUCCEEDED",
        httpStatusCode: 200,
        durationMs: Date.now() - startedAt,
        completedAt: new Date(),
        result: clean({
          autopayMandateId: autopayProcessed.mandate.id,
          paymentId: autopayProcessed.payment?.id,
          subscriptionId: autopayProcessed.subscription?.id,
          mandateStatus: autopayProcessed.mandate.status,
        }) as Prisma.InputJsonValue,
      },
    });
    return ok({
      received: true,
      providerEventId,
      autopayMandateId: autopayProcessed.mandate.id,
      status: autopayProcessed.mandate.status,
    });
  }

  const metadata = (parsed?.metadata ?? {}) as Record<string, unknown>;
  const sessionIdFromMetadata =
    typeof metadata.paymentSessionId === "string" ? metadata.paymentSessionId : undefined;
  const paymentSession =
    (sessionIdFromMetadata
      ? await prisma.paymentSession.findUnique({ where: { id: sessionIdFromMetadata } })
      : null) ??
    (parsed?.providerOrderId
      ? await prisma.paymentSession.findFirst({
          where: {
            OR: [{ providerRef: parsed.providerOrderId }, { id: parsed.providerOrderId }],
          },
        })
      : null);

  if (!paymentSession) {
    await prisma.paymentEvent.update({
      where: { id: event.id },
      data: {
        status: "QUARANTINED",
        processedAt: new Date(),
        processingError: "Payment session not found for payment event.",
      },
    });
    await prisma.paymentWebhookAttempt.update({
      where: {
        paymentEventId_attemptNo: { paymentEventId: event.id, attemptNo: attempt.attemptNo },
      },
      data: {
        status: "SUCCEEDED",
        httpStatusCode: 200,
        durationMs: Date.now() - startedAt,
        completedAt: new Date(),
        result: {
          quarantined: true,
          reason: "payment_session_not_found",
        } as Prisma.InputJsonValue,
      },
    });
    return ok({ received: true, quarantined: true, providerEventId });
  }

  let processed;
  try {
      processed = await applyPaymentSessionStatus({
        sessionId: paymentSession.id,
        nextStatus: parsed?.paymentStatus ?? "FAILED",
      provider: parsed?.provider ?? paymentSession.provider,
      ...((parsed?.providerPaymentId ?? parsed?.providerOrderId)
        ? { providerRef: parsed?.providerPaymentId ?? parsed?.providerOrderId }
        : {}),
        paymentMode: "CARD",
        ...(parsed?.amountPaise !== undefined ? { expectedAmountPaise: parsed.amountPaise } : {}),
        createNotification: createDirectNotification,
        ensureMembership: (membershipInput, tx) =>
          tx
            ? ensureOrganizationMembershipWithClient(tx, membershipInput)
            : ensureOrganizationMembership(membershipInput),
      });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Payment application failed.";
    await prisma.paymentEvent.update({
      where: { id: event.id },
      data: {
        orgId: paymentSession.orgId,
        userId: paymentSession.userId,
        sessionId: paymentSession.id,
        status: "QUARANTINED",
        processedAt: new Date(),
        processingError: errorMessage,
      },
    });
    await prisma.paymentWebhookAttempt.update({
      where: {
        paymentEventId_attemptNo: { paymentEventId: event.id, attemptNo: attempt.attemptNo },
      },
      data: {
        status: "FAILED",
        httpStatusCode: 200,
        durationMs: Date.now() - startedAt,
        completedAt: new Date(),
        errorCode: "payment_application_failed",
        errorMessage,
        result: {
          quarantined: true,
          reason: "payment_application_failed",
        } as Prisma.InputJsonValue,
      },
    });
    return ok({ received: true, quarantined: true, providerEventId });
  }

  await prisma.paymentEvent.update({
    where: { id: event.id },
    data: clean({
      orgId: processed.session.orgId,
      userId: processed.session.userId,
      sessionId: processed.session.id,
      paymentId: processed.payment?.id,
      status: "PROCESSED",
      processedAt: new Date(),
      processingError: null,
    }),
  });
  await prisma.paymentWebhookAttempt.update({
    where: {
      paymentEventId_attemptNo: { paymentEventId: event.id, attemptNo: attempt.attemptNo },
    },
    data: {
      status: "SUCCEEDED",
      httpStatusCode: 200,
      durationMs: Date.now() - startedAt,
      completedAt: new Date(),
      result: clean({
        sessionId: processed.session.id,
        paymentId: processed.payment?.id,
        status: processed.session.status,
      }) as Prisma.InputJsonValue,
    },
  });

  return ok({
    received: true,
    providerEventId,
    sessionId: processed.session.id,
    status: processed.session.status,
  });
}

export function getObjectMetadata(value: Prisma.JsonValue | null | undefined) {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return {} as Record<string, unknown>;
  }
  return value as Record<string, unknown>;
}

export type BillingDocumentKind = "receipt" | "invoice";

export type BillingOrgDetails = {
  id: string;
  name: string;
  username: string;
  legalName?: string | null;
  gstNumber?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
};

export function missingBillingDetails(org: BillingOrgDetails, kind: BillingDocumentKind) {
  const required: Array<[keyof BillingOrgDetails, string]> = [
    ["legalName", "Legal business name"],
    ["contactEmail", "Billing email"],
    ["address", "Billing address"],
    ["city", "City"],
    ["state", "State"],
    ["pincode", "Pincode"],
  ];
  if (kind === "invoice") {
    required.splice(1, 0, ["gstNumber", "GST number"]);
  }
  return required
    .filter(([key]) => {
      const value = org[key];
      return typeof value !== "string" || !value.trim();
    })
    .map(([, label]) => label);
}

function assertBillingDetailsReady(org: BillingOrgDetails, kind: BillingDocumentKind) {
  const missing = missingBillingDetails(org, kind);
  if (missing.length) {
    throw validationError(
      `${kind === "invoice" ? "Invoice" : "Receipt"} generation needs billing details first: ${missing.join(", ")}.`,
      { missing },
    );
  }
}

function documentOrgCode(org: Pick<BillingOrgDetails, "username" | "name">) {
  const code = (org.username || org.name)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 8);
  return code || "ZOOK";
}

function buildReceiptNumber(input: {
  org: Pick<BillingOrgDetails, "username" | "name">;
  recordedAt: Date;
  sequence: number;
}) {
  const year = input.recordedAt.getUTCFullYear();
  const month = String(input.recordedAt.getUTCMonth() + 1).padStart(2, "0");
  return `RC-${documentOrgCode(input.org)}-${year}${month}-${String(input.sequence).padStart(5, "0")}`;
}

function documentAmount(value: number | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format((value ?? 0) / 100);
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderDocumentHtml(input: {
  title: string;
  org: BillingOrgDetails;
  memberName?: string | null;
  number: string;
  issueDate: Date;
  rows: Array<{ label: string; value: string | number | null | undefined }>;
}) {
  return `<!doctype html>
<html lang="en-IN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.title)} ${escapeHtml(input.number)}</title>
  <style>
    body { margin: 0; background: #f4f4f0; color: #151512; font-family: Inter, Arial, sans-serif; }
    main { max-width: 760px; margin: 32px auto; background: #fff; border: 1px solid #ddd8cb; padding: 40px; }
    header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 1px solid #e7e2d5; padding-bottom: 24px; }
    h1 { margin: 0; font-size: 32px; }
    h2 { margin: 0 0 8px; font-size: 18px; }
    p { margin: 4px 0; color: #575347; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; margin-top: 28px; }
    th, td { text-align: left; border-bottom: 1px solid #eee8db; padding: 13px 0; }
    th { color: #6d6759; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
    .amount { font-size: 24px; font-weight: 700; color: #151512; }
    .print { margin-top: 28px; border: 0; border-radius: 999px; background: #b9f455; padding: 12px 18px; font-weight: 700; }
    @media print { body { background: #fff; } main { margin: 0; max-width: none; border: 0; } .print { display: none; } }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>${escapeHtml(input.title)}</h1>
        <p>${escapeHtml(input.number)}</p>
        <p>${escapeHtml(input.issueDate.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }))}</p>
      </div>
      <div>
        <h2>${escapeHtml(input.org.legalName ?? input.org.name)}</h2>
        <p>${escapeHtml(input.org.address)}, ${escapeHtml(input.org.city)}, ${escapeHtml(input.org.state)} ${escapeHtml(input.org.pincode)}</p>
        <p>${escapeHtml(input.org.contactEmail)}</p>
        ${input.org.gstNumber ? `<p>GST: ${escapeHtml(input.org.gstNumber)}</p>` : ""}
      </div>
    </header>
    ${input.memberName ? `<p style="margin-top:24px">Issued to: <strong>${escapeHtml(input.memberName)}</strong></p>` : ""}
    <table>
      <thead><tr><th>Detail</th><th>Value</th></tr></thead>
      <tbody>
        ${input.rows
          .map(
            (row) => `<tr><td>${escapeHtml(row.label)}</td><td>${escapeHtml(row.value)}</td></tr>`,
          )
          .join("")}
      </tbody>
    </table>
    <button class="print" onclick="window.print()">Print</button>
  </main>
</body>
</html>`;
}

async function getPaymentDocumentContext(input: {
  orgId: string;
  paymentId: string;
  userId?: string;
}) {
  const payment = await prisma.payment.findFirst({
    where: {
      id: input.paymentId,
      orgId: input.orgId,
      ...(input.userId ? { userId: input.userId } : {}),
    },
  });
  if (!payment) {
    throw notFoundError("Payment not found");
  }
  const [org, user, invoice] = await Promise.all([
    prisma.organization.findUnique({ where: { id: input.orgId } }),
    payment.userId ? prisma.user.findUnique({ where: { id: payment.userId } }) : null,
    prisma.invoice.findFirst({
      where: { orgId: input.orgId, paymentId: payment.id },
      orderBy: { issueDate: "desc" },
    }),
  ]);
  if (!org) {
    throw notFoundError("Organization not found");
  }
  return { org, payment, user, invoice };
}

export async function ensurePaymentReceipt(input: {
  orgId: string;
  paymentId: string;
  userId?: string;
}) {
  const { org, payment, user, invoice } = await getPaymentDocumentContext(input);
  assertBillingDetailsReady(org, "receipt");
  if (payment.status !== "SUCCEEDED" && payment.status !== "PARTIALLY_REFUNDED") {
    throw conflictError("Receipts can be generated only after a payment succeeds.");
  }
  if (payment.receiptNumber) {
    return { org, payment, user, invoice, receiptNumber: payment.receiptNumber };
  }
  const sequence = (await prisma.payment.count({ where: { orgId: input.orgId } })) + 1;
  const receiptNumber = buildReceiptNumber({
    org,
    recordedAt: payment.recordedAt ?? payment.createdAt,
    sequence,
  });
  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: { receiptNumber },
  });
  return { org, payment: updatedPayment, user, invoice, receiptNumber };
}

export async function ensurePaymentInvoice(input: {
  orgId: string;
  paymentId: string;
  userId?: string;
}) {
  const { org, payment, user } = await getPaymentDocumentContext(input);
  if (payment.status !== "SUCCEEDED" && payment.status !== "PARTIALLY_REFUNDED") {
    throw conflictError("Invoices can be generated only after a payment succeeds.");
  }
  const invoice = await ensurePaymentInvoiceDocument({ org, payment, user });
  return { org, payment, user, invoice };
}

export function receiptHtml(input: Awaited<ReturnType<typeof ensurePaymentReceipt>>) {
  return renderDocumentHtml({
    title: "Payment receipt",
    org: input.org,
    memberName: input.user?.name ?? input.user?.email ?? null,
    number: input.receiptNumber,
    issueDate: input.payment.recordedAt ?? input.payment.createdAt,
    rows: [
      { label: "Amount", value: documentAmount(input.payment.amountPaise) },
      { label: "Payment mode", value: input.payment.mode.replaceAll("_", " ") },
      { label: "Purpose", value: input.payment.purpose.replaceAll("_", " ") },
      { label: "Status", value: input.payment.status.replaceAll("_", " ") },
      { label: "Reference", value: input.payment.providerRef ?? input.payment.receiptNumber ?? "" },
    ],
  });
}

export function invoiceHtml(input: Awaited<ReturnType<typeof ensurePaymentInvoice>>) {
  return renderDocumentHtml({
    title: "Tax invoice",
    org: input.org,
    memberName: input.user?.name ?? input.user?.email ?? null,
    number: input.invoice.invoiceNumber ?? input.invoice.invoiceNo ?? input.invoice.id,
    issueDate: input.invoice.issueDate ?? input.invoice.issuedAt,
    rows: [
      { label: "Subtotal", value: documentAmount(input.invoice.subtotalPaise) },
      { label: "GST", value: documentAmount(input.invoice.gstPaise) },
      { label: "Total", value: documentAmount(input.invoice.totalPaise) },
      { label: "Payment status", value: input.invoice.status.replaceAll("_", " ") },
      {
        label: "Payment reference",
        value: input.payment.providerRef ?? input.payment.receiptNumber ?? "",
      },
    ],
  });
}

export async function invoicePdfResponse(input: {
  invoice: Prisma.InvoiceGetPayload<object>;
  org?: Awaited<ReturnType<typeof prisma.organization.findUnique>>;
  user?: Awaited<ReturnType<typeof prisma.user.findUnique>>;
}) {
  const pdf = await renderInvoicePdfBuffer({
    invoice: input.invoice,
    org: input.org ?? null,
    user: input.user ?? null,
  });
  const filename = input.invoice.invoiceNumber ?? input.invoice.invoiceNo ?? input.invoice.number ?? input.invoice.id;
  const safeFilename = filename.replace(/[^A-Za-z0-9._-]+/g, "_");
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${safeFilename}.pdf"`,
      "cache-control": "private, max-age=0, no-store",
    },
  });
}

export async function invoiceSignedUrl(invoice: {
  pdfAssetId: string | null;
  pdfFileAssetId: string | null;
}) {
  const assetId = invoice.pdfAssetId ?? invoice.pdfFileAssetId;
  if (!assetId) return null;
  const asset = await prisma.fileAsset.findFirst({ where: { id: assetId, deletedAt: null } });
  return asset ? resolveFileUrl(asset, true) : null;
}

export async function assertOrgUser(input: { orgId: string; userId: string; role?: OrgRole }) {
  const membership = await prisma.organizationUser.findUnique({
    where: { orgId_userId: { orgId: input.orgId, userId: input.userId } },
  });
  if (!membership || membership.status !== "active") {
    throw forbiddenError("Target user is not active in this organization.");
  }
  if (input.role) {
    const roleAssignment = await prisma.organizationRoleAssignment.findFirst({
      where: { orgId: input.orgId, userId: input.userId, role: input.role },
    });
    if (!roleAssignment) {
      throw forbiddenError(`Target user is not an organization ${input.role.toLowerCase()}.`);
    }
  }
}

export function assertActiveContextOrg(
  ctx: { orgId?: string; orgStatus?: string },
  orgId?: string,
) {
  if (!orgId) {
    return;
  }
  if (ctx.orgId !== orgId) {
    throw forbiddenError("No organization access");
  }
  if (ctx.orgStatus === "SUSPENDED" || ctx.orgStatus === "CANCELLED") {
    throw forbiddenError("Organization is not active.");
  }
}

export function getPaymentProviderOrThrow() {
  const diagnostics = getPaymentProviderDiagnostics();
  if (
    diagnostics.status === "misconfigured" ||
    diagnostics.status === "unsupported" ||
    diagnostics.status === "disabled"
  ) {
    throw validationError("Payments are not available right now.");
  }
  return getPaymentProvider();
}

export function getEmailProviderOrThrow() {
  const diagnostics = getEmailProviderDiagnostics();
  if (
    diagnostics.status === "misconfigured" ||
    diagnostics.status === "unsupported" ||
    diagnostics.status === "disabled"
  ) {
    throw validationError("Email sign-in is not available right now.");
  }
  return getEmailProvider();
}

async function fanoutPlanPublished(input: {
  request: NextRequest;
  orgId: string;
  actorUserId: string;
  plan: { id: string; title: string };
}) {
  const assignments = await prisma.planAssignment.findMany({
    where: {
      orgId: input.orgId,
      planId: input.plan.id,
      active: true,
      assignedToUserId: { not: null },
    },
    select: { assignedToUserId: true },
  });
  const userIds = [
    ...new Set(
      assignments.map((assignment) => assignment.assignedToUserId).filter(Boolean) as string[],
    ),
  ];
  if (!userIds.length) {
    return { notified: 0, emailed: 0 };
  }

  await createDirectNotification({
    orgId: input.orgId,
    createdById: input.actorUserId,
    type: "PLAN",
    title: `Plan published: ${input.plan.title}`,
    body: "Your trainer has published a plan for you.",
    audience: "assigned_members",
    userIds,
    pushEnabled: true,
    metadata: { planId: input.plan.id } as Prisma.InputJsonValue,
  });

  let emailed = 0;
  if (getEmailProviderDiagnostics().activeProvider) {
    const [organization, users, profiles] = await Promise.all([
      prisma.organization.findUnique({ where: { id: input.orgId }, select: { name: true } }),
      prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true } }),
      prisma.memberProfile.findMany({
        where: { orgId: input.orgId, userId: { in: userIds }, marketingOptIn: true },
        select: { userId: true },
      }),
    ]);
    const optedInUserIds = new Set(profiles.map((profile) => profile.userId));
    const provider = getEmailProvider();
    for (const user of users) {
      const email = publicUserEmail(user.email);
      if (!email || !optedInUserIds.has(user.id)) {
        continue;
      }
      try {
        await provider.sendNotificationEmail({
          to: email,
          title: `Plan published: ${input.plan.title}`,
          body: "Your trainer has published a plan for you in Zook.",
          ...(organization?.name ? { organizationName: organization.name } : {}),
          variant: "generic",
        });
        emailed += 1;
      } catch (error) {
        await writeAuditLog({
          request: input.request,
          orgId: input.orgId,
          actorUserId: input.actorUserId,
          action: "plan.publish_email_failed",
          entityType: "plan_content",
          entityId: input.plan.id,
          metadata: { userId: user.id, error: error instanceof Error ? error.message : "unknown" },
        });
      }
    }
  }
  return { notified: userIds.length, emailed };
}

export function getSmsProviderOrThrow() {
  const diagnostics = getSmsProviderDiagnostics();
  if (
    diagnostics.status === "misconfigured" ||
    diagnostics.status === "unsupported" ||
    diagnostics.status === "disabled"
  ) {
    throw validationError("Phone sign-in is not available right now.");
  }
  return getSmsProvider();
}

export function getMapProviderOrThrow() {
  const diagnostics = getMapProviderDiagnostics();
  if (
    diagnostics.status === "misconfigured" ||
    diagnostics.status === "unsupported" ||
    diagnostics.status === "disabled"
  ) {
    throw validationError("Maps are not available right now.");
  }
  return getMapProvider();
}

export function getStorageProviderOrThrow() {
  const diagnostics = getStorageProviderDiagnostics();
  if (
    diagnostics.status === "misconfigured" ||
    diagnostics.status === "unsupported" ||
    diagnostics.status === "disabled"
  ) {
    throw validationError("File uploads are not available right now.");
  }
  return getStorageProvider();
}

export function assertServerRuntimeConfig(path: string[]) {
  if (
    pathMatches(path, ["health"]) ||
    pathMatches(path, ["ready"]) ||
    pathMatches(path, ["status"])
  ) {
    return;
  }
  const result = validateRuntimeConfig();
  const errors = result.issues.filter((issue) => issue.level === "error");
  if (errors.length) {
    throw validationError(errors.map((issue) => issue.message).join(" "));
  }
}

export async function startPaymentSessionCheckout(input: {
  session: {
    id: string;
    orgId: string | null;
    userId: string | null;
    purpose:
      | "SAAS_BILLING"
      | "MEMBERSHIP"
      | "SHOP_ORDER"
      | "PERSONAL_TRAINING"
      | "OTHER"
      | "MANUAL_ADJUSTMENT";
    amountPaise: number;
    currency: string;
    metadata: Prisma.JsonValue | null;
    providerRef: string | null;
  };
  customer?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
}) {
  const provider = getPaymentProviderOrThrow();
  const metadata = getObjectMetadata(input.session.metadata);
  const checkout = await provider.createCheckoutSession({
    ...(input.session.orgId ? { orgId: input.session.orgId } : {}),
    ...(input.session.userId ? { userId: input.session.userId } : {}),
    purpose: input.session.purpose,
    amountPaise: input.session.amountPaise,
    currency: "INR",
    referenceId: input.session.id,
    customer: clean({
      name: input.customer?.name ?? undefined,
      email: input.customer?.email ?? undefined,
      phone: input.customer?.phone ?? undefined,
    }),
    metadata: {
      ...metadata,
      paymentSessionId: input.session.id,
      ...(input.session.orgId ? { orgId: input.session.orgId } : {}),
      ...(input.session.userId ? { userId: input.session.userId } : {}),
    },
  });

  const checkoutUrl =
    checkout.checkoutUrl ??
    (provider.providerName === "mock"
      ? `/checkout/mock/${input.session.id}`
      : `/checkout/${input.session.id}`);

  const session = await prisma.paymentSession.update({
    where: { id: input.session.id },
    data: clean({
      provider: provider.providerName,
      providerRef:
        checkout.providerOrderId ?? checkout.providerSessionId ?? input.session.providerRef ?? null,
      checkoutUrl,
      status: checkout.status,
      metadata: {
        ...metadata,
        ...(checkout.checkoutData ? { providerCheckoutData: checkout.checkoutData } : {}),
      } as Prisma.InputJsonValue,
    }),
  });

  return { session, checkout, checkoutUrl };
}

export const liveMandateStatuses: PaymentMandateStatus[] = [
  "CREATED",
  "AUTHENTICATED",
  "ACTIVE",
  "PENDING",
  "HALTED",
  "PAUSED",
];

export function providerMandateStatusToLocal(status: string): PaymentMandateStatus {
  switch (status.toLowerCase()) {
    case "authenticated":
      return "AUTHENTICATED";
    case "active":
      return "ACTIVE";
    case "pending":
      return "PENDING";
    case "halted":
      return "HALTED";
    case "paused":
      return "PAUSED";
    case "cancelled":
      return "CANCELLED";
    case "completed":
      return "COMPLETED";
    case "expired":
      return "EXPIRED";
    case "failed":
      return "FAILED";
    default:
      return "CREATED";
  }
}

async function applySaasBillingProviderEvent(input: {
  event: {
    provider: string;
    eventType: string;
    providerSubscriptionId?: string;
    paymentStatus: string;
    metadata?: Record<string, unknown>;
    rawPayload: unknown;
  };
}) {
  const metadata = input.event.metadata ?? {};
  const metadataMandateId =
    typeof metadata.saasBillingMandateId === "string" ? metadata.saasBillingMandateId : undefined;
  const metadataOrgId = typeof metadata.orgId === "string" ? metadata.orgId : undefined;
  const metadataTier =
    typeof metadata.tier === "string" && ["STARTER", "GROWTH", "PRO"].includes(metadata.tier)
      ? (metadata.tier as PaidSaasTier)
      : undefined;
  const metadataBillingCycle =
    metadata.billingCycle === "YEARLY" || metadata.billingCycle === "MONTHLY"
      ? (metadata.billingCycle as SaasBillingCycle)
      : undefined;
  const metadataPriceLockedPaise =
    typeof metadata.priceLockedPaise === "number" ? metadata.priceLockedPaise : undefined;
  const providerSubscriptionId = input.event.providerSubscriptionId;
  const mandate =
    (metadataMandateId
      ? await prisma.saaSBillingMandate.findUnique({ where: { id: metadataMandateId } })
      : null) ??
    (providerSubscriptionId
      ? await prisma.saaSBillingMandate.findFirst({
          where: { provider: input.event.provider, providerMandateId: providerSubscriptionId },
        })
      : null);

  if (!mandate) {
    return null;
  }

  const rawPayload = input.event.rawPayload as { payload?: Record<string, { entity?: unknown }> };
  const subscriptionEntity = rawPayload?.payload?.subscription?.entity;
  const subscription =
    subscriptionEntity &&
    !Array.isArray(subscriptionEntity) &&
    typeof subscriptionEntity === "object"
      ? (subscriptionEntity as Record<string, unknown>)
      : {};
  const providerStatus = typeof subscription.status === "string" ? subscription.status : undefined;
  const nextStatus = providerMandateStatusToLocal(
    input.event.eventType === "invoice.paid" || input.event.eventType === "subscription.charged"
      ? "active"
      : (providerStatus ?? input.event.paymentStatus),
  );
  const currentStartAt =
    typeof subscription.current_start === "number" && subscription.current_start > 0
      ? new Date(subscription.current_start * 1000)
      : undefined;
  const currentEndAt =
    typeof subscription.current_end === "number" && subscription.current_end > 0
      ? new Date(subscription.current_end * 1000)
      : undefined;
  const nextChargeAt =
    typeof subscription.charge_at === "number" && subscription.charge_at > 0
      ? new Date(subscription.charge_at * 1000)
      : undefined;
  const paidCount =
    typeof subscription.paid_count === "number" ? subscription.paid_count : undefined;
  const totalCount =
    typeof subscription.total_count === "number" ? subscription.total_count : undefined;

  const [updatedMandate, updatedSubscription] = await prisma.$transaction([
    prisma.saaSBillingMandate.update({
      where: { id: mandate.id },
      data: clean({
        status: nextStatus,
        providerMandateId: providerSubscriptionId ?? mandate.providerMandateId ?? undefined,
        providerPlanId:
          typeof subscription.plan_id === "string"
            ? subscription.plan_id
            : (mandate.providerPlanId ?? undefined),
        currentStartAt,
        currentEndAt,
        nextChargeAt,
        paidCount,
        totalCount,
        authenticatedAt:
          nextStatus === "AUTHENTICATED" && !mandate.authenticatedAt
            ? new Date()
            : (mandate.authenticatedAt ?? undefined),
        activatedAt:
          nextStatus === "ACTIVE" && !mandate.activatedAt
            ? new Date()
            : (mandate.activatedAt ?? undefined),
        cancelledAt:
          nextStatus === "CANCELLED" && !mandate.cancelledAt
            ? new Date()
            : (mandate.cancelledAt ?? undefined),
        metadata: {
          ...getObjectMetadata(mandate.metadata),
          lastProviderEventType: input.event.eventType,
          ...(metadataOrgId ? { orgId: metadataOrgId } : {}),
        } as Prisma.InputJsonValue,
      }),
    }),
    prisma.saaSSubscription.upsert({
      where: { orgId: mandate.orgId },
      create: {
        orgId: mandate.orgId,
        status: nextStatus === "ACTIVE" ? "ACTIVE" : "TRIAL_ACTIVE",
        tier: metadataTier ?? "FREE",
        billingCycle: metadataBillingCycle ?? "MONTHLY",
        trialStartAt: new Date(),
        trialEndAt: nextChargeAt ?? mandate.nextChargeAt ?? new Date(),
        paymentSessionId: mandate.paymentSessionId,
        nextBillingAt: nextChargeAt ?? mandate.nextChargeAt ?? null,
        nextRenewalAt: currentEndAt ?? nextChargeAt ?? mandate.nextChargeAt ?? null,
        priceLockedPaise: metadataPriceLockedPaise ?? mandate.amountPaise,
      },
      update: clean({
        ...(metadataTier ? { tier: metadataTier } : {}),
        ...(metadataBillingCycle ? { billingCycle: metadataBillingCycle } : {}),
        ...(metadataPriceLockedPaise ? { priceLockedPaise: metadataPriceLockedPaise } : {}),
        paymentSessionId: mandate.paymentSessionId,
        nextBillingAt: nextChargeAt ?? mandate.nextChargeAt ?? undefined,
        nextRenewalAt: currentEndAt ?? nextChargeAt ?? mandate.nextChargeAt ?? undefined,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
        ...(nextStatus === "ACTIVE" ? { status: "ACTIVE" } : {}),
      }),
    }),
  ]);

  if (nextStatus === "ACTIVE") {
    await prisma.organization.update({
      where: { id: mandate.orgId },
      data: { status: "ACTIVE" },
    });
  }

  return { mandate: updatedMandate, subscription: updatedSubscription };
}

function deriveAutopayBillingCadence(plan: {
  durationDays: number | null;
  validityDays: number | null;
  startDate: Date | null;
  endDate: Date | null;
}) {
  const rangedDays =
    plan.startDate && plan.endDate
      ? Math.ceil((plan.endDate.getTime() - plan.startDate.getTime()) / (24 * 60 * 60 * 1000))
      : null;
  const days = plan.durationDays ?? plan.validityDays ?? rangedDays;
  if (!days || days < 7) {
    throw validationError("Autopay requires a plan validity of at least 7 days.");
  }
  if (days >= 365 && days % 365 === 0) {
    return { billingPeriod: "yearly" as const, billingInterval: Math.max(1, days / 365) };
  }
  if (days >= 30 && days % 30 === 0) {
    return { billingPeriod: "monthly" as const, billingInterval: Math.max(1, days / 30) };
  }
  if (days % 7 === 0) {
    return { billingPeriod: "weekly" as const, billingInterval: Math.max(1, days / 7) };
  }
  return { billingPeriod: "daily" as const, billingInterval: Math.max(7, days) };
}

export function planRequiresExercises(type: PlanType) {
  return [
    "WORKOUT",
    "EXERCISE_ROUTINE",
    "TRANSFORMATION_PROGRAM",
    "MACHINE_GUIDE",
    "RECOVERY",
  ].includes(type);
}

function notificationPreferenceAllowsType(
  preference:
    | {
        transactional: boolean;
        operational: boolean;
        promotional: boolean;
        engagement: boolean;
      }
    | null
    | undefined,
  type: "TRANSACTIONAL" | "OPERATIONAL" | "PROMOTIONAL" | "ENGAGEMENT" | "PLAN" | "SECURITY",
) {
  if (!preference) {
    return true;
  }
  if (type === "TRANSACTIONAL" || type === "SECURITY" || type === "PLAN") {
    return true;
  }
  if (type === "OPERATIONAL") {
    return preference.operational;
  }
  if (type === "PROMOTIONAL") {
    return preference.promotional;
  }
  if (type === "ENGAGEMENT") {
    return preference.engagement;
  }
  return true;
}

export async function resolveNotificationRecipients(input: {
  orgId: string;
  senderUserId: string;
  audience: (typeof notificationAudienceKinds)[number];
  type: NotificationType;
  selectedUserIds?: string[];
  singleUserId?: string;
  planId?: string;
  branchId?: string | null;
  daysAhead?: number;
  excludeMinors?: boolean;
}) {
  const preview = await resolveNotificationPreview(input);
  return preview.recipientUserIds;
}

export async function resolveNotificationPreview(input: {
  orgId: string;
  senderUserId: string;
  audience: (typeof notificationAudienceKinds)[number];
  type: NotificationType;
  selectedUserIds?: string[];
  singleUserId?: string;
  planId?: string;
  branchId?: string | null;
  daysAhead?: number;
  excludeMinors?: boolean;
}) {
  const today = new Date();
  const endsBy = new Date();
  endsBy.setDate(today.getDate() + (input.daysAhead ?? 7));

  let candidateUserIds: string[] = [];
  if (input.audience === "selected_members") {
    candidateUserIds = input.selectedUserIds ?? [];
  } else if (input.audience === "single_member") {
    candidateUserIds = input.singleUserId ? [input.singleUserId] : [];
  } else if (input.audience === "assigned_clients") {
    const assignments = await prisma.trainerAssignment.findMany({
      where: { orgId: input.orgId, trainerUserId: input.senderUserId, active: true },
      select: { memberUserId: true },
    });
    candidateUserIds = assignments.map((assignment) => assignment.memberUserId);
  } else if (input.audience === "membership_plan") {
    if (!input.planId) {
      throw validationError("A planId is required for membership-plan audiences.");
    }
    const subscriptions = await prisma.memberSubscription.findMany({
      where: { orgId: input.orgId, planId: input.planId, status: "ACTIVE" },
      select: { memberUserId: true },
    });
    candidateUserIds = subscriptions.map((subscription) => subscription.memberUserId);
  } else {
    const subscriptions = await prisma.memberSubscription.findMany({
      where: {
        orgId: input.orgId,
        status: "ACTIVE",
        ...(input.audience === "expiring_soon" ? { endsAt: { gte: today, lte: endsBy } } : {}),
        ...(input.audience === "branch_members" && input.branchId
          ? { branchId: input.branchId }
          : {}),
      },
      select: { memberUserId: true },
    });
    candidateUserIds = subscriptions.map((subscription) => subscription.memberUserId);
  }

  const uniqueUserIds = Array.from(new Set(candidateUserIds));
  if (!uniqueUserIds.length) {
    return {
      recipientUserIds: [],
      resolvedRecipients: 0,
      willDeliver: 0,
      blockedByOptOut: 0,
      blockedByMinor: 0,
    };
  }

  const memberships = await prisma.organizationUser.findMany({
    where: { orgId: input.orgId, userId: { in: uniqueUserIds }, status: "active" },
    select: { userId: true },
  });
  const orgUserIds = memberships.map((membership) => membership.userId);
  if (!orgUserIds.length) {
    return {
      recipientUserIds: [],
      resolvedRecipients: uniqueUserIds.length,
      willDeliver: 0,
      blockedByOptOut: 0,
      blockedByMinor: 0,
    };
  }

  const [users, preferences] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: orgUserIds } } }),
    prisma.userNotificationPreference.findMany({
      where: { userId: { in: orgUserIds }, OR: [{ orgId: input.orgId }, { orgId: null }] },
    }),
  ]);
  const preferenceByUserId = new Map<string, (typeof preferences)[number]>();
  for (const preference of preferences) {
    if (!preferenceByUserId.has(preference.userId) || preference.orgId === input.orgId) {
      preferenceByUserId.set(preference.userId, preference);
    }
  }

  const recipientUserIds: string[] = [];
  let blockedByOptOut = 0;
  const blockedByMinor = 0;

  for (const user of users) {
    const preference = preferenceByUserId.get(user.id);
    if (!notificationPreferenceAllowsType(preference, input.type)) {
      blockedByOptOut += 1;
      continue;
    }
    const allowed = canReceiveNotification(input.type, {
      isMinor: user.isMinor,
      guardianConsentGranted: !user.guardianPending,
      marketingOptIn: preference
        ? preference.promotional && user.marketingOptIn
        : user.marketingOptIn,
      aiConsent: user.aiConsent,
      hasProfilePhoto: Boolean(user.profilePhotoUrl),
    });
    if (!allowed) {
      blockedByOptOut += 1;
      continue;
    }
    recipientUserIds.push(user.id);
  }

  return {
    recipientUserIds,
    resolvedRecipients: orgUserIds.length,
    willDeliver: recipientUserIds.length,
    blockedByOptOut,
    blockedByMinor,
  };
}

export async function enforceNotificationBudgets(input: {
  orgId: string;
  senderUserId: string;
  type: NotificationType;
  recipientUserIds: string[];
}) {
  await enforceNotificationRateLimits({
    ...input,
    consume: async (rule, key, message) => {
      await assertRateLimit(rule, key, message);
    },
  });
}

function notificationDayStart(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}

export async function getNotificationBudgetSnapshot(input: {
  orgId: string;
  senderUserId: string;
  now?: Date;
}) {
  const createdAt = { gte: notificationDayStart(input.now) };
  const [orgAllCount, orgOperationalCount, orgPromoCount, senderCount] = await Promise.all([
    prisma.notification.count({ where: { orgId: input.orgId, createdAt } }),
    prisma.notification.count({
      where: { orgId: input.orgId, type: "OPERATIONAL", createdAt },
    }),
    prisma.notification.count({
      where: { orgId: input.orgId, type: { in: ["PROMOTIONAL", "ENGAGEMENT"] }, createdAt },
    }),
    prisma.notification.count({
      where: { orgId: input.orgId, createdById: input.senderUserId, createdAt },
    }),
  ]);
  return {
    orgAllRemaining: Math.max(defaultRateLimitRules.notificationOrgAllDaily.limit - orgAllCount, 0),
    orgOperationalRemaining: Math.max(
      defaultRateLimitRules.notificationOrgOperationalDaily.limit - orgOperationalCount,
      0,
    ),
    orgPromoRemaining: Math.max(
      defaultRateLimitRules.notificationOrgPromoDaily.limit - orgPromoCount,
      0,
    ),
    senderRemaining: Math.max(defaultRateLimitRules.notificationSenderDaily.limit - senderCount, 0),
  };
}

export async function splitRecipientsByDailyCap(input: {
  orgId: string;
  recipientUserIds: string[];
  now?: Date;
}) {
  if (!input.recipientUserIds.length) {
    return { sendNowUserIds: [] as string[], scheduledUserIds: [] as string[] };
  }
  const notifications = await prisma.notification.findMany({
    where: { orgId: input.orgId, createdAt: { gte: notificationDayStart(input.now) } },
    select: { id: true },
  });
  const notificationIds = notifications.map((notification) => notification.id);
  if (!notificationIds.length) {
    return { sendNowUserIds: input.recipientUserIds, scheduledUserIds: [] as string[] };
  }
  const rows = await prisma.notificationRecipient.findMany({
    where: {
      userId: { in: input.recipientUserIds },
      notificationId: { in: notificationIds },
      deliveryStatus: { not: "scheduled" },
    },
    select: { userId: true },
  });
  const counts = rows.reduce<Map<string, number>>((map, row) => {
    map.set(row.userId, (map.get(row.userId) ?? 0) + 1);
    return map;
  }, new Map());
  const sendNowUserIds: string[] = [];
  const scheduledUserIds: string[] = [];
  for (const userId of input.recipientUserIds) {
    if ((counts.get(userId) ?? 0) >= defaultRateLimitRules.notificationRecipientDaily.limit) {
      scheduledUserIds.push(userId);
    } else {
      sendNowUserIds.push(userId);
    }
  }
  return { sendNowUserIds, scheduledUserIds };
}

function toCouponInput(coupon: {
  id: string;
  orgId: string;
  code: string;
  type: "FIXED_AMOUNT" | "PERCENTAGE";
  valuePaise: number | null;
  valuePercentBps: number | null;
  active: boolean;
  validFrom: Date | null;
  validUntil: Date | null;
  maxRedemptions: number | null;
  perUserLimit: number | null;
  applicablePlanId: string | null;
}) {
  return clean({
    id: coupon.id,
    orgId: coupon.orgId,
    code: coupon.code,
    type: coupon.type,
    valuePaise: coupon.valuePaise ?? undefined,
    valuePercentBps: coupon.valuePercentBps ?? undefined,
    active: coupon.active,
    validFrom: coupon.validFrom ?? undefined,
    validUntil: coupon.validUntil ?? undefined,
    maxRedemptions: coupon.maxRedemptions ?? undefined,
    perUserLimit: coupon.perUserLimit ?? undefined,
    applicablePlanId: coupon.applicablePlanId ?? undefined,
  });
}

export function toMembershipPlanInput(plan: {
  id: string;
  orgId: string;
  branchId: string | null;
  name: string;
  type: "DURATION" | "VISIT_PACK" | "DATE_RANGE" | "HYBRID" | "TRIAL";
  pricePaise: number;
  durationDays: number | null;
  visitLimit: number | null;
  validityDays: number | null;
  startDate: Date | null;
  endDate: Date | null;
  active: boolean;
  publicVisible: boolean;
}) {
  return clean({
    id: plan.id,
    orgId: plan.orgId,
    branchId: plan.branchId ?? undefined,
    name: plan.name,
    type: plan.type,
    pricePaise: plan.pricePaise,
    durationDays: plan.durationDays ?? undefined,
    visitLimit: plan.visitLimit ?? undefined,
    validityDays: plan.validityDays ?? undefined,
    startDate: plan.startDate ?? undefined,
    endDate: plan.endDate ?? undefined,
    active: plan.active,
    publicVisible: plan.publicVisible,
  });
}

export async function resolveValidatedReferral(input: {
  orgId: string;
  userId: string;
  referralCode?: string;
  ctx?: Awaited<ReturnType<typeof getRequestContext>>;
}) {
  if (!input.referralCode) {
    return null;
  }
  const [referral, user] = await Promise.all([
    prisma.referralCode.findUnique({ where: { code: input.referralCode } }),
    prisma.user.findUniqueOrThrow({ where: { id: input.userId } }),
  ]);
  if (!referral || referral.orgId !== input.orgId) {
    throw validationError("Referral code is invalid for this gym");
  }
  const referrer = await prisma.user.findUnique({ where: { id: referral.referrerUserId } });
  const existingRedemption = await prisma.referralRedemption.findFirst({
    where: { orgId: input.orgId, referralCodeId: referral.id, referredUserId: input.userId },
  });
  const policy = await prisma.referralPolicy.upsert({
    where: { orgId: input.orgId },
    update: {},
    create: { orgId: input.orgId },
  });
  if (!policy.enabled) {
    throw validationError("Referral program is not active for this gym");
  }
  if (referral.createdByRole === "TRAINER" && !policy.trainerReferralEnabled) {
    throw validationError("Trainer referrals are not active for this gym");
  }
  if (
    (referral.createdByRole === "ADMIN" || referral.createdByRole === "RECEPTIONIST") &&
    !policy.staffReferralEnabled
  ) {
    throw validationError("Staff referrals are not active for this gym");
  }
  const resetAt = referral.lastResetAt ?? referral.createdAt;
  const now = new Date();
  const resetNeeded =
    resetAt.getUTCMonth() !== now.getUTCMonth() ||
    resetAt.getUTCFullYear() !== now.getUTCFullYear();
  const monthlyUseCount = resetNeeded ? 0 : referral.monthlyUseCount;
  if (resetNeeded) {
    await prisma.referralCode.update({
      where: { id: referral.id },
      data: { monthlyUseCount: 0, lastResetAt: now },
    });
  }
  if (!existingRedemption && monthlyUseCount >= policy.maxReferralsPerMonth) {
    throw validationError("Referral code has reached its monthly limit");
  }
  validateReferralRedemption(
    clean({
      id: referral.id,
      orgId: referral.orgId,
      referrerUserId: referral.referrerUserId,
      code: referral.code,
      couponId: referral.couponId ?? undefined,
      expiresAt: referral.expiresAt ?? undefined,
      maxUses: referral.maxUses ?? undefined,
      status: referral.status as "active" | "paused" | "expired",
      redemptionCount: referral.redemptionCount,
    }),
    clean({
      referredUserId: input.userId,
      referredEmail: publicUserEmail(user.email),
      referrerEmail: publicUserEmail(referrer?.email),
      existingRedemption: Boolean(existingRedemption?.subscriptionId),
      ctx: input.ctx,
    }),
  );
  return referral;
}

export async function redeemReferralCodeForUser(input: {
  orgId: string;
  userId: string;
  code: string;
  ctx: Awaited<ReturnType<typeof getRequestContext>>;
}) {
  const referral = await resolveValidatedReferral({
    orgId: input.orgId,
    userId: input.userId,
    referralCode: input.code,
    ctx: input.ctx,
  });
  if (!referral) {
    throw validationError("Referral code is invalid for this gym");
  }
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.referralRedemption.findFirst({
        where: { orgId: input.orgId, referralCodeId: referral.id, referredUserId: input.userId },
      });
      if (existing) {
        return { referral, redemption: existing, alreadyRedeemed: true };
      }

      const policy = await tx.referralPolicy.upsert({
        where: { orgId: input.orgId },
        update: {},
        create: { orgId: input.orgId },
      });
      const reserved = await tx.referralCode.updateMany({
        where: {
          id: referral.id,
          orgId: input.orgId,
          status: "active",
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          monthlyUseCount: { lt: policy.maxReferralsPerMonth },
          AND: [
            {
              OR: [{ maxUses: null }, { redemptionCount: { lt: referral.maxUses ?? 0 } }],
            },
          ],
        },
        data: { redemptionCount: { increment: 1 }, monthlyUseCount: { increment: 1 } },
      });
      if (reserved.count !== 1) {
        throw validationError("Referral code has reached its limit");
      }

      const redemption = await tx.referralRedemption.create({
        data: {
          orgId: input.orgId,
          referralCodeId: referral.id,
          referredUserId: input.userId,
          metadata: { source: "redeem_endpoint" },
        },
      });
      return { referral, redemption, alreadyRedeemed: false };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const duplicate = await prisma.referralRedemption.findFirst({
        where: { orgId: input.orgId, referralCodeId: referral.id, referredUserId: input.userId },
      });
      if (duplicate) {
        return { referral, redemption: duplicate, alreadyRedeemed: true };
      }
    }
    throw error;
  }
}

export async function generateUniqueReferralCode(seed: string) {
  const prefix = `ZK${seed
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 2)
    .toUpperCase()}`;
  for (let index = 0; index < 8; index += 1) {
    const code = `${prefix}${randomBytes(2).toString("hex").toUpperCase()}`;
    const existing = await prisma.referralCode.findUnique({ where: { code } });
    if (!existing) return code;
  }
  return `ZK${randomBytes(5).toString("hex").toUpperCase()}`;
}

export function computeDiscountPaise(input: {
  type: "PERCENTAGE" | "FIXED_AMOUNT" | "FIXED" | "NONE";
  value: number;
  amountPaise: number;
}) {
  if (input.type === "NONE") return 0;
  if (input.type === "PERCENTAGE") {
    return Math.floor((input.amountPaise * input.value) / 10_000);
  }
  return Math.min(input.value, input.amountPaise);
}

async function resolveActiveOffer(input: { orgId: string; planId: string; amountPaise: number }) {
  const now = new Date();
  const offers = await prisma.offer.findMany({
    where: {
      orgId: input.orgId,
      active: true,
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
    orderBy: { discountValue: "desc" },
    take: 25,
  });
  const offer = offers.find((candidate) => {
    if (candidate.maxRedemptions && candidate.redemptionCount >= candidate.maxRedemptions) {
      return false;
    }
    const applicablePlans = Array.isArray(candidate.applicablePlans)
      ? candidate.applicablePlans.filter((item): item is string => typeof item === "string")
      : [];
    return applicablePlans.length === 0 || applicablePlans.includes(input.planId);
  });
  if (!offer) {
    return { offer: null, discountPaise: 0 };
  }
  return {
    offer,
    discountPaise: computeDiscountPaise({
      type: offer.discountType,
      value: offer.discountValue,
      amountPaise: input.amountPaise,
    }),
  };
}

async function resolveReferralPricing(input: {
  orgId: string;
  referralCodeId?: string;
  amountPaise: number;
  couponDiscountPaise: number;
}) {
  const policy = await prisma.referralPolicy.upsert({
    where: { orgId: input.orgId },
    update: {},
    create: { orgId: input.orgId },
  });
  if (!input.referralCodeId) {
    const capPaise = Math.floor((input.amountPaise * policy.maxDiscountCapBps) / 10_000);
    const cappedDiscountPaise = Math.min(input.couponDiscountPaise, capPaise);
    return { referralDiscountPaise: 0, finalAmountPaise: input.amountPaise - cappedDiscountPaise };
  }
  const rawReferralDiscount = computeDiscountPaise({
    type: policy.referredDiscountType as "PERCENTAGE" | "FIXED" | "NONE",
    value: policy.referredDiscountValue,
    amountPaise: input.amountPaise,
  });
  const capPaise = Math.floor((input.amountPaise * policy.maxDiscountCapBps) / 10_000);
  const combinedDiscountPaise = Math.min(input.couponDiscountPaise + rawReferralDiscount, capPaise);
  const referralDiscountPaise = Math.max(combinedDiscountPaise - input.couponDiscountPaise, 0);
  return {
    referralDiscountPaise,
    finalAmountPaise: Math.max(input.amountPaise - combinedDiscountPaise, 0),
  };
}

async function resolveValidatedCoupon(input: {
  orgId: string;
  couponCode?: string;
  fallbackCouponId?: string | null;
  userId: string;
  planId: string;
  amountPaise: number;
}) {
  const couponId = input.fallbackCouponId ?? undefined;
  const coupon =
    (input.couponCode
      ? await prisma.coupon.findUnique({
          where: { orgId_code: { orgId: input.orgId, code: input.couponCode } },
        })
      : couponId
        ? await prisma.coupon.findUnique({ where: { id: couponId } })
        : null) ?? null;

  if (!coupon) {
    return { coupon: null, finalAmountPaise: input.amountPaise, discountPaise: 0 };
  }

  const userRedemptions = await prisma.couponRedemption.count({
    where: { orgId: input.orgId, couponId: coupon.id, userId: input.userId },
  });

  const result = applyCoupon(toCouponInput(coupon), {
    amountPaise: input.amountPaise,
    planId: input.planId,
    redemptionCount: { total: coupon.redemptionCount, byUser: userRedemptions },
  });

  return { coupon, ...result };
}

export async function applyAttendanceUsage(input: {
  orgId: string;
  subscription: {
    id: string;
    orgId: string;
    branchId: string;
    memberUserId: string;
    planId: string;
    status: "PENDING_PAYMENT" | "ACTIVE" | "PAUSED" | "EXPIRED" | "CANCELLED" | "REFUNDED";
    startsAt: Date | null;
    endsAt: Date | null;
    remainingVisits: number | null;
  };
  plan: {
    id: string;
    orgId: string;
    branchId: string | null;
    name: string;
    type: "DURATION" | "VISIT_PACK" | "DATE_RANGE" | "HYBRID" | "TRIAL";
    pricePaise: number;
    durationDays: number | null;
    visitLimit: number | null;
    validityDays: number | null;
    startDate: Date | null;
    endDate: Date | null;
    active: boolean;
    publicVisible: boolean;
  };
  recordId: string;
  alreadyCheckedInToday?: boolean;
  multiEntryConsumes?: boolean;
}) {
  const existingUsage = await prisma.membershipUsage.findFirst({
    where: { orgId: input.orgId, attendanceId: input.recordId },
  });
  if (existingUsage) {
    return input.subscription;
  }
  const usageRecord = await prisma.attendanceRecord.findUnique({
    where: { id: input.recordId },
    select: { dateKey: true },
  });
  const alreadyCheckedInToday =
    input.alreadyCheckedInToday ??
    Boolean(
      usageRecord?.dateKey
        ? await prisma.attendanceRecord.findFirst({
            where: {
              orgId: input.orgId,
              subscriptionId: input.subscription.id,
              status: "APPROVED",
              id: { not: input.recordId },
              dateKey: usageRecord.dateKey,
            },
            select: { id: true },
          })
        : null,
    );
  const updated = consumeVisit(
    clean({
      id: input.subscription.id,
      orgId: input.subscription.orgId,
      branchId: input.subscription.branchId,
      memberUserId: input.subscription.memberUserId,
      planId: input.subscription.planId,
      status: input.subscription.status,
      startsAt: input.subscription.startsAt ?? undefined,
      endsAt: input.subscription.endsAt ?? undefined,
      remainingVisits: input.subscription.remainingVisits ?? undefined,
    }),
    toMembershipPlanInput(input.plan),
    clean({
      alreadyCheckedInToday,
      multiEntryConsumes: input.multiEntryConsumes,
    }),
  );
  if (updated.remainingVisits !== input.subscription.remainingVisits) {
    await prisma.memberSubscription.update({
      where: { id: input.subscription.id },
      data: clean({ remainingVisits: updated.remainingVisits }),
    });
    await prisma.membershipUsage.create({
      data: {
        orgId: input.orgId,
        subscriptionId: input.subscription.id,
        attendanceId: input.recordId,
        usedVisits: Math.max(
          (input.subscription.remainingVisits ?? 0) - (updated.remainingVisits ?? 0),
          0,
        ),
      },
    });
  }
  return updated;
}

export class PrismaAuthRepo {
  private toOtpRecord(row: {
    id: string;
    email: string;
    identifier: string;
    channel: string;
    phone: string | null;
    purpose: string;
    codeHash: string;
    attempts: number;
    maxAttempts: number;
    resendCount: number;
    ipFailureCount: number;
    lockedUntil: Date | null;
    ipAddress: string | null;
    consumedAt: Date | null;
    expiresAt: Date;
    createdAt: Date;
  }): OtpChallengeRecord {
    return clean({
      id: row.id,
      email: row.email,
      identifier: row.identifier,
      channel: row.channel === "phone" ? "phone" : "email",
      phone: row.phone ?? undefined,
      purpose: row.purpose,
      codeHash: row.codeHash,
      attempts: row.attempts,
      maxAttempts: row.maxAttempts,
      resendCount: row.resendCount,
      ipFailureCount: row.ipFailureCount,
      lockedUntil: row.lockedUntil ?? undefined,
      ipAddress: row.ipAddress ?? undefined,
      consumedAt: row.consumedAt ?? undefined,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
    }) as OtpChallengeRecord;
  }

  async createOtp(input: {
    email: string;
    identifier: string;
    channel: "email" | "phone";
    phone?: string;
    purpose: string;
    codeHash: string;
    maxAttempts: number;
    expiresAt: Date;
    consumedAt?: Date;
    ipAddress?: string;
    createdAt: Date;
  }): Promise<OtpChallengeRecord> {
    const row = await prisma.otpChallenge.create({
      data: {
        email: input.email,
        identifier: input.identifier,
        channel: input.channel,
        ...(input.phone ? { phone: input.phone } : {}),
        purpose: input.purpose,
        codeHash: input.codeHash,
        maxAttempts: input.maxAttempts,
        expiresAt: input.expiresAt,
        createdAt: input.createdAt,
        ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
        ...(input.consumedAt ? { consumedAt: input.consumedAt } : {}),
      },
    });
    return this.toOtpRecord(row);
  }

  async findLatestOtp(
    identifier: string,
    purpose = "login",
  ): Promise<OtpChallengeRecord | undefined> {
    const row = await prisma.otpChallenge.findFirst({
      where: { identifier, purpose },
      orderBy: { createdAt: "desc" },
    });
    return row ? this.toOtpRecord(row) : undefined;
  }

  async recordOtpFailure(input: { id: string; failureCount: number; lockedUntil?: Date }) {
    await prisma.otpChallenge.update({
      where: { id: input.id },
      data: {
        attempts: { increment: 1 },
        ipFailureCount: input.failureCount,
        ...(input.lockedUntil ? { lockedUntil: input.lockedUntil } : {}),
      },
    });
  }

  async refreshOtp(input: { id: string; codeHash: string; expiresAt: Date; ipAddress?: string }) {
    const row = await prisma.otpChallenge.update({
      where: { id: input.id },
      data: {
        codeHash: input.codeHash,
        expiresAt: input.expiresAt,
        attempts: 0,
        ipFailureCount: 0,
        lockedUntil: null,
        resendCount: { increment: 1 },
        createdAt: new Date(),
        ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
      },
    });
    return this.toOtpRecord(row);
  }

  async consumeOtp(id: string) {
    await prisma.otpChallenge.update({ where: { id }, data: { consumedAt: new Date() } });
  }

  async createSession(input: {
    userId: string;
    tokenHash: string;
    refreshTokenHash?: string;
    expiresAt: Date;
    refreshExpiresAt?: Date;
    userAgent?: string;
    ipAddress?: string;
    deviceFingerprintHash?: string;
  }) {
    const existingSessions = await prisma.userSession.findMany({
      where: {
        userId: input.userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true, deviceFingerprintHash: true },
      take: 50,
    });
    const isNewDevice = Boolean(
      input.deviceFingerprintHash &&
      existingSessions.length > 0 &&
      !existingSessions.some(
        (session) => session.deviceFingerprintHash === input.deviceFingerprintHash,
      ),
    );
    const session = await prisma.userSession.create({
      data: {
        ...input,
        ...(isNewDevice ? { newDeviceNotifiedAt: new Date() } : {}),
        lastSeenAt: new Date(),
      },
    });
    if (!isNewDevice) {
      return;
    }
    const notification = await prisma.notification.create({
      data: {
        createdById: input.userId,
        type: "SECURITY",
        status: "SENT",
        title: "New device signed in",
        body: "A new device signed in to your Zook account. If this was not you, sign out and contact support.",
        audience: "selected",
        sentAt: new Date(),
        metadata: clean({
          sessionId: session.id,
          deviceFingerprintHash: input.deviceFingerprintHash,
        }) as Prisma.InputJsonValue,
      },
    });
    await prisma.notificationRecipient.create({
      data: {
        notificationId: notification.id,
        userId: input.userId,
        deliveryStatus: "in_app",
        deliveredAt: new Date(),
      },
    });
  }

  async revokeSession(tokenHash: string) {
    await prisma.userSession.updateMany({
      where: { OR: [{ tokenHash }, { refreshTokenHash: tokenHash }] },
      data: { revokedAt: new Date() },
    });
  }

  async recordSecurityEvent(input: {
    action: string;
    userId?: string;
    identifier?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }) {
    await prisma.auditLog.create({
      data: clean({
        actorUserId: input.userId,
        action: input.action,
        entityType: "auth",
        entityId: input.userId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        riskLevel: "HIGH",
        metadata: clean({
          identifierHash: input.identifier ? sha256(input.identifier) : undefined,
          ...(input.metadata ?? {}),
        }) as Prisma.InputJsonValue,
      }),
    });
  }
}

export async function getReferralCodesPayload(input: {
  userId: string;
  orgId: string | undefined;
  roles: string[];
}) {
  if (!input.orgId) {
    return { referralCodes: [], rewards: [] };
  }
  const [org, policy] = await Promise.all([
    prisma.organization.findUnique({ where: { id: input.orgId }, select: { username: true } }),
    prisma.referralPolicy.upsert({
      where: { orgId: input.orgId },
      update: {},
      create: { orgId: input.orgId },
    }),
  ]);
  if (!org || !policy.enabled) {
    return { referralCodes: [], rewards: [] };
  }
  const role = input.roles.includes("TRAINER")
    ? "TRAINER"
    : input.roles.includes("RECEPTIONIST")
      ? "RECEPTIONIST"
      : input.roles.includes("ADMIN")
        ? "ADMIN"
        : "MEMBER";
  if (
    (role === "TRAINER" && !policy.trainerReferralEnabled) ||
    (role !== "TRAINER" && role !== "MEMBER" && !policy.staffReferralEnabled)
  ) {
    return { referralCodes: [], rewards: [] };
  }
  let referral = await prisma.referralCode.findFirst({
    where: {
      orgId: input.orgId,
      referrerUserId: input.userId,
      createdByRole: role,
      autoGenerated: true,
    },
    orderBy: { createdAt: "desc" },
  });
  if (!referral) {
    const expiresAt =
      policy.referralCodeExpiryDays > 0
        ? new Date(Date.now() + policy.referralCodeExpiryDays * 24 * 60 * 60 * 1000)
        : undefined;
    referral = await prisma.referralCode.create({
      data: clean({
        orgId: input.orgId,
        referrerUserId: input.userId,
        code: await generateUniqueReferralCode(input.userId),
        createdByRole: role,
        displayName: role === "TRAINER" ? "Trainer referral" : "Member referral",
        maxUses: policy.maxReferralsPerMonth,
        expiresAt,
        status: "active",
        autoGenerated: true,
        lastResetAt: new Date(),
      }),
    });
  }
  const rewards = await prisma.referralReward.findMany({
    where: { orgId: input.orgId, referrerUserId: input.userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return {
    referralCodes: [referral],
    rewards,
    links: {
      web: `/join/${org.username}?ref=${referral.code}`,
      short: `/r/${referral.code}`,
      app: `zook://r/${referral.code}`,
    },
    policy,
  };
}

export async function flagReferralAbuseIfNeeded(input: {
  orgId: string;
  referralCodeId: string;
  referredUserId: string;
}) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentCount = await prisma.referralRedemption.count({
    where: { orgId: input.orgId, referralCodeId: input.referralCodeId, createdAt: { gte: since } },
  });
  if (recentCount <= 5) return;
  await prisma.referralRedemption.update({
    where: {
      orgId_referralCodeId_referredUserId: {
        orgId: input.orgId,
        referralCodeId: input.referralCodeId,
        referredUserId: input.referredUserId,
      },
    },
    data: { suspicious: true, metadata: { redemptions24h: recentCount } },
  });
  const existingFlag = await prisma.organizationAbuseFlag.findFirst({
    where: {
      orgId: input.orgId,
      type: "referral_velocity",
      status: "open",
      createdAt: { gte: since },
    },
  });
  if (!existingFlag) {
    await prisma.organizationAbuseFlag.create({
      data: {
        orgId: input.orgId,
        userId: input.referredUserId,
        type: "referral_velocity",
        severity: "high",
        metadata: { referralCodeId: input.referralCodeId, redemptions24h: recentCount },
      },
    });
  }
  const owners = await prisma.organizationRoleAssignment.findMany({
    where: { orgId: input.orgId, role: { in: ["OWNER", "ADMIN"] } },
    select: { userId: true },
  });
  await createDirectNotification({
    orgId: input.orgId,
    type: "SECURITY",
    title: "Referral abuse signal",
    body: `${recentCount} referral redemptions were recorded in 24 hours. Review the referral dashboard.`,
    audience: "owners",
    metadata: { referralCodeId: input.referralCodeId, redemptions24h: recentCount },
    userIds: owners.map((owner) => owner.userId),
  });
}

export async function handleMembershipPayments(request: NextRequest, path: string[]) {
  async function pauseCapDaysForOrg(orgId: string) {
    const setting = await prisma.organizationSetting.findUnique({ where: { orgId } });
    const values =
      setting?.keyValues &&
      typeof setting.keyValues === "object" &&
      !Array.isArray(setting.keyValues)
        ? (setting.keyValues as Record<string, unknown>)
        : {};
    const configured = Number(
      values.membershipPauseCapDaysPerYear ?? values.pauseCapDaysPerYear ?? 30,
    );
    return Number.isFinite(configured) && configured >= 0 ? Math.floor(configured) : 30;
  }

  function wholeDaysBetween(start: Date, end: Date) {
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
  }

  function addDays(start: Date, days: number) {
    return new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
  }

  async function switchSubscriptionPlan(input: {
    request: NextRequest;
    actorUserId: string;
    subscription: Prisma.MemberSubscriptionGetPayload<object>;
    planId: string;
    effectiveAt?: Date;
  }) {
    const subscription = input.subscription;
    if (subscription.status !== "ACTIVE" && subscription.status !== "PAUSED") {
      throw validationError("Only active or paused memberships can be switched.");
    }
    const newPlan = await prisma.membershipPlan.findFirst({
      where: { id: input.planId, orgId: subscription.orgId, active: true },
    });
    if (!newPlan) {
      throw notFoundError("Membership plan not found");
    }
    if (newPlan.branchId && newPlan.branchId !== subscription.branchId) {
      throw forbiddenError("This plan belongs to another branch.");
    }
    const effectiveAt = input.effectiveAt ?? new Date();
    const window = computeSubscriptionWindow(toMembershipPlanInput(newPlan));
    const planDurationDays =
      window.endsAt && window.startsAt ? wholeDaysBetween(window.startsAt, window.endsAt) : 0;
    const unusedDays =
      subscription.endsAt && subscription.endsAt > effectiveAt
        ? wholeDaysBetween(effectiveAt, subscription.endsAt)
        : 0;
    const endsAt =
      planDurationDays > 0 ? addDays(effectiveAt, planDurationDays + unusedDays) : window.endsAt;
    const remainingVisits =
      newPlan.visitLimit !== null
        ? newPlan.visitLimit + Math.max(subscription.remainingVisits ?? 0, 0)
        : subscription.remainingVisits;
    const updated = await prisma.memberSubscription.update({
      where: { id: subscription.id },
      data: clean({
        planId: newPlan.id,
        branchId: subscription.branchId,
        status: "ACTIVE",
        startsAt: effectiveAt,
        endsAt,
        remainingVisits,
        pausedAt: null,
        resumesAt: null,
        notes: [
          subscription.notes,
          `switch:${subscription.planId}->${newPlan.id};unused_days_credit:${unusedDays}`,
        ]
          .filter(Boolean)
          .join("\n"),
      }),
    });
    await writeAuditLog({
      request: input.request,
      orgId: subscription.orgId,
      actorUserId: input.actorUserId,
      action: "membership.plan_switched",
      entityType: "member_subscription",
      entityId: subscription.id,
      metadata: {
        previousPlanId: subscription.planId,
        nextPlanId: newPlan.id,
        unusedDaysCredit: unusedDays,
        prorationPolicy: "credit_unused_days_at_new_plan_rate",
      },
    });
    return { subscription: updated, proration: { unusedDaysCredit: unusedDays } };
  }

  async function pauseSubscription(input: {
    request: NextRequest;
    actorUserId: string;
    subscription: Prisma.MemberSubscriptionGetPayload<object>;
    resumesAt: Date;
    reason?: string;
  }) {
    const subscription = input.subscription;
    if (subscription.status !== "ACTIVE") {
      throw validationError("Only active memberships can be paused.");
    }
    const now = new Date();
    if (input.resumesAt <= now) {
      throw validationError("Resume date must be in the future.");
    }
    const requestedDays = wholeDaysBetween(now, input.resumesAt);
    const capDays = await pauseCapDaysForOrg(subscription.orgId);
    if (subscription.pauseDaysUsed + requestedDays > capDays) {
      throw validationError(`Membership pause limit is ${capDays} days per year.`);
    }
    const updated = await prisma.memberSubscription.update({
      where: { id: subscription.id },
      data: clean({
        status: "PAUSED",
        pausedAt: now,
        resumesAt: input.resumesAt,
        notes: input.reason
          ? [subscription.notes, `pause_reason:${sanitizeRichText(input.reason)}`]
              .filter(Boolean)
              .join("\n")
          : subscription.notes,
      }),
    });
    await writeAuditLog({
      request: input.request,
      orgId: subscription.orgId,
      actorUserId: input.actorUserId,
      action: "membership.paused",
      entityType: "member_subscription",
      entityId: subscription.id,
      metadata: { resumesAt: input.resumesAt, requestedDays, capDays },
    });
    return { subscription: updated, pauseDaysRequested: requestedDays, capDays };
  }

  async function resumeSubscription(input: {
    request: NextRequest;
    actorUserId: string;
    subscription: Prisma.MemberSubscriptionGetPayload<object>;
  }) {
    const subscription = input.subscription;
    if (subscription.status !== "PAUSED" || !subscription.pausedAt) {
      throw validationError("Only paused memberships can be resumed.");
    }
    const now = new Date();
    const pausedDays = wholeDaysBetween(subscription.pausedAt, now);
    const updated = await prisma.memberSubscription.update({
      where: { id: subscription.id },
      data: {
        status: "ACTIVE",
        pausedAt: null,
        resumesAt: null,
        pauseDaysUsed: { increment: pausedDays },
        ...(subscription.endsAt ? { endsAt: addDays(subscription.endsAt, pausedDays) } : {}),
      },
    });
    await writeAuditLog({
      request: input.request,
      orgId: subscription.orgId,
      actorUserId: input.actorUserId,
      action: "membership.resumed",
      entityType: "member_subscription",
      entityId: subscription.id,
      metadata: { pausedDays, pauseClockExcluded: true },
    });
    return { subscription: updated, pausedDaysApplied: pausedDays };
  }

  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "subscriptions"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    await assertRateLimit(
      "paymentSessionByActor",
      `${path[1]!}:${userId}`,
      "Too many membership payment attempts.",
    );
    const orgId = path[1]!;
    const body = subscriptionCheckoutSchema.parse(await readJson(request));
    const [organization, plan, existingSubscription, approvedJoinRequest, user] = await Promise.all(
      [
        prisma.organization.findUnique({ where: { id: orgId } }),
        prisma.membershipPlan.findFirst({ where: { id: body.planId, orgId, active: true } }),
        prisma.memberSubscription.findFirst({
          where: { orgId, memberUserId: userId, status: { in: ["PENDING_PAYMENT", "ACTIVE"] } },
          orderBy: { createdAt: "desc" },
        }),
        prisma.membershipJoinRequest.findFirst({
          where: { orgId, userId, status: "approved" },
          orderBy: { reviewedAt: "desc" },
        }),
        prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      ],
    );
    if (!organization || !plan) {
      return fail("NOT_FOUND", "Plan not found", 404);
    }
    const branch = await resolveOrgBranch(orgId, plan.branchId);
    if (
      organization.status === "SUSPENDED" ||
      organization.status === "CANCELLED" ||
      organization.status === "TRIAL_EXPIRED"
    ) {
      throw forbiddenError("This gym is not accepting new membership purchases right now.");
    }
    if (existingSubscription) {
      throw conflictError("You already have a membership in progress for this gym.");
    }
    await assertSaasMemberCapacity(orgId, userId);
    const referral = await resolveValidatedReferral({
      orgId,
      userId,
      ctx,
      ...(body.referralCode ? { referralCode: body.referralCode } : {}),
    });
    if (organization.joinMode === "APPROVAL_REQUIRED" && !approvedJoinRequest) {
      throw forbiddenError("This gym requires approval before payment.");
    }
    if (organization.joinMode === "INVITE_ONLY" && !referral) {
      throw forbiddenError("Invite-only gyms require a valid referral or invite code.");
    }
    const pricing = await resolveValidatedCoupon({
      orgId,
      userId,
      planId: plan.id,
      amountPaise: plan.pricePaise,
      ...(body.couponCode ? { couponCode: body.couponCode } : {}),
      ...(referral?.couponId ? { fallbackCouponId: referral.couponId } : {}),
    });
    const offerPricing = await resolveActiveOffer({
      orgId,
      planId: plan.id,
      amountPaise: plan.pricePaise,
    });
    const referralPricing = await resolveReferralPricing({
      orgId,
      amountPaise: plan.pricePaise,
      couponDiscountPaise: pricing.discountPaise + offerPricing.discountPaise,
      ...(referral ? { referralCodeId: referral.id } : {}),
    });
    const subscription = await prisma.memberSubscription.create({
      data: {
        orgId,
        branchId: branch.id,
        memberUserId: userId,
        planId: plan.id,
        status: "PENDING_PAYMENT",
      },
    });
    const session = await prisma.paymentSession.create({
      data: {
        orgId,
        branchId: branch.id,
        userId,
        purpose: "MEMBERSHIP",
        amountPaise: referralPricing.finalAmountPaise,
        status: "CREATED",
        checkoutUrl: "",
        provider: getPaymentProviderDiagnostics().selectedProvider,
        metadata: clean({
          branchId: branch.id,
          subscriptionId: subscription.id,
          offerId: offerPricing.offer?.id,
          offerDiscountPaise: offerPricing.discountPaise,
          couponId: pricing.coupon?.id,
          couponDiscountPaise: pricing.discountPaise,
          referralCodeId: referral?.id,
          referralDiscountPaise: referralPricing.referralDiscountPaise,
          joinRequestId: approvedJoinRequest?.id,
        }) as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
    if (session.amountPaise === 0) {
      const processed = await applyPaymentSessionStatus({
        sessionId: session.id,
        nextStatus: "SUCCEEDED",
        provider: "internal",
        providerRef: `zero_${session.id}`,
        paymentMode: "OTHER",
        expectedAmountPaise: 0,
        createNotification: createDirectNotification,
        ensureMembership: (membershipInput, tx) =>
          tx
            ? ensureOrganizationMembershipWithClient(tx, membershipInput)
            : ensureOrganizationMembership(membershipInput),
      });
      const activatedSubscription = await prisma.memberSubscription.findUnique({
        where: { id: subscription.id },
      });
      return ok({
        subscription: activatedSubscription ?? subscription,
        checkoutUrl: `/checkout/${processed.session.id}`,
        checkoutData: null,
        session: processed.session,
      });
    }
    getPaymentProviderOrThrow();
    let started;
    try {
      started = await startPaymentSessionCheckout({
        session,
        customer: clean({
          name: user.name,
          email: publicUserEmail(user.email),
          phone: user.phone ?? undefined,
        }),
      });
    } catch (error) {
      await prisma.$transaction([
        prisma.paymentSession.update({
          where: { id: session.id },
          data: { status: "FAILED", completedAt: new Date() },
        }),
        prisma.memberSubscription.update({
          where: { id: subscription.id },
          data: { status: "CANCELLED" },
        }),
      ]);
      throw error;
    }
    return ok({
      subscription,
      checkoutUrl: started.checkoutUrl,
      checkoutData: started.checkout.checkoutData ?? null,
      session: started.session,
    });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "memberships", /.+/, "renew"])) {
    const subscriptionId = path[2]!;
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const body = subscriptionRenewSchema.parse(await readJson(request).catch(() => ({})));
    await assertRateLimit(
      "paymentSessionByActor",
      `renew:${subscriptionId}:${userId}`,
      "Too many membership renewal attempts.",
    );
    const currentSubscription = await prisma.memberSubscription.findFirst({
      where: { id: subscriptionId, memberUserId: userId },
    });
    if (!currentSubscription) {
      throw notFoundError("Membership not found");
    }
    const orgId = currentSubscription.orgId;
    assertActiveContextOrg(ctx, orgId);
    const [organization, currentPlan, selectedPlan, pendingRenewal, user] = await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId } }),
      prisma.membershipPlan.findFirst({ where: { id: currentSubscription.planId, orgId } }),
      body.planId
        ? prisma.membershipPlan.findFirst({ where: { id: body.planId, orgId, active: true } })
        : Promise.resolve(null),
      prisma.memberSubscription.findFirst({
        where: {
          orgId,
          memberUserId: userId,
          status: "PENDING_PAYMENT",
          notes: { contains: `renewal:${subscriptionId}` },
        },
      }),
      prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    ]);
    const plan = selectedPlan ?? currentPlan;
    if (!organization || !plan) {
      throw notFoundError("Renewal plan not found");
    }
    if (pendingRenewal) {
      throw conflictError("You already have a renewal payment in progress.");
    }
    const referral = await resolveValidatedReferral({
      orgId,
      userId,
      ctx,
      ...(body.referralCode ? { referralCode: body.referralCode } : {}),
    });
    const pricing = await resolveValidatedCoupon({
      orgId,
      userId,
      planId: plan.id,
      amountPaise: plan.pricePaise,
      ...(body.couponCode ? { couponCode: body.couponCode } : {}),
      ...(referral?.couponId ? { fallbackCouponId: referral.couponId } : {}),
    });
    const offerPricing = await resolveActiveOffer({
      orgId,
      planId: plan.id,
      amountPaise: plan.pricePaise,
    });
    const referralPricing = await resolveReferralPricing({
      orgId,
      amountPaise: plan.pricePaise,
      couponDiscountPaise: pricing.discountPaise + offerPricing.discountPaise,
      ...(referral ? { referralCodeId: referral.id } : {}),
    });
    const branch = await resolveOrgBranch(orgId, plan.branchId ?? currentSubscription.branchId);
    const subscription = await prisma.memberSubscription.create({
      data: {
        orgId,
        branchId: branch.id,
        memberUserId: userId,
        planId: plan.id,
        status: "PENDING_PAYMENT",
        notes: `renewal:${subscriptionId}`,
      },
    });
    const session = await prisma.paymentSession.create({
      data: {
        orgId,
        branchId: branch.id,
        userId,
        purpose: "MEMBERSHIP",
        amountPaise: referralPricing.finalAmountPaise,
        status: "CREATED",
        checkoutUrl: "",
        provider: getPaymentProviderDiagnostics().selectedProvider,
        metadata: clean({
          branchId: branch.id,
          subscriptionId: subscription.id,
          renewalOfSubscriptionId: subscriptionId,
          offerId: offerPricing.offer?.id,
          offerDiscountPaise: offerPricing.discountPaise,
          couponId: pricing.coupon?.id,
          couponDiscountPaise: pricing.discountPaise,
          referralCodeId: referral?.id,
          referralDiscountPaise: referralPricing.referralDiscountPaise,
        }) as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
    if (session.amountPaise === 0) {
      const processed = await applyPaymentSessionStatus({
        sessionId: session.id,
        nextStatus: "SUCCEEDED",
        provider: "internal",
        providerRef: `zero_${session.id}`,
        paymentMode: "OTHER",
        expectedAmountPaise: 0,
        createNotification: createDirectNotification,
        ensureMembership: (membershipInput, tx) =>
          tx
            ? ensureOrganizationMembershipWithClient(tx, membershipInput)
            : ensureOrganizationMembership(membershipInput),
      });
      const activatedSubscription = await prisma.memberSubscription.findUnique({
        where: { id: subscription.id },
      });
      return ok({
        subscription: activatedSubscription ?? subscription,
        checkoutUrl: `/checkout/${processed.session.id}`,
        checkoutData: null,
        session: processed.session,
      });
    }
    getPaymentProviderOrThrow();
    let started;
    try {
      started = await startPaymentSessionCheckout({
        session,
        customer: clean({
          name: user.name,
          email: publicUserEmail(user.email),
          phone: user.phone ?? undefined,
        }),
      });
    } catch (error) {
      await prisma.$transaction([
        prisma.paymentSession.update({
          where: { id: session.id },
          data: { status: "FAILED", completedAt: new Date() },
        }),
        prisma.memberSubscription.update({
          where: { id: subscription.id },
          data: { status: "CANCELLED" },
        }),
      ]);
      throw error;
    }
    return ok({
      subscription,
      checkoutUrl: started.checkoutUrl,
      checkoutData: started.checkout.checkoutData ?? null,
      session: started.session,
    });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "memberships", /.+/, "autopay"])) {
    const subscriptionId = path[2]!;
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const body = membershipAutopaySchema.parse(await readJson(request).catch(() => ({})));
    await assertRateLimit(
      "paymentSessionByActor",
      `autopay:${subscriptionId}:${userId}`,
      "Too many autopay setup attempts.",
    );
    const currentSubscription = await prisma.memberSubscription.findFirst({
      where: { id: subscriptionId, memberUserId: userId },
    });
    if (!currentSubscription) {
      throw notFoundError("Membership not found");
    }
    if (currentSubscription.status !== "ACTIVE") {
      throw validationError("Autopay can only be enabled for an active membership.");
    }
    const orgId = currentSubscription.orgId;
    assertActiveContextOrg(ctx, orgId);
    const [organization, currentPlan, selectedPlan, user, existingMandate] = await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId } }),
      prisma.membershipPlan.findFirst({ where: { id: currentSubscription.planId, orgId } }),
      body.planId
        ? prisma.membershipPlan.findFirst({ where: { id: body.planId, orgId, active: true } })
        : Promise.resolve(null),
      prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      prisma.paymentMandate.findFirst({
        where: {
          orgId,
          userId,
          status: { in: liveMandateStatuses },
          OR: [
            { sourceSubscriptionId: subscriptionId },
            { latestSubscriptionId: subscriptionId },
            { latestSubscriptionId: currentSubscription.id },
          ],
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    const plan = selectedPlan ?? currentPlan;
    if (!organization || !plan) {
      throw notFoundError("Autopay plan not found");
    }
    if (
      organization.status === "SUSPENDED" ||
      organization.status === "CANCELLED" ||
      organization.status === "TRIAL_EXPIRED"
    ) {
      throw forbiddenError("This gym is not accepting autopay setup right now.");
    }
    if (existingMandate) {
      return ok({
        mandate: existingMandate,
        checkoutUrl: existingMandate.checkoutUrl,
        session: null,
      });
    }

    const provider = getPaymentProviderOrThrow();
    const cadence = deriveAutopayBillingCadence(plan);
    const mandate = await prisma.paymentMandate.create({
      data: {
        orgId,
        userId,
        planId: plan.id,
        sourceSubscriptionId: currentSubscription.id,
        latestSubscriptionId: currentSubscription.id,
        provider: provider.providerName,
        status: "CREATED",
        amountPaise: plan.pricePaise,
        currency: plan.currency,
        billingPeriod: cadence.billingPeriod,
        billingInterval: cadence.billingInterval,
        totalCount: 120,
        metadata: clean({
          sourceSubscriptionId: currentSubscription.id,
          planId: plan.id,
        }) as Prisma.InputJsonValue,
      },
    });

    if (provider.providerName === "mock") {
      const created = await provider.createMandate({
        orgId,
        userId,
        amountPaise: plan.pricePaise,
        currency: "INR",
        referenceId: mandate.id,
        planName: plan.name,
        billingPeriod: cadence.billingPeriod,
        billingInterval: cadence.billingInterval,
        totalCount: 120,
        metadata: {
          autopayMandateId: mandate.id,
          sourceSubscriptionId: currentSubscription.id,
          planId: plan.id,
        },
      });
      const updated = await prisma.paymentMandate.update({
        where: { id: mandate.id },
        data: clean({
          status: providerMandateStatusToLocal(created.status),
          providerMandateId: created.mandateId,
          providerPlanId: created.providerPlanId,
          paidCount: created.paidCount,
          totalCount: created.totalCount,
          activatedAt: new Date(),
        }),
      });
      return ok({ mandate: updated, checkoutUrl: null, session: null });
    }

    const session = await prisma.paymentSession.create({
      data: {
        orgId,
        branchId: currentSubscription.branchId,
        userId,
        purpose: "MEMBERSHIP",
        amountPaise: plan.pricePaise,
        currency: plan.currency,
        status: "CREATED",
        checkoutUrl: "",
        provider: provider.providerName,
        metadata: clean({
          autopayMandateId: mandate.id,
          sourceSubscriptionId: currentSubscription.id,
          planId: plan.id,
        }) as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    let createdMandate;
    try {
      const startAt =
        currentSubscription.endsAt && currentSubscription.endsAt.getTime() > Date.now()
          ? currentSubscription.endsAt
          : undefined;
      createdMandate = await provider.createMandate({
        orgId,
        userId,
        amountPaise: plan.pricePaise,
        currency: "INR",
        referenceId: session.id,
        planName: plan.name,
        description: `${organization.name} ${plan.name} autopay`,
        billingPeriod: cadence.billingPeriod,
        billingInterval: cadence.billingInterval,
        totalCount: 120,
        ...(startAt ? { startAt } : {}),
        returnUrl: `/checkout/${session.id}`,
        customer: clean({
          name: user.name,
          email: publicUserEmail(user.email),
          phone: user.phone ?? undefined,
        }),
        metadata: {
          autopayMandateId: mandate.id,
          sourceSubscriptionId: currentSubscription.id,
          planId: plan.id,
          paymentSessionId: session.id,
        },
      });
    } catch (error) {
      await prisma.$transaction([
        prisma.paymentSession.update({
          where: { id: session.id },
          data: { status: "FAILED", completedAt: new Date() },
        }),
        prisma.paymentMandate.update({
          where: { id: mandate.id },
          data: { status: "FAILED" },
        }),
      ]);
      throw error;
    }

    const hostedCheckoutUrl = `/checkout/${session.id}`;
    const [updatedMandate, updatedSession] = await prisma.$transaction([
      prisma.paymentMandate.update({
        where: { id: mandate.id },
        data: clean({
          status: providerMandateStatusToLocal(createdMandate.status),
          providerMandateId: createdMandate.mandateId,
          providerPlanId: createdMandate.providerPlanId,
          checkoutUrl: hostedCheckoutUrl,
          currentStartAt: createdMandate.currentStartAt,
          currentEndAt: createdMandate.currentEndAt,
          nextChargeAt: createdMandate.nextChargeAt,
          paidCount: createdMandate.paidCount,
          totalCount: createdMandate.totalCount,
        }),
      }),
      prisma.paymentSession.update({
        where: { id: session.id },
        data: {
          provider: provider.providerName,
          providerRef: createdMandate.mandateId,
          checkoutUrl: hostedCheckoutUrl,
          status: "CREATED",
          metadata: {
            ...getObjectMetadata(session.metadata),
            providerCheckoutData: createdMandate.checkoutData ?? null,
          } as Prisma.InputJsonValue,
        },
      }),
    ]);

    return ok({
      mandate: updatedMandate,
      checkoutUrl: hostedCheckoutUrl,
      checkoutData: createdMandate.checkoutData ?? null,
      session: updatedSession,
    });
  }
  if (
    request.method === "POST" &&
    (pathMatches(path, ["me", "subscriptions", /.+/, "switch"]) ||
      pathMatches(path, ["me", "memberships", /.+/, "switch"]))
  ) {
    const subscriptionId = path[2]!;
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const body = subscriptionSwitchSchema.parse(await readJson(request));
    await assertRateLimit(
      "subscriptionChangeByActor",
      `switch:${subscriptionId}:${userId}`,
      "Too many membership switch attempts.",
    );
    const subscription = await prisma.memberSubscription.findFirst({
      where: { id: subscriptionId, memberUserId: userId },
    });
    if (!subscription) {
      throw notFoundError("Membership not found");
    }
    assertActiveContextOrg(ctx, subscription.orgId);
    const result = await switchSubscriptionPlan({
      request,
      actorUserId: userId,
      subscription,
      planId: body.planId,
      ...(body.effectiveAt ? { effectiveAt: new Date(body.effectiveAt) } : {}),
    });
    return ok(result);
  }
  if (
    request.method === "POST" &&
    (pathMatches(path, ["me", "subscriptions", /.+/, "pause"]) ||
      pathMatches(path, ["me", "memberships", /.+/, "pause"]))
  ) {
    const subscriptionId = path[2]!;
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const body = subscriptionPauseSchema.parse(await readJson(request));
    const subscription = await prisma.memberSubscription.findFirst({
      where: { id: subscriptionId, memberUserId: userId },
    });
    if (!subscription) {
      throw notFoundError("Membership not found");
    }
    assertActiveContextOrg(ctx, subscription.orgId);
    return ok(
      await pauseSubscription({
        request,
        actorUserId: userId,
        subscription,
        resumesAt: new Date(body.resumesAt),
        ...(body.reason ? { reason: body.reason } : {}),
      }),
    );
  }
  if (
    request.method === "POST" &&
    (pathMatches(path, ["me", "subscriptions", /.+/, "resume"]) ||
      pathMatches(path, ["me", "memberships", /.+/, "resume"]))
  ) {
    const subscriptionId = path[2]!;
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const subscription = await prisma.memberSubscription.findFirst({
      where: { id: subscriptionId, memberUserId: userId },
    });
    if (!subscription) {
      throw notFoundError("Membership not found");
    }
    assertActiveContextOrg(ctx, subscription.orgId);
    return ok(await resumeSubscription({ request, actorUserId: userId, subscription }));
  }
  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "subscriptions", /.+/, "switch"])
  ) {
    const orgId = path[1]!;
    const subscriptionId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "MEMBERSHIP_SUBSCRIPTION_MANAGE");
    await assertRateLimit(
      "subscriptionChangeByActor",
      `org-switch:${orgId}:${subscriptionId}:${userId}`,
      "Too many membership switch attempts.",
    );
    const body = subscriptionSwitchSchema.parse(await readJson(request));
    const subscription = await prisma.memberSubscription.findFirst({
      where: { id: subscriptionId, orgId },
    });
    if (!subscription) {
      throw notFoundError("Membership not found");
    }
    await assertBranchAccessForContext(ctx, orgId, subscription.branchId);
    return ok(
      await switchSubscriptionPlan({
        request,
        actorUserId: userId,
        subscription,
        planId: body.planId,
        ...(body.effectiveAt ? { effectiveAt: new Date(body.effectiveAt) } : {}),
      }),
    );
  }
  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "subscriptions", /.+/, "pause"])
  ) {
    const orgId = path[1]!;
    const subscriptionId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "MEMBERSHIP_SUBSCRIPTION_MANAGE");
    const body = subscriptionPauseSchema.parse(await readJson(request));
    const subscription = await prisma.memberSubscription.findFirst({
      where: { id: subscriptionId, orgId },
    });
    if (!subscription) {
      throw notFoundError("Membership not found");
    }
    await assertBranchAccessForContext(ctx, orgId, subscription.branchId);
    return ok(
      await pauseSubscription({
        request,
        actorUserId: userId,
        subscription,
        resumesAt: new Date(body.resumesAt),
        ...(body.reason ? { reason: body.reason } : {}),
      }),
    );
  }
  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "subscriptions", /.+/, "resume"])
  ) {
    const orgId = path[1]!;
    const subscriptionId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "MEMBERSHIP_SUBSCRIPTION_MANAGE");
    const subscription = await prisma.memberSubscription.findFirst({
      where: { id: subscriptionId, orgId },
    });
    if (!subscription) {
      throw notFoundError("Membership not found");
    }
    await assertBranchAccessForContext(ctx, orgId, subscription.branchId);
    return ok(await resumeSubscription({ request, actorUserId: userId, subscription }));
  }
  if (request.method === "DELETE" && pathMatches(path, ["me", "memberships", /.+/, "autopay"])) {
    const subscriptionId = path[2]!;
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    await assertRateLimit(
      "subscriptionChangeByActor",
      `autopay-cancel:${subscriptionId}:${userId}`,
      "Too many autopay cancellation attempts.",
    );
    const currentSubscription = await prisma.memberSubscription.findFirst({
      where: { id: subscriptionId, memberUserId: userId },
    });
    if (!currentSubscription) {
      throw notFoundError("Membership not found");
    }
    const orgId = currentSubscription.orgId;
    assertActiveContextOrg(ctx, orgId);
    const mandate = await prisma.paymentMandate.findFirst({
      where: {
        orgId,
        userId,
        status: { in: liveMandateStatuses },
        OR: [{ sourceSubscriptionId: subscriptionId }, { latestSubscriptionId: subscriptionId }],
      },
      orderBy: { createdAt: "desc" },
    });
    if (!mandate) {
      throw notFoundError("Autopay mandate not found");
    }
    const provider = getPaymentProviderOrThrow();
    let nextStatus: PaymentMandateStatus = "CANCELLED";
    if (mandate.providerMandateId && mandate.provider === provider.providerName) {
      const cancellation = await provider.cancelMandate({
        mandateId: mandate.providerMandateId,
        reason: "member_requested",
        cancelAtCycleEnd: false,
      });
      nextStatus = providerMandateStatusToLocal(cancellation.status);
    }
    const updated = await prisma.paymentMandate.update({
      where: { id: mandate.id },
      data: {
        status: nextStatus,
        cancelledAt: new Date(),
      },
    });
    return ok({ mandate: updated });
  }
  return undefined;
}

export async function handleStaffPlansGoals(request: NextRequest, path: string[]) {
  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "shop", "orders", /.+/, "manual-payment"])
  ) {
    const orgId = path[1]!;
    const shopOrderId = path[4]!;
    const payload = (await readJson(request)) as Record<string, unknown>;
    return handleManualPaymentRequest(request, orgId, {
      ...payload,
      purpose: "SHOP_ORDER",
      shopOrderId,
    });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "manual-payments"])) {
    const orgId = path[1]!;
    return handleManualPaymentRequest(request, orgId, await readJson(request));
  }
  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "manual-payments", "general"])
  ) {
    const orgId = path[1]!;
    const payload = (await readJson(request)) as Record<string, unknown>;
    return handleManualPaymentRequest(request, orgId, {
      ...payload,
      purpose: "OTHER",
    });
  }

  async function handleManualPaymentRequest(request: NextRequest, orgId: string, rawBody: unknown) {
    const ctx = await getRequestContext(request, { orgId });
    const userId = assertManualPaymentRecordContext(ctx, orgId);
    await assertRateLimit(
      "manualPaymentByActorOrg",
      `${orgId}:${userId}`,
      "Too many manual payments from this account today.",
    );
    const body = manualMembershipPaymentSchema.parse(rawBody);
    const proofAsset = await getOrganizationScopedFileAsset(body.proofAssetId, orgId, [
      "payment_proof",
    ]);
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      throw notFoundError("Organization not found");
    }

    if (body.purpose === "SHOP_ORDER") {
      const shopOrderId = body.shopOrderId!;
      const order = await prisma.shopOrder.findFirst({ where: { id: shopOrderId, orgId } });
      if (!order) {
        throw notFoundError("Shop order not found");
      }
      await assertBranchAccessForContext(ctx, orgId, order.branchId);
      if (order.paymentId || order.status !== "PENDING_PAYMENT") {
        throw conflictError("This shop order cannot be paid at the desk.");
      }
      const payment = await prisma.payment.create({
        data: clean({
          orgId,
          branchId: order.branchId,
          userId: order.userId,
          purpose: "SHOP_ORDER",
          amountPaise: body.amountPaise,
          status: "SUCCEEDED",
          mode: body.mode,
          proofAssetId: proofAsset?.id,
          receiptNumber: body.receiptNumber,
          notes: body.notes,
          recordedById: userId,
          recordedAt: new Date(),
        }),
      });
      const updatedOrder = await prisma.shopOrder.update({
        where: { id: order.id },
        data: {
          paymentId: payment.id,
          status: order.status === "PENDING_PAYMENT" ? "READY_FOR_PICKUP" : order.status,
        },
      });
      await createDirectNotification({
        orgId,
        createdById: userId,
        type: "TRANSACTIONAL",
        title: "Order ready for pickup",
        body: "Your desk payment is recorded. Your order is ready for pickup at the gym.",
        audience: "selected_member",
        userIds: [order.userId],
        metadata: clean({ paymentId: payment.id, shopOrderId: order.id }),
      });
      await writeAuditLog({
        request,
        orgId,
        actorUserId: userId,
        action: "payment.shop_manual_recorded",
        entityType: "payment",
        entityId: payment.id,
        metadata: { shopOrderId: order.id, amountPaise: payment.amountPaise, mode: payment.mode },
      });
      const orderUser = await prisma.user.findUnique({ where: { id: order.userId } });
      await ensurePaymentInvoiceDocument({ org, payment, user: orderUser });
      return ok({ payment, order: updatedOrder });
    }

    if (body.purpose === "OTHER") {
      const branchId = await assertBranchAccessForContext(ctx, orgId, undefined);
      const payment = await prisma.payment.create({
        data: clean({
          orgId,
          branchId,
          purpose: "OTHER",
          amountPaise: body.amountPaise,
          status: "SUCCEEDED",
          mode: body.mode,
          proofAssetId: proofAsset?.id,
          receiptNumber: body.receiptNumber,
          notes: body.notes,
          recordedById: userId,
          recordedAt: new Date(),
          metadata: { description: body.description },
        }),
      });
      await writeAuditLog({
        request,
        orgId,
        actorUserId: userId,
        action: "payment.general_manual_recorded",
        entityType: "payment",
        entityId: payment.id,
        metadata: { amountPaise: payment.amountPaise, mode: payment.mode },
      });
      await ensurePaymentInvoiceDocument({ org, payment, user: null });
      return ok({ payment });
    }

    const memberUserId = body.memberUserId!;
    const memberUser = await prisma.user.findUnique({ where: { id: memberUserId } });
    if (!memberUser) {
      throw notFoundError("Member not found");
    }
    await assertOrgUser({ orgId, userId: memberUserId, role: "MEMBER" });
    const deskBranchId = await assertBranchAccessForContext(ctx, orgId, undefined);
    const basePaymentData = clean({
      orgId,
      userId: memberUserId,
      purpose: "MEMBERSHIP",
      amountPaise: body.amountPaise,
      status: "SUCCEEDED",
      mode: body.mode,
      proofAssetId: proofAsset?.id,
      receiptNumber: body.receiptNumber,
      notes: body.notes,
      recordedById: userId,
      recordedAt: new Date(),
    });
    let payment: Awaited<ReturnType<typeof prisma.payment.create>>;
    let subscription = null as Awaited<ReturnType<typeof prisma.memberSubscription.create>> | null;
    if (body.subscriptionId) {
      const existingSubscription = await prisma.memberSubscription.findFirst({
        where: { id: body.subscriptionId, orgId, memberUserId },
      });
      if (!existingSubscription) {
        throw notFoundError("Subscription not found");
      }
      if (
        deskBranchId &&
        existingSubscription.branchId &&
        existingSubscription.branchId !== deskBranchId
      ) {
        throw forbiddenError("This membership belongs to another branch.");
      }
      if (existingSubscription.status === "ACTIVE") {
        throw conflictError("Subscription is already active");
      }
      const plan = await prisma.membershipPlan.findFirst({
        where: { id: existingSubscription.planId, orgId },
      });
      if (!plan) {
        throw notFoundError("Membership plan not found");
      }
      try {
        validateManualMembershipPaymentAmount({
          amountPaise: body.amountPaise,
          expectedAmountPaise: plan.pricePaise,
        });
      } catch {
        throw validationError(
          `Manual membership payments must be within Rs ${(MANUAL_MEMBERSHIP_PAYMENT_TOLERANCE_PAISE / 100).toFixed(2)} of the plan price.`,
        );
      }
      const window = computeSubscriptionWindow(
        clean({
          id: plan.id,
          orgId: plan.orgId,
          branchId: plan.branchId ?? undefined,
          name: plan.name,
          type: plan.type,
          pricePaise: plan.pricePaise,
          durationDays: plan.durationDays ?? undefined,
          visitLimit: plan.visitLimit ?? undefined,
          validityDays: plan.validityDays ?? undefined,
          startDate: plan.startDate ?? undefined,
          endDate: plan.endDate ?? undefined,
          active: plan.active,
          publicVisible: plan.publicVisible,
        }),
      );
      payment = await prisma.payment.create({
        data: clean({
          ...basePaymentData,
          branchId: existingSubscription.branchId ?? deskBranchId,
        }),
      });
      subscription = await prisma.memberSubscription.update({
        where: { id: existingSubscription.id },
        data: clean({
          branchId: existingSubscription.branchId ?? deskBranchId,
          status: "ACTIVE",
          startsAt: window.startsAt,
          endsAt: window.endsAt,
          remainingVisits: window.remainingVisits,
          paymentId: payment.id,
          activatedById: userId,
        }),
      });
    } else {
      const planId = body.planId;
      if (!planId) {
        throw validationError("A plan is required for manual membership activation.");
      }
      const plan = await prisma.membershipPlan.findFirst({
        where: { id: planId, orgId, active: true },
      });
      if (!plan) {
        throw notFoundError("Membership plan not found");
      }
      if (deskBranchId && plan.branchId && plan.branchId !== deskBranchId) {
        throw forbiddenError("This plan belongs to another branch.");
      }
      try {
        validateManualMembershipPaymentAmount({
          amountPaise: body.amountPaise,
          expectedAmountPaise: plan.pricePaise,
        });
      } catch {
        throw validationError(
          `Manual membership payments must be within Rs ${(MANUAL_MEMBERSHIP_PAYMENT_TOLERANCE_PAISE / 100).toFixed(2)} of the plan price.`,
        );
      }
      const branch = await resolveOrgBranch(orgId, deskBranchId ?? plan.branchId);
      const window = computeSubscriptionWindow(
        clean({
          id: plan.id,
          orgId: plan.orgId,
          branchId: branch.id,
          name: plan.name,
          type: plan.type,
          pricePaise: plan.pricePaise,
          durationDays: plan.durationDays ?? undefined,
          visitLimit: plan.visitLimit ?? undefined,
          validityDays: plan.validityDays ?? undefined,
          startDate: plan.startDate ?? undefined,
          endDate: plan.endDate ?? undefined,
          active: plan.active,
          publicVisible: plan.publicVisible,
        }),
      );
      payment = await prisma.payment.create({
        data: clean({ ...basePaymentData, branchId: branch.id }),
      });
      subscription = await prisma.memberSubscription.create({
        data: clean({
          orgId,
          branchId: branch.id,
          memberUserId,
          planId: plan.id,
          status: "ACTIVE",
          startsAt: window.startsAt,
          endsAt: window.endsAt,
          remainingVisits: window.remainingVisits,
          paymentId: payment.id,
          activatedById: userId,
        }),
      });
    }
    await ensureOrganizationMembership({
      orgId,
      userId: memberUserId,
      profilePhotoUrl: memberUser.profilePhotoUrl,
      marketingOptIn: memberUser.marketingOptIn,
    });
    await createDirectNotification({
      orgId,
      createdById: userId,
      type: "TRANSACTIONAL",
      title: "Membership activated",
      body: "Your membership has been activated with an offline payment record.",
      audience: "selected_member",
      userIds: [memberUserId],
      metadata: clean({ paymentId: payment.id, subscriptionId: subscription?.id }),
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "payment.manual_recorded",
      entityType: "payment",
      entityId: payment.id,
      metadata: { amountPaise: payment.amountPaise, mode: payment.mode },
    });
    await ensurePaymentInvoiceDocument({ org, payment, user: memberUser });
    return ok({ payment, subscription });
  }
  if (
    request.method === "PATCH" &&
    pathMatches(path, ["orgs", /.+/, "trainers", /.+/, "profile"])
  ) {
    const orgId = path[1]!;
    const trainerUserId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const actorUserId = requireAuth(ctx);
    if (actorUserId === trainerUserId) {
      requireOrgPermission(ctx, orgId, "PLANS_CREATE");
    } else {
      requireOrgPermission(ctx, orgId, "TRAINERS_MANAGE");
    }
    const body = trainerProfileAssetSchema.parse(await readJson(request));
    const upiQrAsset = await getOrganizationScopedFileAsset(body.upiQrAssetId, orgId, [
      "trainer_upi_qr",
    ]);
    const profile = await prisma.trainerProfile.upsert({
      where: { orgId_userId: { orgId, userId: trainerUserId } },
      update: clean({
        ...(body.bio !== undefined ? { bio: body.bio } : {}),
        ...(body.upiId !== undefined ? { upiId: body.upiId } : {}),
        ...(upiQrAsset ? { upiQrAssetId: upiQrAsset.id } : {}),
      }),
      create: clean({
        orgId,
        userId: trainerUserId,
        ...(body.bio ? { bio: body.bio } : {}),
        ...(body.upiId ? { upiId: body.upiId } : {}),
        ...(upiQrAsset ? { upiQrAssetId: upiQrAsset.id } : {}),
      }),
    });
    return ok({ profile, upiQrFile: upiQrAsset });
  }
  if (
    request.method === "PATCH" &&
    pathMatches(path, ["orgs", /.+/, "trainers", /.+/, "clients", /.+/, "note"])
  ) {
    const orgId = path[1]!;
    const trainerId = path[3]!;
    const clientId = path[5]!;
    const ctx = await getRequestContext(request, { orgId });
    const requesterId = requireAuth(ctx);
    if (requesterId === trainerId) {
      requireOrgPermission(ctx, orgId, "PLANS_CREATE");
    } else {
      requireOrgPermission(ctx, orgId, "MEMBERS_VIEW");
    }
    const assignment = await prisma.trainerAssignment.findFirst({
      where: { orgId, trainerUserId: trainerId, memberUserId: clientId, active: true },
    });
    if (!assignment) {
      throw notFoundError("Trainer client not found");
    }
    const body = trainerClientNoteSchema.parse(await readJson(request));
    const currentProfile = await prisma.memberProfile.findUnique({
      where: { orgId_userId: { orgId, userId: clientId } },
    });
    const nextNotes = {
      ...parseMemberProfileNotes(currentProfile?.notes),
      trainerNote: sanitizeRichText(body.note.trim()) || undefined,
    };
    const profile = await prisma.memberProfile.upsert({
      where: { orgId_userId: { orgId, userId: clientId } },
      update: { notes: JSON.stringify(nextNotes) },
      create: { orgId, userId: clientId, notes: JSON.stringify(nextNotes) },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: requesterId,
      action: "trainer.client_note.updated",
      entityType: "member_profile",
      entityId: profile.id,
      metadata: { trainerUserId: trainerId, memberUserId: clientId },
    });
    return ok({ note: body.note });
  }
  if (
    request.method === "GET" &&
    pathMatches(path, ["orgs", /.+/, "trainers", /.+/, "payout-config"])
  ) {
    const orgId = path[1]!;
    const trainerId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const requesterId = requireAuth(ctx);
    if (requesterId === trainerId) {
      requireOrgPermission(ctx, orgId, "PT_RECORD");
    } else {
      requireOrgPermission(ctx, orgId, "TRAINERS_MANAGE");
    }
    await assertOrgUser({ orgId, userId: trainerId, role: "TRAINER" });
    return ok({ config: await getPayoutConfig(orgId, trainerId) });
  }
  if (
    request.method === "GET" &&
    pathMatches(path, ["orgs", /.+/, "trainers", /.+/, "payouts"])
  ) {
    const orgId = path[1]!;
    const trainerId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const requesterId = requireAuth(ctx);
    if (requesterId === trainerId) {
      requireOrgPermission(ctx, orgId, "PT_RECORD");
    } else {
      requireOrgPermission(ctx, orgId, "TRAINERS_MANAGE");
    }
    const month = request.nextUrl.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
    const payouts = await listPayouts(orgId, month);
    return ok({ payouts: payouts.filter((payout) => payout.trainerId === trainerId) });
  }
  if (
    request.method === "PUT" &&
    pathMatches(path, ["orgs", /.+/, "trainers", /.+/, "payout-config"])
  ) {
    const orgId = path[1]!;
    const trainerId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "TRAINERS_MANAGE");
    await assertOrgUser({ orgId, userId: trainerId, role: "TRAINER" });
    const body = payoutConfigSchema.parse(await readJson(request));
    const config = await upsertPayoutConfig(orgId, trainerId, body);
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "trainer.payout_config.updated",
      entityType: "trainer_payout_config",
      entityId: config.id,
      metadata: { trainerId },
    });
    return ok({ config });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "payouts"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "TRAINERS_MANAGE");
    const month = request.nextUrl.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
    return ok({ payouts: await listPayouts(orgId, month) });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "payouts", /.+/, "adjust"])) {
    const orgId = path[1]!;
    const payoutId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "TRAINERS_MANAGE");
    const body = payoutAdjustmentSchema.parse(await readJson(request));
    const line = await addPayoutAdjustment({
      orgId,
      payoutId,
      amountPaise: body.amountPaise,
      description: body.description,
      createdById: userId,
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "trainer.payout_adjusted",
      entityType: "trainer_payout_line",
      entityId: line.id,
      metadata: { payoutId, amountPaise: body.amountPaise },
    });
    return ok({ line });
  }
  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "payouts", /.+/, "mark-paid"])
  ) {
    const orgId = path[1]!;
    const payoutId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "TRAINERS_MANAGE");
    const body = payoutMarkPaidSchema.parse(await readJson(request));
    if (body.proofFileAssetId) {
      await getOrganizationScopedFileAsset(body.proofFileAssetId, orgId, ["payment_proof"]);
    }
    const payout = await markPayoutPaid({
      orgId,
      payoutId,
      paidById: userId,
      method: body.method,
      ...(body.note ? { note: body.note } : {}),
      ...(body.proofFileAssetId ? { proofFileAssetId: body.proofFileAssetId } : {}),
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "trainer.payout_paid",
      entityType: "trainer_payout",
      entityId: payout.id,
      metadata: { method: body.method },
    });
    return ok({ payout });
  }
  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "trainers", /.+/, "clients", /.+/, "body-progress"])
  ) {
    const orgId = path[1]!;
    const trainerId = path[3]!;
    const clientId = path[5]!;
    const ctx = await getRequestContext(request, { orgId });
    const requesterId = requireAuth(ctx);
    if (requesterId === trainerId) {
      requireOrgPermission(ctx, orgId, "PLANS_CREATE");
    } else {
      requireOrgPermission(ctx, orgId, "MEMBERS_VIEW");
    }
    const assignment = await prisma.trainerAssignment.findFirst({
      where: { orgId, trainerUserId: trainerId, memberUserId: clientId, active: true },
    });
    if (!assignment) {
      throw notFoundError("Trainer client not found");
    }
    const body = bodyProgressEntrySchema.parse(await readJson(request));
    const entry = await prisma.bodyProgressEntry.create({
      data: {
        userId: clientId,
        organizationId: orgId,
        measuredAt: new Date(body.measuredAt),
        ...(body.weightKg !== undefined ? { weightKg: new Prisma.Decimal(body.weightKg) } : {}),
        ...(body.waistCm !== undefined ? { waistCm: new Prisma.Decimal(body.waistCm) } : {}),
        ...(body.hipCm !== undefined ? { hipCm: new Prisma.Decimal(body.hipCm) } : {}),
        ...(body.chestCm !== undefined ? { chestCm: new Prisma.Decimal(body.chestCm) } : {}),
        ...(body.shoulderCm !== undefined
          ? { shoulderCm: new Prisma.Decimal(body.shoulderCm) }
          : {}),
        ...(body.armCm !== undefined ? { armCm: new Prisma.Decimal(body.armCm) } : {}),
        ...(body.forearmCm !== undefined
          ? { forearmCm: new Prisma.Decimal(body.forearmCm) }
          : {}),
        ...(body.thighCm !== undefined ? { thighCm: new Prisma.Decimal(body.thighCm) } : {}),
        ...(body.calfCm !== undefined ? { calfCm: new Prisma.Decimal(body.calfCm) } : {}),
        ...(body.neckCm !== undefined ? { neckCm: new Prisma.Decimal(body.neckCm) } : {}),
        ...(body.bodyFatPercent !== undefined
          ? { bodyFatPercent: new Prisma.Decimal(body.bodyFatPercent) }
          : {}),
        ...(body.muscleMassKg !== undefined
          ? { muscleMassKg: new Prisma.Decimal(body.muscleMassKg) }
          : {}),
        ...(body.visceralFatRating !== undefined
          ? { visceralFatRating: body.visceralFatRating }
          : {}),
        ...(body.restingHeartRate !== undefined ? { restingHeartRate: body.restingHeartRate } : {}),
        ...(body.photoAssetId ? { photoAssetId: body.photoAssetId } : {}),
        ...(body.notes ? { notes: body.notes } : {}),
        recordedByUserId: requesterId,
        visibility: "TRAINER_VISIBLE",
      },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: requesterId,
      action: "trainer.body_progress.recorded",
      entityType: "body_progress_entry",
      entityId: entry.id,
      metadata: { trainerUserId: trainerId, memberUserId: clientId },
    });
    return ok({ entry });
  }
  if (
    (request.method === "GET" || request.method === "POST") &&
    pathMatches(path, ["orgs", /.+/, "trainers", /.+/, "clients", /.+/, "diet-plans"])
  ) {
    const orgId = path[1]!;
    const trainerId = path[3]!;
    const clientId = path[5]!;
    const ctx = await getRequestContext(request, { orgId });
    const requesterId = requireAuth(ctx);
    if (requesterId === trainerId) {
      requireOrgPermission(ctx, orgId, "PLANS_PUBLISH_ASSIGNED");
    } else {
      requireOrgPermission(ctx, orgId, "MEMBERS_VIEW");
    }
    const assignment = await prisma.trainerAssignment.findFirst({
      where: { orgId, trainerUserId: trainerId, memberUserId: clientId, active: true },
    });
    if (!assignment) {
      throw notFoundError("Trainer client not found");
    }
    if (request.method === "GET") {
      const plans = await prisma.dietPlan.findMany({
        where: { orgId, trainerId, memberId: clientId },
        orderBy: { updatedAt: "desc" },
        take: 50,
      });
      const meals = plans.length
        ? await prisma.dietPlanMeal.findMany({
            where: { dietPlanId: { in: plans.map((plan) => plan.id) } },
            orderBy: [{ dietPlanId: "asc" }, { order: "asc" }],
          })
        : [];
      return ok({
        plans: plans.map((plan) => ({
          ...plan,
          meals: meals.filter((meal) => meal.dietPlanId === plan.id),
        })),
      });
    }
    const rawBody = (await readJson(request)) as Record<string, unknown>;
    const body = dietPlanSchema.parse({ ...rawBody, memberId: clientId });
    const plan = await prisma.$transaction(async (tx) => {
      const created = await tx.dietPlan.create({
        data: clean({
          orgId,
          branchId: body.branchId,
          trainerId,
          memberId: clientId,
          title: body.title,
          calorieTarget: body.calorieTarget,
          proteinG: body.proteinG,
          carbsG: body.carbsG,
          fatsG: body.fatsG,
          status: body.status,
        }),
      });
      await tx.dietPlanMeal.createMany({
        data: body.meals.map((meal, index) => ({
          dietPlanId: created.id,
          name: meal.name,
          timeOfDay: meal.timeOfDay ?? null,
          items: meal.items,
          calories: meal.calories ?? null,
          proteinG: meal.proteinG ?? null,
          carbsG: meal.carbsG ?? null,
          fatsG: meal.fatsG ?? null,
          order: meal.order ?? index,
        })),
      });
      return created;
    });
    if (plan.status === "PUBLISHED") {
      await createDirectNotification({
        orgId,
        createdById: requesterId,
        type: "PLAN",
        title: `New diet plan: ${plan.title}`,
        body: "Open Zook to review today's meals and log updates.",
        audience: "selected_member",
        userIds: [clientId],
        metadata: { dietPlanId: plan.id },
      });
    }
    await writeAuditLog({
      request,
      orgId,
      actorUserId: requesterId,
      action: "diet_plan.published",
      entityType: "diet_plan",
      entityId: plan.id,
      metadata: { trainerUserId: trainerId, memberUserId: clientId, status: plan.status },
    });
    return ok({
      plan: {
        ...plan,
        meals: await prisma.dietPlanMeal.findMany({
          where: { dietPlanId: plan.id },
          orderBy: { order: "asc" },
        }),
      },
    });
  }
  if (
    (request.method === "PATCH" || request.method === "DELETE") &&
    pathMatches(path, ["orgs", /.+/, "trainers", /.+/, "clients", /.+/, "diet-plans", /.+/])
  ) {
    const orgId = path[1]!;
    const trainerId = path[3]!;
    const clientId = path[5]!;
    const planId = path[7]!;
    const ctx = await getRequestContext(request, { orgId });
    const requesterId = requireAuth(ctx);
    if (requesterId === trainerId) {
      requireOrgPermission(ctx, orgId, "PLANS_PUBLISH_ASSIGNED");
    } else {
      requireOrgPermission(ctx, orgId, "MEMBERS_VIEW");
    }
    const plan = await prisma.dietPlan.findFirst({
      where: { id: planId, orgId, trainerId, memberId: clientId },
    });
    if (!plan) {
      throw notFoundError("Diet plan not found");
    }
    if (request.method === "DELETE") {
      await prisma.$transaction([
        prisma.dietPlanMeal.deleteMany({ where: { dietPlanId: plan.id } }),
        prisma.dietPlan.delete({ where: { id: plan.id } }),
      ]);
      await writeAuditLog({
        request,
        orgId,
        actorUserId: requesterId,
        action: "diet_plan.deleted",
        entityType: "diet_plan",
        entityId: plan.id,
        riskLevel: "HIGH",
        metadata: { trainerUserId: trainerId, memberUserId: clientId },
      });
      return ok({ deleted: true });
    }
    const rawBody = (await readJson(request)) as Record<string, unknown>;
    const body = dietPlanSchema.partial().parse(rawBody);
    const updated = await prisma.$transaction(async (tx) => {
      const nextPlan = await tx.dietPlan.update({
        where: { id: plan.id },
        data: clean({
          title: body.title,
          branchId: body.branchId,
          calorieTarget: body.calorieTarget,
          proteinG: body.proteinG,
          carbsG: body.carbsG,
          fatsG: body.fatsG,
          status: body.status,
        }),
      });
      if (body.meals) {
        await tx.dietPlanMeal.deleteMany({ where: { dietPlanId: plan.id } });
        await tx.dietPlanMeal.createMany({
          data: body.meals.map((meal, index) => ({
            dietPlanId: plan.id,
            name: meal.name,
            timeOfDay: meal.timeOfDay ?? null,
            items: meal.items,
            calories: meal.calories ?? null,
            proteinG: meal.proteinG ?? null,
            carbsG: meal.carbsG ?? null,
            fatsG: meal.fatsG ?? null,
            order: meal.order ?? index,
          })),
        });
      }
      return nextPlan;
    });
    if (updated.status === "PUBLISHED" && plan.status !== "PUBLISHED") {
      await createDirectNotification({
        orgId,
        createdById: requesterId,
        type: "PLAN",
        title: `New diet plan: ${updated.title}`,
        body: "Open Zook to review today's meals and log updates.",
        audience: "selected_member",
        userIds: [clientId],
        metadata: { dietPlanId: updated.id },
      });
    }
    await writeAuditLog({
      request,
      orgId,
      actorUserId: requesterId,
      action: "diet_plan.updated",
      entityType: "diet_plan",
      entityId: updated.id,
      metadata: { trainerUserId: trainerId, memberUserId: clientId, status: updated.status },
    });
    return ok({
      plan: {
        ...updated,
        meals: await prisma.dietPlanMeal.findMany({
          where: { dietPlanId: updated.id },
          orderBy: { order: "asc" },
        }),
      },
    });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "trainers", /.+/, "clients"])) {
    const orgId = path[1]!;
    const trainerId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const requesterId = requireAuth(ctx);
    if (requesterId === trainerId) {
      requireOrgPermission(ctx, orgId, "PLANS_CREATE");
    } else {
      requireOrgPermission(ctx, orgId, "MEMBERS_VIEW");
    }
    const assignments = await prisma.trainerAssignment.findMany({
      where: { orgId, trainerUserId: trainerId, active: true },
      orderBy: { createdAt: "desc" },
    });
    const memberUserIds = assignments.map((assignment) => assignment.memberUserId);
    const [
      users,
      profiles,
      bodyProgressEntries,
      planAssignments,
      planProgressEntries,
      trainerVisibleWorkouts,
    ] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: memberUserIds } },
      }),
      prisma.memberProfile.findMany({
        where: { orgId, userId: { in: memberUserIds } },
      }),
      prisma.bodyProgressEntry.findMany({
        where: {
          organizationId: orgId,
          userId: { in: memberUserIds },
        },
        orderBy: { measuredAt: "desc" },
        take: Math.max(assignments.length * 3, 10),
      }),
      prisma.planAssignment.findMany({
        where: {
          orgId,
          assignedToUserId: { in: memberUserIds },
          active: true,
        },
      }),
      prisma.planProgress.findMany({
        where: {
          orgId,
          userId: { in: memberUserIds },
          OR: [{ feedback: { not: null } }, { completionPct: { gt: 0 } }],
        },
        orderBy: { updatedAt: "desc" },
        take: Math.max(assignments.length * 5, 10),
      }),
      prisma.workoutSession.findMany({
        where: {
          organizationId: orgId,
          userId: { in: memberUserIds },
          visibility: "TRAINER_VISIBLE",
          deletedAt: null,
        },
        orderBy: { startedAt: "desc" },
        take: Math.max(assignments.length * 5, 10),
      }),
    ]);
    return ok({
      clients: assignments.map((assignment) => {
        const user = users.find((candidate) => candidate.id === assignment.memberUserId) ?? null;
        const profile =
          profiles.find((candidate) => candidate.userId === assignment.memberUserId) ?? null;
        const latestBodyProgress =
          bodyProgressEntries.find((entry) => entry.userId === assignment.memberUserId) ?? null;
        return {
          ...assignment,
          user,
          profile,
          summary: {
            ...parseMemberProfileNotes(profile?.notes),
            fitnessGoal: user?.fitnessGoal ?? null,
            dateOfBirth: user?.dateOfBirth ?? null,
            weightKg: latestBodyProgress?.weightKg
              ? Number(latestBodyProgress.weightKg)
              : undefined,
            activePlans: planAssignments.filter(
              (plan) => plan.assignedToUserId === assignment.memberUserId,
            ).length,
            recentFeedback: planProgressEntries
              .filter((entry) => entry.userId === assignment.memberUserId)
              .slice(0, 3)
              .map((entry) => ({
                assignmentId: entry.assignmentId,
                completionPct: entry.completionPct,
                feedback: entry.feedback,
                updatedAt: entry.updatedAt,
              })),
            recentWorkouts: trainerVisibleWorkouts
              .filter((workout) => workout.userId === assignment.memberUserId)
              .slice(0, 3)
              .map((workout) => ({
                id: workout.id,
                title: workout.title,
                workoutType: workout.workoutType,
                startedAt: workout.startedAt,
                durationMinutes: workout.durationMinutes,
                notes: workout.notes,
              })),
          },
        };
      }),
    });
  }
  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "trainers", /.+/, "pt-plans"])
  ) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "PT_RECORD");
    const trainerUserId = path[3]!;
    await assertOrgUser({ orgId, userId: trainerUserId, role: "TRAINER" });
    const body = (await readJson(request)) as {
      name: string;
      description?: string;
      sessionCount?: number;
      durationDays?: number;
      pricePaise: number;
    };
    const plan = await prisma.personalTrainingPlan.create({
      data: clean({
        orgId,
        trainerUserId,
        name: body.name,
        description: sanitizeRichText(body.description),
        sessionCount: body.sessionCount,
        durationDays: body.durationDays,
        pricePaise: body.pricePaise,
      }),
    });
    return ok({ plan });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "pt-subscriptions"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "PT_RECORD");
    const body = ptSubscriptionSchema.parse(await readJson(request));
    const memberUser = await prisma.user.findUniqueOrThrow({ where: { id: body.memberUserId } });
    await Promise.all([
      assertOrgUser({ orgId, userId: body.memberUserId, role: "MEMBER" }),
      assertOrgUser({ orgId, userId: body.trainerUserId, role: "TRAINER" }),
    ]);
    if (body.ptPlanId) {
      const ptPlan = await prisma.personalTrainingPlan.findFirst({
        where: { id: body.ptPlanId, orgId, trainerUserId: body.trainerUserId },
      });
      if (!ptPlan) {
        throw notFoundError("Personal training plan not found for this trainer.");
      }
    }
    assertMinorConsentGranted({
      isMinor: memberUser.isMinor,
      guardianPending: memberUser.guardianPending,
      action: "PT subscription activation",
    });
    const proofAsset = await getOrganizationScopedFileAsset(body.proofAssetId, orgId, [
      "payment_proof",
    ]);
    const sub = await prisma.personalTrainingSubscription.create({
      data: clean({
        orgId,
        memberUserId: body.memberUserId,
        trainerUserId: body.trainerUserId,
        ptPlanId: body.ptPlanId,
        status: "ACTIVE",
        startsAt: new Date(),
        totalSessions: body.totalSessions,
        remainingSessions: body.totalSessions,
        amountPaise: body.amountPaise,
        paymentMode: body.paymentMode,
        proofAssetId: proofAsset?.id,
        notes: sanitizeRichText(body.notes),
        recordedById: userId,
      }),
    });
    await accruePtSubscriptionCommission({
      orgId,
      trainerId: body.trainerUserId,
      subscriptionId: sub.id,
      amountPaise: sub.amountPaise,
      createdById: userId,
    });
    return ok({ subscription: sub });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "pt-sessions"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "PT_RECORD");
    const body = ptSessionLogSchema.parse(await readJson(request));
    const subscription = await prisma.personalTrainingSubscription.findFirst({
      where: { id: body.subscriptionId, orgId, status: "ACTIVE" },
    });
    if (!subscription) {
      throw notFoundError("Active PT subscription not found.");
    }
    if (ctx.roles.includes("TRAINER") && subscription.trainerUserId !== userId) {
      throw forbiddenError("You can only log sessions for your assigned PT subscriptions.");
    }
    const sessionAt = body.sessionAt ? new Date(body.sessionAt) : new Date();
    const log = await prisma.$transaction(async (tx) => {
      const created = await tx.personalTrainingSessionLog.create({
        data: {
          orgId,
          subscriptionId: subscription.id,
          trainerUserId: subscription.trainerUserId,
          memberUserId: subscription.memberUserId,
          sessionAt,
          notes: body.notes ? (sanitizeRichText(body.notes) ?? null) : null,
        },
      });
      await tx.personalTrainingSubscription.update({
        where: { id: subscription.id },
        data:
          subscription.remainingSessions !== null && subscription.remainingSessions !== undefined
            ? { remainingSessions: { decrement: 1 } }
            : {},
      });
      return created;
    });
    await accruePtSessionFee({
      orgId,
      trainerId: subscription.trainerUserId,
      sessionLogId: log.id,
      sessionAt,
      createdById: userId,
    });
    return ok({ session: log });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "pt-subscriptions", /.+/, "refund"])) {
    const orgId = path[1]!;
    const subscriptionId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "PT_RECORD");
    const subscription = await prisma.personalTrainingSubscription.findFirst({
      where: { id: subscriptionId, orgId },
    });
    if (!subscription) {
      throw notFoundError("PT subscription not found.");
    }
    await prisma.personalTrainingSubscription.update({
      where: { id: subscription.id },
      data: { status: "REFUNDED" },
    });
    const line = await accruePtClawback({
      orgId,
      trainerId: subscription.trainerUserId,
      subscriptionId: subscription.id,
      amountPaise: subscription.amountPaise,
      createdById: userId,
    });
    return ok({ refunded: true, line });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "plans"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "PLANS_CREATE");
    const plans = await prisma.planContent.findMany({
      where: { orgId },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: 100,
    });
    const assignments = await prisma.planAssignment.findMany({
      where: { orgId, planId: { in: plans.map((plan) => plan.id) } },
    });
    return ok({
      plans: plans.map((plan) => ({
        ...plan,
        assignmentCount: assignments.filter((assignment) => assignment.planId === plan.id).length,
      })),
    });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "plans"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "PLANS_CREATE");
    const body = planContentInputSchema.parse(await readJson(request));
    const imageAsset = await getOrganizationScopedFileAsset(body.imageAssetId, orgId, [
      "plan_image",
      "ai_generated_image",
    ]);
    const sanitizedDescription = sanitizeRichText(body.description);
    const sanitizedContent = sanitizeJsonRichText(body.content) as Prisma.InputJsonValue;
    const attachments = imageAsset
      ? ({
          coverImage: {
            fileAssetId: imageAsset.id,
            url: imageAsset.url,
          },
        } as Prisma.InputJsonValue)
      : undefined;
    const plan = await prisma.planContent.create({
      data: clean({
        orgId,
        creatorUserId: userId,
        type: body.type as never,
        title: body.title,
        description: sanitizedDescription,
        content: sanitizedContent,
        attachments,
        aiGenerated: false,
        visibility: body.visibility,
      }),
    });
    await prisma.planVersion.create({
      data: {
        orgId,
        planId: plan.id,
        versionNo: 1,
        content: createPlanVersionSnapshot({
          title: body.title,
          ...clean({
            description: sanitizedDescription,
            aiGenerated: false,
            visibility: body.visibility,
            attachments,
          }),
          content: sanitizedContent,
        }) as Prisma.InputJsonValue,
        createdById: userId,
      },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "plan.created",
      entityType: "plan_content",
      entityId: plan.id,
      metadata: { title: plan.title, type: plan.type },
    });
    return ok({ plan });
  }
  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "plans", /.+/])) {
    const orgId = path[1]!;
    const planId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "PLANS_CREATE");
    const existingPlan = await prisma.planContent.findFirst({ where: { id: planId, orgId } });
    if (!existingPlan) {
      throw notFoundError("Plan not found");
    }
    const body = planContentUpdateSchema.parse(await readJson(request));
    const imageAsset = await getOrganizationScopedFileAsset(body.imageAssetId, orgId, [
      "plan_image",
      "ai_generated_image",
    ]);
    const attachments = imageAsset
      ? ({
          coverImage: {
            fileAssetId: imageAsset.id,
            url: imageAsset.url,
          },
        } as Prisma.InputJsonValue)
      : undefined;
    const sanitizedDescription = sanitizeRichText(body.description);
    const sanitizedContent =
      body.content === undefined
        ? undefined
        : (sanitizeJsonRichText(body.content) as Prisma.InputJsonValue);
    const plan = await prisma.planContent.update({
      where: { id: existingPlan.id },
      data: clean({
        title: body.title,
        type: body.type as never,
        description: sanitizedDescription,
        content: sanitizedContent,
        attachments,
        aiGenerated: false,
        visibility: body.visibility,
      }),
    });
    const latestVersion = await prisma.planVersion.aggregate({
      where: { orgId, planId: plan.id },
      _max: { versionNo: true },
    });
    await prisma.planVersion.create({
      data: {
        orgId,
        planId: plan.id,
        versionNo: (latestVersion._max.versionNo ?? 0) + 1,
        content: createPlanVersionSnapshot({
          title: plan.title,
          ...clean({
            description: plan.description,
            aiGenerated: plan.aiGenerated,
            visibility: plan.visibility,
            attachments: plan.attachments,
          }),
          content: plan.content,
        }) as Prisma.InputJsonValue,
        createdById: userId,
      },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "plan.updated",
      entityType: "plan_content",
      entityId: plan.id,
      metadata: { title: plan.title, type: plan.type },
    });
    return ok({ plan });
  }
  if (request.method === "DELETE" && pathMatches(path, ["orgs", /.+/, "plans", /.+/])) {
    const orgId = path[1]!;
    const planId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "PLANS_CREATE");
    const existingPlan = await prisma.planContent.findFirst({ where: { id: planId, orgId } });
    if (!existingPlan) {
      throw notFoundError("Plan not found");
    }
    const assignmentCount = await prisma.planAssignment.count({ where: { orgId, planId } });
    const plan = assignmentCount
      ? await prisma.planContent.update({
          where: { id: existingPlan.id },
          data: { status: "ARCHIVED" },
        })
      : await prisma.planContent.delete({ where: { id: existingPlan.id } });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: assignmentCount ? "plan.archived" : "plan.deleted",
      entityType: "plan_content",
      entityId: existingPlan.id,
      metadata: { title: existingPlan.title, assignmentCount },
    });
    return ok({ plan, archived: assignmentCount > 0 });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "plans", /.+/, "publish"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "PLANS_PUBLISH_ALL");
    const existingPlan = await prisma.planContent.findFirst({ where: { id: path[3]!, orgId } });
    if (!existingPlan) {
      throw notFoundError("Plan not found");
    }
    const plan = await prisma.planContent.update({
      where: { id: existingPlan.id },
      data: { status: "PUBLISHED", reviewed: true, reviewedById: userId },
    });
    const fanout = await fanoutPlanPublished({ request, orgId, actorUserId: userId, plan });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "plan.published",
      entityType: "plan_content",
      entityId: plan.id,
      metadata: fanout,
    });
    return ok({ plan });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "plans", /.+/, "review"])) {
    const orgId = path[1]!;
    const planId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "PLANS_CREATE");
    const existingPlan = await prisma.planContent.findFirst({ where: { id: planId, orgId } });
    if (!existingPlan) {
      throw notFoundError("Plan not found");
    }
    const canReview =
      existingPlan.creatorUserId === userId ||
      ctx.permissions.includes("PLANS_PUBLISH_ALL") ||
      ctx.roles.includes("OWNER") ||
      ctx.roles.includes("ADMIN");
    if (!canReview) {
      throw forbiddenError(
        "You can only review your own draft or use owner/admin plan publishing permissions.",
      );
    }
    const exercises = extractPlanExercises(existingPlan.content);
    if (planRequiresExercises(existingPlan.type as PlanType) && !exercises.length) {
      throw validationError("Workout plan drafts need at least one exercise before review.");
    }
    const plan = await prisma.planContent.update({
      where: { id: existingPlan.id },
      data: { reviewed: true, reviewedById: userId },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "plan.reviewed",
      entityType: "plan_content",
      entityId: plan.id,
      metadata: { aiGenerated: plan.aiGenerated },
    });
    return ok({ plan });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "plans", /.+/, "assign"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "PLANS_PUBLISH_ASSIGNED");
    const existingPlan = await prisma.planContent.findFirst({ where: { id: path[3]!, orgId } });
    if (!existingPlan) {
      throw notFoundError("Plan not found");
    }
    if (existingPlan.aiGenerated && !existingPlan.reviewed) {
      throw conflictError("Assisted drafts must be reviewed before assignment.");
    }
    if (
      planRequiresExercises(existingPlan.type as PlanType) &&
      !extractPlanExercises(existingPlan.content).length
    ) {
      throw validationError("Workout plans need at least one exercise before assignment.");
    }
    const body = planAssignSchema.parse(await readJson(request));
    if (body.assignedToUserId) {
      await assertOrgUser({ orgId, userId: body.assignedToUserId, role: "MEMBER" });
      const targetUser = await prisma.user.findUniqueOrThrow({
        where: { id: body.assignedToUserId },
      });
      assertMinorConsentGranted({
        isMinor: targetUser.isMinor,
        guardianPending: targetUser.guardianPending,
        action: "plan assignment",
      });
    }
    const assignedClientUserIds = ctx.roles.includes("TRAINER")
      ? (
          await prisma.trainerAssignment.findMany({
            where: { orgId, trainerUserId: userId, active: true },
            select: { memberUserId: true },
          })
        ).map((assignment) => assignment.memberUserId)
      : [];
    if (
      !canAssignPlanToUser({
        actorRoles: ctx.roles,
        actorPermissions: ctx.permissions,
        audience: body.audience,
        assignedClientUserIds,
        ...(body.assignedToUserId ? { targetUserId: body.assignedToUserId } : {}),
      })
    ) {
      throw forbiddenError(
        "You can only assign plans to your own clients or within your granted scope.",
      );
    }
    const assignment = await prisma.planAssignment.create({
      data: clean({
        orgId,
        planId: existingPlan.id,
        assignedById: userId,
        assignedToUserId: body.assignedToUserId,
        audience: body.audience,
      }),
    });
    if (body.assignedToUserId) {
      await createDirectNotification({
        orgId,
        createdById: userId,
        type: "PLAN",
        title: `New plan assigned: ${existingPlan.title}`,
        body: "Open Zook to review the plan, ask follow-up questions, and track progress.",
        audience: "selected_member",
        userIds: [body.assignedToUserId],
        metadata: { assignmentId: assignment.id, planId: existingPlan.id },
      });
    }
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "plan.assigned",
      entityType: "plan_assignment",
      entityId: assignment.id,
      metadata: {
        assignedToUserId: body.assignedToUserId,
        audience: body.audience ?? "selected_member",
      },
    });
    return ok({ assignment });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "plan-feedback"])) {
    const orgId = path[1]!;
    const userId = requireAuth(await getRequestContext(request, { orgId }));
    const body = planFeedbackSchema.parse(await readJson(request));
    const assignment = await prisma.planAssignment.findFirst({
      where: {
        id: body.planAssignmentId,
        orgId,
        assignedToUserId: userId,
        active: true,
      },
    });
    if (!assignment) {
      throw notFoundError("Plan assignment not found");
    }
    const plan = await prisma.planContent.findFirst({
      where: { id: assignment.planId, orgId },
      select: { title: true },
    });
    const progress = await prisma.planProgress.upsert({
      where: { assignmentId_userId: { assignmentId: assignment.id, userId } },
      update: { feedback: body.message },
      create: {
        orgId,
        assignmentId: assignment.id,
        userId,
        progressJson: {},
        completionPct: 0,
        feedback: body.message,
      },
    });
    const trainerIds = assignment.assignedById
      ? [assignment.assignedById]
      : (
          await prisma.trainerAssignment.findMany({
            where: { orgId, memberUserId: userId, active: true },
            select: { trainerUserId: true },
          })
        ).map((trainer) => trainer.trainerUserId);
    const recipientIds = [...new Set(trainerIds.filter((trainerId) => trainerId !== userId))];
    if (recipientIds.length) {
      await createDirectNotification({
        orgId,
        createdById: userId,
        type: "PLAN",
        title: `Plan feedback: ${plan?.title ?? "Training plan"}`,
        body: body.message,
        audience: "selected_trainers",
        userIds: recipientIds,
        metadata: {
          targetType: "plan",
          targetId: assignment.id,
          assignmentId: assignment.id,
          planId: assignment.planId,
        },
      });
    }
    return ok({ ok: true, progress, notified: recipientIds.length });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "challenges"])) {
    return ok({
      challenges: await prisma.challenge.findMany({
        where: { orgId: path[1]!, active: true },
        orderBy: { startsAt: "desc" },
        take: ADMIN_DETAIL_LIST_LIMIT,
      }),
    });
  }
  return undefined;
}

export function redirectTo(url: string) {
  return NextResponse.redirect(url);
}
