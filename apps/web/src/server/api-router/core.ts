import { createHash, createPublicKey, createVerify, randomBytes, randomUUID } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import { Parser } from "htmlparser2";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  bodyProgressEntrySchema,
  attendanceScanSchema,
  checkoutSchema,
  couponSchema,
  createOrganizationSchema,
  dietPlanSchema,
  mealLogSchema,
  memberHabitLogSchema,
  memberHabitSchema,
  membershipPlanSchema,
  notificationSchema,
  offerSchema,
  publicUserEmail,
  requestOtpSchema,
  referralCodeManageSchema,
  referralPolicySchema,
  workoutSessionSchema,
  verifyOtpSchema,
  isInternalPhoneEmail,
  getAppEnv,
  getQrSigningSecret,
  isMockPaymentCompletionAllowed,
  isQaDemoIdentifier,
  isQaFreshIdentifier,
  isSeededDemoIdentifier,
  QA_DEMO_ACCOUNT_EMAIL,
  QA_DEMO_ACCOUNT_PHONE,
  QA_TEST_OTP,
  normalizePhoneNumber,
  orgRoles,
  permissions,
  validateRuntimeConfig,
  type Permission,
  type PaymentMandateStatus,
  type AIRequestType,
  type NotificationType,
  type OrgRole,
  type PlanType,
} from "@zook/core";
import {
  LocalStorageProvider,
  buildStorageKey,
  getAIProvider,
  getAIProviderDiagnostics,
  getEmailProvider,
  getEmailProviderDiagnostics,
  getMapProvider,
  getMapProviderDiagnostics,
  getPaymentProvider,
  getPaymentProviderDiagnostics,
  getPushProvider,
  getPushProviderDiagnostics,
  getProviderRegistryDiagnostics,
  getStorageProvider,
  getStorageProviderDiagnostics,
  getSmsProvider,
  getSmsProviderDiagnostics,
  getWhatsAppProvider,
  getWhatsAppProviderDiagnostics,
  normalizeWhatsAppPhone,
  storageFileCategories,
  verifyLocalStorageSignature,
  type StorageFileCategory,
  type ParsedPaymentWebhookEvent,
} from "@zook/core/providers";
import {
  AuthService,
  calculateShopOrder,
  buildAIQuotaState,
  AIGuardError,
  canReceiveNotification,
  canAssignPlanToUser,
  canSendNotification,
  badgeMilestoneDefinitions,
  computeSubscriptionWindow,
  consumeVisit,
  createPlanVersionSnapshot,
  enforceNotificationRateLimits,
  type OtpChallengeRecord,
  applyCoupon,
  assertManualPaymentRecordContext,
  assertOrgServicePermission,
  createSignedQrToken,
  createTrialWindow,
  decideClassEnrollment,
  decideAttendanceStatus,
  encodeQrPayload,
  evaluateBadgeMilestones,
  evaluateOperatingHours,
  fulfillShopOrderForContext,
  getNextBadgeMilestone,
  normalizeUsername,
  PersonalTrackingService,
  requireManualOverrideReason,
  runAIGuardedRequest,
  validateClassSchedule,
  validateAttendanceScan,
  validateReferralRedemption,
  validateSignedQrToken,
} from "@zook/core/services";
import { Prisma, prisma } from "@zook/db";
import { extractSessionToken, refreshSessionCookieName, sessionCookieName } from "../context";
import { ensurePaymentInvoiceDocument } from "../invoices/generate";
import { renderInvoicePdfBuffer } from "../invoices/pdf";
import {
  getRequestContext,
  requireAuth,
  requireOrgAnyPermission,
  requireOrgPermission,
  requirePlatformAdmin,
} from "../access";
import {
  ApiRouteError,
  conflictError,
  forbiddenError,
  notFoundError,
  payloadTooLargeError,
  serviceUnavailableError,
  unauthorizedError,
  validationError,
} from "../errors";
import { fail, ok, readJson } from "../response";
import { resolveSessionSummaryFromToken } from "../session";
import { createUniqueMemberSlug } from "../member-slug";
import { privateUserHandle } from "../private-user-handle";
import { writeAuditLog } from "../audit";
import { getDevOtpResponseValue } from "../auth-response";
import { assertRateLimit, defaultRateLimitRules, getRateLimitDiagnostics } from "../rate-limit";
import { getServerCacheDiagnostics } from "../server-cache";
import { currentRequestId } from "../request-state";
import { getClientIp } from "../security";
import { buildGymDiscoveryResults } from "../gym-discovery";
import { getHealthPayload, getReadinessPayload, getStatusPayload } from "../readiness";
import {
  assertCanAccessFileAsset,
  assertCanServeLocalPublicFileAsset,
  assertFileAssetBelongsToOrg,
  assertFileAssetOwnedByUser,
  assertFileUploadPermission,
  buildFileAssetUrl,
  resolveFileVisibility,
} from "../files";
import {
  ReportsService,
  canExportOrgReport,
  parseReportFilters,
  renderCsv,
  type OrgReportType,
} from "../reports-service";
import { applyAutopayProviderEvent, applyPaymentSessionStatus } from "../payment-runtime";
import { deliverPushForNotification } from "../push-runtime";
import { getErrorReporter } from "../error-reporter";
import { assertMinorConsentGranted } from "../minor-gates";
import { getPublicCouponPreview } from "../public-gym-read-models";
import { getOrganizationAttendanceToday, getOrganizationPendingAttendance } from "../domains/attendance";
import {
  getActiveMembershipData,
  getMemberHomeData,
} from "../domains/members";
import { getOrganizationDashboardData } from "../domains/overview";
import { getOrganizationRecentPayments } from "../domains/payments";
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
  draftPayoutsForMonth,
  getPayoutConfig,
  listPayouts,
  markPayoutPaid,
  upsertPayoutConfig,
} from "../domains/payouts";
import { extractPlanExercises, getPlanExercisesForUser } from "../domains/plans";
import { getMyShopOrders, getOrganizationActiveShopOrders } from "../domains/shop-orders";

const reportsService = new ReportsService();
const personalTrackingService = new PersonalTrackingService();

const joinRequestSchema = z.object({
  planId: z.string().optional(),
  referralCode: z.string().trim().toUpperCase().optional(),
  message: z.string().max(500).optional(),
});

const joinRequestBatchApproveSchema = z.object({
  joinRequestIds: z.array(z.string().min(1)).min(1).max(100),
});

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

const referralRedeemSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .transform((value) => value.toUpperCase()),
});

const publicCouponValidateSchema = z.object({
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

const completeMockPaymentSchema = z.object({
  status: z.enum(["SUCCEEDED", "FAILED", "PENDING"]).optional(),
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

const attendanceRejectSchema = z.object({
  reason: z.string().trim().min(2).max(200),
});

const attendanceDetailParamsSchema = z.object({
  id: z.string().trim().min(1),
});

const orgMemberDetailParamsSchema = z.object({
  orgId: z.string().trim().min(1),
  memberUserId: z.string().trim().min(1),
});

const receptionCodeVerifySchema = z.object({
  code: z.string().trim().min(3).max(40),
});

const manualAttendanceSchema = z.object({
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

const notificationComposerSchema = notificationSchema
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

const staffInviteSchema = z
  .object({
    email: z.string().trim().email(),
    role: z.enum(["ADMIN", "RECEPTIONIST", "TRAINER"]),
    branchId: z.string().optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.role === "RECEPTIONIST" && !value.branchId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose the branch this Reception user will manage.",
        path: ["branchId"],
      });
    }
  });

const staffRoleUpdateSchema = z
  .object({
    role: z.enum(["ADMIN", "RECEPTIONIST", "TRAINER"]),
    branchId: z.string().optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.role === "RECEPTIONIST" && !value.branchId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Reception users must be assigned to one branch.",
        path: ["branchId"],
      });
    }
  });

const timeStringSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const dayHoursSchema = z.union([
  z.object({ closed: z.literal(true) }),
  z.object({ open: timeStringSchema, close: timeStringSchema }),
]);
const operatingHoursSchema = z
  .object({
    mon: dayHoursSchema,
    tue: dayHoursSchema,
    wed: dayHoursSchema,
    thu: dayHoursSchema,
    fri: dayHoursSchema,
    sat: dayHoursSchema,
    sun: dayHoursSchema,
  })
  .strict();

const branchManageBaseSchema = z.object({
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().min(10).max(240),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: z.string().regex(/^\d{6}$/),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  locationSource: z.enum(["MANUAL", "GOOGLE_PLACE", "GOOGLE_MAPS_LINK"]).optional(),
  contactPhone: z.string().trim().min(8).max(20),
  contactEmail: z.string().trim().email().optional().nullable(),
  whatsappNumber: z.string().trim().min(8).max(20).optional().nullable(),
  operatingHours: operatingHoursSchema.optional().nullable(),
  amenities: z.array(z.string().trim().min(1).max(48)).max(40).optional(),
  managerId: z.string().optional().nullable(),
  logoAssetId: z.string().optional().nullable(),
  coverAssetId: z.string().optional().nullable(),
  commerceSetup: z.enum(["SHARED", "CUSTOM"]).optional(),
  isDefault: z.boolean().optional(),
  active: z.boolean().optional(),
});

const branchManageSchema = branchManageBaseSchema.superRefine((value, ctx) => {
  if (
    value.locationSource === "GOOGLE_PLACE" &&
    (value.latitude == null || value.longitude == null)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Choose the branch location on the map before saving.",
      path: ["latitude"],
    });
  }
  if (!value.operatingHours) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Set working hours for all seven days before saving.",
      path: ["operatingHours"],
    });
  }
  if (!value.commerceSetup) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Choose whether this branch shares plans and products or uses its own.",
      path: ["commerceSetup"],
    });
  }
});

const pincodeStatePrefixes: Record<string, string[]> = {
  Maharashtra: ["40", "41", "42", "43", "44"],
  Karnataka: ["56", "57", "58", "59"],
  Delhi: ["11"],
  "Uttar Pradesh": ["20", "21", "22", "24", "25", "26", "27", "28"],
  Haryana: ["12", "13"],
  Punjab: ["14", "15", "16"],
  Rajasthan: ["30", "31", "32", "33", "34"],
  Gujarat: ["36", "37", "38", "39"],
  Tamilnadu: ["60", "61", "62", "63", "64"],
  "Tamil Nadu": ["60", "61", "62", "63", "64"],
  Kerala: ["67", "68", "69"],
  Telangana: ["50"],
  "Andhra Pradesh": ["51", "52", "53"],
  Odisha: ["75", "76", "77"],
  "West Bengal": ["70", "71", "72", "73", "74"],
  Bihar: ["80", "81", "82", "83", "84", "85"],
  Jharkhand: ["82", "83"],
  Assam: ["78"],
};

function branchLocationWarnings(input: { state?: string | null; pincode?: string | null }) {
  const state = input.state?.trim();
  const pincode = input.pincode?.trim();
  if (!state || !pincode || !/^\d{6}$/.test(pincode)) {
    return [];
  }
  const prefixes = Object.entries(pincodeStatePrefixes).find(
    ([candidate]) => candidate.toLowerCase() === state.toLowerCase(),
  )?.[1];
  if (!prefixes?.length || prefixes.some((prefix) => pincode.startsWith(prefix))) {
    return [];
  }
  return [
    `The pincode does not look typical for ${state}. You can still save it if the address is correct.`,
  ];
}

async function resolveBranchLocation(input: z.infer<typeof branchManageBaseSchema>) {
  if (input.latitude != null && input.longitude != null) {
    return input;
  }
  const place = await getMapProviderOrThrow().geocodeAddress({
    address: input.address,
    city: input.city,
    state: input.state,
    pincode: input.pincode,
  });
  return {
    ...input,
    latitude: place.latitude,
    longitude: place.longitude,
    locationSource: place.locationSource === "MOCK" ? "MANUAL" : place.locationSource,
  };
}

const permissionOverrideSchema = z.object({
  role: z.enum(orgRoles),
  permission: z
    .enum(permissions)
    .refine(
      (permission) => !permission.startsWith("PLATFORM_"),
      "Platform permissions are not tenant scoped.",
    ),
  enabled: z.boolean(),
});

const notificationPreferenceSchema = z.object({
  orgId: z.string().optional(),
  transactional: z.boolean().optional(),
  operational: z.boolean().optional(),
  promotional: z.boolean().optional(),
  engagement: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
});

const pushRegisterDeviceSchema = z.object({
  orgId: z.string().optional(),
  token: z.string().trim().min(10),
  platform: z.enum(["ios", "android", "web", "unknown"]).default("unknown"),
  deviceId: z.string().trim().max(120).optional(),
  deviceName: z.string().trim().max(120).optional(),
  appVersion: z.string().trim().max(50).optional(),
  environment: z.enum(["development", "preview", "production"]).default("development"),
});

const pushUnregisterDeviceSchema = z.object({
  token: z.string().trim().min(10).optional(),
});

const whatsappRegisterDeviceSchema = z.object({
  orgId: z.string().optional(),
  phone: z.string().trim().min(8).max(20),
  deviceId: z.string().trim().max(120).optional(),
  deviceName: z.string().trim().max(120).optional(),
  locale: z.string().trim().max(20).optional(),
  timezone: z.string().trim().max(80).optional(),
});

const whatsappUnregisterDeviceSchema = z.object({
  phone: z.string().trim().min(8).max(20),
});

const productInputSchema = z.object({
  branchId: z.string().optional().nullable(),
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  category: z
    .enum(["WATER", "PROTEIN_SHAKE", "SHAKER", "TOWEL", "SUPPLEMENT", "OTHER"])
    .default("OTHER"),
  pricePaise: z.number().int().nonnegative(),
  stock: z.number().int().nonnegative(),
  lowStockThreshold: z.number().int().nonnegative().default(8),
  imageAssetId: z.string().optional(),
  imageAssetIds: z.array(z.string()).max(6).optional(),
  imageUrl: z.string().url().optional(),
  imageUrls: z.array(z.string().url()).max(6).optional(),
  active: z.boolean().default(true),
});

const shopOrderSchema = z.object({
  orgId: z.string(),
  branchId: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
});

const inventoryAdjustmentSchema = z.object({
  productId: z.string(),
  delta: z
    .number()
    .int()
    .refine((value) => value !== 0, "Inventory delta must be non-zero"),
  reason: z.string().trim().min(2).max(200),
});

const paymentRefundSchema = z.object({
  amountPaise: z.number().int().positive().optional(),
  reason: z.string().trim().min(2).max(200).default("Owner requested refund"),
});

const platformImpersonateSchema = z.object({
  reason: z.string().trim().min(6).max(240),
  ttlMinutes: z.number().int().min(1).max(60).default(15),
  targetOrgId: z.string().optional(),
});

const platformBroadcastSchema = z.object({
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

const platformFlagPatchSchema = z.object({
  key: z.string().trim().min(2).max(120),
  enabled: z.boolean().optional(),
  description: z.string().trim().max(500).optional(),
  rolloutPercent: z.number().int().min(0).max(100).optional(),
  overrideOrgIds: z.array(z.string()).max(500).optional(),
});

const platformOrgTrialExtendSchema = z.object({
  days: z.number().int().min(1).max(365),
  reason: z.string().trim().min(2).max(240),
});

const platformOrgCreditSchema = z.object({
  paise: z.number().int().min(-10_000_000).max(10_000_000),
  reason: z.string().trim().min(2).max(240),
});

const platformOrgTierSchema = z.object({
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

const platformSaasPricingSchema = z.object({
  starter: platformSaasPlanPatchSchema,
  growth: platformSaasPlanPatchSchema,
  pro: platformSaasPlanPatchSchema,
});

const platformSubscriptionNoteSchema = z.object({
  note: z.string().trim().max(1000),
});

const platformReferralPolicySchema = z.object({
  enabled: z.boolean().default(true),
  referrerRewardType: z.enum(["TRIAL_DAYS", "CREDIT_PAISE", "NONE"]).default("TRIAL_DAYS"),
  referrerRewardValue: z.number().int().min(0).max(10_000_000).default(30),
  referredRewardType: z.enum(["TRIAL_DAYS", "DISCOUNT_PERCENT_BPS", "CREDIT_PAISE", "NONE"]).default("TRIAL_DAYS"),
  referredRewardValue: z.number().int().min(0).max(10_000_000).default(30),
  maxRedemptionsPerOrg: z.number().int().min(1).max(1000).default(25),
  expiresInDays: z.number().int().min(1).max(730).default(180),
});

const platformOrgRenameSchema = z.object({
  name: z.string().trim().min(2).max(120),
  username: z.string().trim().min(3).max(64).regex(/^[a-z0-9-]+$/),
  reason: z.string().trim().min(2).max(240),
});

const platformOrgReasonSchema = z.object({
  reason: z.string().trim().min(2).max(240),
});

const platformOrgTransferSchema = z.object({
  newOwnerUserId: z.string(),
  reason: z.string().trim().min(2).max(240),
});

const platformModerationDecisionSchema = z.object({
  id: z.string(),
  decision: z.enum(["APPROVED", "REMOVED"]),
  reason: z.string().trim().min(2).max(240),
});

const subscriptionReminderResolveSchema = z.object({
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

const aiStructuredPlanContentSchema = z.object({
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

const uploadCategorySchema = z.enum(storageFileCategories);

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

function sanitizeRichText(value: string | undefined) {
  if (value === undefined) {
    return undefined;
  }
  return sanitizeAllowedRichText(value).trim();
}

function sanitizeJsonRichText(value: unknown): unknown {
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

const profilePhotoAssetSchema = z.object({
  fileAssetId: z.string(),
  orgId: z.string().optional(),
  consentToAttendanceUse: z.boolean().optional(),
});

const memberWellnessProfileSchema = z.object({
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

const appleAuthCallbackSchema = z.object({
  identityToken: z.string().trim().min(20),
  fullName: z.string().trim().min(1).max(160).optional(),
});

const googleAuthCallbackSchema = z.object({
  idToken: z.string().trim().min(20),
});

const organizationAssetSchema = z
  .object({
    logoAssetId: z.string().optional(),
    coverAssetId: z.string().optional(),
  })
  .refine(
    (value) => Boolean(value.logoAssetId || value.coverAssetId),
    "Provide at least one file asset.",
  );

const organizationLocationSchema = z
  .object({
    address: z.string().trim().min(3).max(200),
    city: z.string().trim().min(2).max(120),
    state: z.string().trim().min(2).max(120),
    pincode: z.string().trim().min(4).max(12),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    googleMapsUrl: z.string().url().optional(),
    googlePlaceId: z.string().optional(),
  })
  .refine(
    (value) =>
      Boolean(
        value.googleMapsUrl || (value.latitude !== undefined && value.longitude !== undefined),
      ),
    "Provide manual latitude/longitude or a Google Maps link.",
  );

const organizationPublicProfileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  username: z.string().trim().min(3).max(32).optional(),
  contactPhone: z.string().trim().min(8).max(20),
  contactEmail: z.string().trim().email(),
  address: z.string().trim().min(3).max(240),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
  amenities: z.array(z.string().trim().min(2).max(80)).default([]),
  equipment: z.array(z.string().trim().min(2).max(80)).max(60).default([]),
  visibility: z.enum(["PUBLIC", "INVITE_ONLY", "HIDDEN"]),
  joinMode: z.enum(["OPEN_JOIN", "APPROVAL_REQUIRED", "INVITE_ONLY"]),
  logoUrl: z.string().trim().url().optional().or(z.literal("")),
  coverImageUrl: z.string().trim().url().optional().or(z.literal("")),
  tagline: z.string().trim().max(160).optional(),
  gallery: z.array(z.string().trim().url()).max(15).default([]),
  galleryAssetIds: z.array(z.string()).max(15).optional(),
  facilities: z.array(z.string().trim().min(2).max(80)).max(24).default([]),
  gymType: z.string().trim().max(80).optional(),
  openingHoursSummary: z.string().trim().max(160).optional(),
  appStoreUrl: z.string().trim().url().optional().or(z.literal("")),
  playStoreUrl: z.string().trim().url().optional().or(z.literal("")),
});

const organizationBillingDetailsSchema = z.object({
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

const saasBillingMandateSchema = z.object({
  amountPaise: z.number().int().positive().max(2_000_000).optional(),
});

const saasUpgradeSchema = z.object({
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

const diagnosticsThrowSchema = z.object({
  mode: z.enum(["handled", "unhandled"]).default("handled"),
});

const planAssignSchema = z.object({
  assignedToUserId: z.string().optional(),
  audience: z.enum(["selected_member"]).default("selected_member"),
});

const planProgressInputSchema = z.object({
  orgId: z.string().optional(),
  progressJson: z.record(z.string(), z.any()).default({}),
  completionPct: z.number().int().min(0).max(100).default(0),
  feedback: z.string().max(500).optional(),
});

const planCompletionInputSchema = z.object({
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

const notificationBulkReadSchema = z.object({
  ids: z.array(z.string()).max(100).default([]),
});

const classInputSchema = z.object({
  branchId: z.string(),
  trainerId: z.string(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  classType: z.string().trim().min(2).max(80),
  maxCapacity: z.number().int().positive().max(500),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  recurrenceRule: z.string().trim().max(240).optional(),
});

const aiChatSchema = z.object({
  prompt: z.string().trim().min(2).max(2_000),
  orgId: z.string().optional(),
  conversationId: z.string().optional(),
});

const aiGenerateSchema = z.object({
  prompt: z.string().trim().min(2).max(2_000),
  orgId: z.string(),
  targetUserId: z.string().optional(),
  title: z.string().trim().min(2).max(120).optional(),
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
    .optional(),
  persistDraft: z.boolean().default(true),
});

function clean<T extends Record<string, unknown>>(input: T): any {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

async function isFeatureFlagEnabled(key: string, orgId?: string) {
  const flag = await prisma.featureFlag.findUnique({ where: { key } });
  if (!flag) {
    return false;
  }
  if (orgId && flag.overrideOrgIds.includes(orgId)) {
    return true;
  }
  return flag.enabled && flag.rolloutPercent > 0;
}

function assertNotImpersonating(ctx: { impersonationSessionId?: string }, action: string) {
  if (ctx.impersonationSessionId) {
    throw forbiddenError(`${action} is blocked during impersonation.`);
  }
}

function jsonObject(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function refundPaymentForActor(input: {
  request: NextRequest;
  paymentId: string;
  actorUserId: string;
  reason: string;
  amountPaise?: number;
  platformRefund?: boolean;
}) {
  const payment = await prisma.payment.findUnique({ where: { id: input.paymentId } });
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
  const requiresProviderRefund = Boolean(payment.providerRef && payment.provider);
  const existingRefunds = await prisma.paymentRefund.findMany({
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
  const provider = requiresProviderRefund ? getPaymentProviderOrThrow() : null;
  const requestedRefund = await prisma.paymentRefund.create({
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
  const nextRefundedAmountPaise = alreadyRefundedPaise + refundAmountPaise;
  const nextStatus =
    nextRefundedAmountPaise >= payment.amountPaise ? "REFUNDED" : "PARTIALLY_REFUNDED";
  const [updatedRefund, updated] = await prisma.$transaction([
    prisma.paymentRefund.update({
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
    }),
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: nextStatus,
        metadata: {
          ...jsonObject(payment.metadata),
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
    }),
  ]);
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

async function assertSingleRoleForOrgUser(
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

function sha256(value: string) {
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

function sharedSessionCookieOptions(request: NextRequest, expires: Date, path = "/") {
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

async function revokeActiveSessionsForUsers(userIds: string[]) {
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

function responseBodyForStorage(text: string): Prisma.InputJsonValue {
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
    ["orgs", /.+/, "payments", /.+/, "receipt"],
    ["orgs", /.+/, "payments", /.+/, "invoice"],
    ["orgs", /.+/, "shop", "orders", /.+/, "manual-payment"],
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
  const idempotency = (prisma as any).requestIdempotency;
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

function parseMemberProfileNotes(notes?: string | null) {
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

function operationalDateKey(date = new Date(), timeZone = "Asia/Kolkata") {
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

function entryCodeForAttendanceId(id: string) {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) % 10_000;
  }
  return `ZK-${String(hash).padStart(4, "0")}`;
}

function attendanceWithEntryCode<T extends { id: string }>(record: T) {
  return { ...record, entryCode: entryCodeForAttendanceId(record.id) };
}

function addDaysToDate(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

async function getSaasPlanCatalog() {
  const setting = await prisma.platformSetting.findUnique({ where: { key: "saas.pricing" } });
  return saasPlanCatalogFromSetting(setting?.value);
}

async function getSaasPricing() {
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

async function getOrgSaasEntitlements(orgId: string): Promise<{
  tier: SaasTier;
  entitlements: SaasEntitlements;
}> {
  const [catalog, tier] = await Promise.all([getSaasPlanCatalog(), getOrgSaasTier(orgId)]);
  return { tier, entitlements: catalog[tier].entitlements };
}

function assertLimitAvailable(input: {
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

async function assertSaasMemberCapacity(orgId: string, userId?: string) {
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

async function assertSaasMemberCapacityForUsers(orgId: string, userIds: string[]) {
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

async function getOrgSaasUsage(orgId: string) {
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

async function assertSaasAiAllowance(orgId: string, requestType: AIRequestType) {
  const [{ tier, entitlements }, usage] = await Promise.all([
    getOrgSaasEntitlements(orgId),
    getOrgSaasUsage(orgId),
  ]);
  if (requestType === "IMAGE") {
    assertLimitAvailable({
      limit: entitlements.aiImageMonthlyLimit,
      used: usage.aiImageMonthlyCount,
      label: "Monthly AI image",
      tier,
    });
    return;
  }
  assertLimitAvailable({
    limit: entitlements.aiTextMonthlyLimit,
    used: usage.aiTextMonthlyCount,
    label: "Monthly AI text",
    tier,
  });
}

function priceForSaasPlan(
  pricing: Awaited<ReturnType<typeof getSaasPricing>>,
  tier: PaidSaasTier,
  billingCycle: SaasBillingCycle,
) {
  return billingCycle === "YEARLY" ? pricing[tier].yearly : pricing[tier].monthly;
}

function renewalAfter(start: Date, billingCycle: SaasBillingCycle) {
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

type EngagementBadgePayload = {
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

async function getBadgePayloads(userId: string, orgId?: string) {
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

async function awardEngagementBadges(input: { userId: string; orgId: string }) {
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

async function getEngagementSummary(userId: string, orgId?: string) {
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

function checkInCodeForQrNonce(nonce: string) {
  const digest = createHash("sha256").update(`check-in:${nonce}`).digest();
  const letters = [digest[0], digest[1]]
    .map((value) => String.fromCharCode(65 + ((value ?? 0) % 26)))
    .join("");
  const digits = digest.readUInt32BE(2) % 10_000;
  return `${letters}-${String(digits).padStart(4, "0")}`;
}

function normalizeCheckInCode(input: string) {
  const compact = input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const match = /^([A-Z]{2})([0-9]{4})$/.exec(compact);
  return match ? `${match[1]}-${match[2]}` : "";
}

async function resolveOrgBranch(orgId: string, branchId?: string | null) {
  const branch = branchId
    ? await prisma.branch.findFirst({ where: { id: branchId, orgId, active: true } })
    : await prisma.branch.findFirst({ where: { orgId, isDefault: true, active: true } });
  if (!branch) {
    throw notFoundError(branchId ? "Branch not found" : "Default branch not found");
  }
  return branch;
}

async function assertBranchManager(orgId: string, managerId?: string | null) {
  if (!managerId) {
    return;
  }
  const assignment = await prisma.organizationRoleAssignment.findFirst({
    where: { orgId, userId: managerId, role: { in: ["OWNER", "ADMIN"] } },
  });
  if (!assignment) {
    throw validationError("Branch manager must be an active owner or admin.");
  }
}

function isDeskOnlyContext(ctx: Awaited<ReturnType<typeof getRequestContext>>) {
  return (
    !ctx.isPlatformAdmin &&
    ctx.roles.includes("RECEPTIONIST") &&
    !ctx.roles.some((role) => role === "OWNER" || role === "ADMIN")
  );
}

async function assertBranchAccessForContext(
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

function queryBranchId(request: NextRequest) {
  const value = request.nextUrl.searchParams.get("branchId")?.trim();
  return value || undefined;
}

function isAllBranchesRequest(branchId?: string | null) {
  return branchId === "all";
}

async function enrichAttendanceRecords<
  T extends { id: string; branchId: string; subscriptionId?: string | null },
>(records: T[]) {
  if (!records.length) {
    return [];
  }

  const branchIds = [...new Set(records.map((record) => record.branchId))];
  const subscriptionIds = [
    ...new Set(
      records
        .map((record) => record.subscriptionId)
        .filter((subscriptionId): subscriptionId is string => Boolean(subscriptionId)),
    ),
  ];

  const [branches, subscriptions] = await Promise.all([
    prisma.branch.findMany({
      where: { id: { in: branchIds } },
      select: { id: true, name: true },
    }),
    subscriptionIds.length
      ? prisma.memberSubscription.findMany({
          where: { id: { in: subscriptionIds } },
          select: { id: true, planId: true },
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
  const planIdsBySubscriptionId = new Map(
    subscriptions.map((subscription) => [subscription.id, subscription.planId]),
  );
  const planNamesById = new Map(plans.map((plan) => [plan.id, plan.name]));

  return records.map((record) => ({
    ...attendanceWithEntryCode(record),
    branchName: branchNamesById.get(record.branchId) ?? null,
    planName: record.subscriptionId
      ? (planNamesById.get(planIdsBySubscriptionId.get(record.subscriptionId) ?? "") ?? null)
      : null,
  }));
}

async function findFileAssetOrThrow(fileId: string) {
  const asset = await prisma.fileAsset.findUnique({ where: { id: fileId } });
  if (!asset || asset.deletedAt) {
    throw notFoundError("File not found");
  }
  return asset;
}

async function getOrganizationScopedFileAsset(
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

function uniqueStringList(values: Array<string | null | undefined>, limit: number) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
    if (result.length >= limit) break;
  }
  return result;
}

async function resolveProductImageUrls(
  orgId: string,
  input: {
    imageAssetId?: string | undefined;
    imageAssetIds?: string[] | undefined;
    imageUrl?: string | undefined;
    imageUrls?: string[] | undefined;
  },
) {
  const assetIds = uniqueStringList(
    input.imageAssetIds?.length ? input.imageAssetIds : [input.imageAssetId],
    6,
  );
  const assets = await Promise.all(
    assetIds.map((assetId) => getOrganizationScopedFileAsset(assetId, orgId, ["product_image"])),
  );
  return uniqueStringList(
    [
      ...assets.map((asset) => asset?.url),
      ...(input.imageUrls?.length ? input.imageUrls : [input.imageUrl]),
    ],
    6,
  );
}

function hasProductImageInput(input: {
  imageAssetId?: string | undefined;
  imageAssetIds?: string[] | undefined;
  imageUrl?: string | undefined;
  imageUrls?: string[] | undefined;
}) {
  return (
    input.imageAssetId !== undefined ||
    input.imageAssetIds !== undefined ||
    input.imageUrl !== undefined ||
    input.imageUrls !== undefined
  );
}

async function getUserScopedFileAsset(input: {
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

async function resolveFileUrl(
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

async function parseFileUploadRequest(request: NextRequest) {
  const formData = await request.formData();
  const category = uploadCategorySchema.parse(formData.get("category"));
  const rawOrgId = formData.get("orgId")?.toString().trim();
  const rawVisibility = formData.get("visibility")?.toString().trim() ?? undefined;
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw validationError("Upload requires a file field.");
  }

  const visibility = resolveFileVisibility(category, rawVisibility);
  const storageProvider = getStorageProviderOrThrow();
  const fileBytes = new Uint8Array(await file.arrayBuffer());
  const declaredContentType = file.type || "application/octet-stream";
  const contentType = await detectUploadContentType(fileBytes, declaredContentType);
  let validated;
  try {
    validated = storageProvider.validateFile({
      category,
      contentType,
      sizeBytes: file.size,
      originalName: file.name,
      visibility,
    });
  } catch (error) {
    if (error instanceof Error && /^File exceeds\b/.test(error.message)) {
      throw payloadTooLargeError(error.message, {
        category,
        maxSizeBytes: storageProvider.validateFile({
          category,
          contentType,
          sizeBytes: 1,
          originalName: file.name,
          visibility,
        }).maxSizeBytes,
      });
    }
    throw validationError(error instanceof Error ? error.message : "Invalid upload.");
  }

  return {
    fileBytes,
    category,
    visibility,
    orgId: rawOrgId || undefined,
    validated,
  };
}

async function detectUploadContentType(fileBytes: Uint8Array, declaredContentType: string) {
  const declared = declaredContentType.trim().toLowerCase();
  const detected = await fileTypeFromBuffer(fileBytes);
  if (detected?.mime) {
    const detectedMime = detected.mime.toLowerCase();
    if (declared !== "application/octet-stream" && declared !== detectedMime) {
      throw validationError("Uploaded file content does not match its declared type.");
    }
    return detectedMime;
  }

  const prefix = Buffer.from(fileBytes.slice(0, 512)).toString("utf8").trimStart();
  if (declared === "image/svg+xml" && /^<(\?xml\b[^>]*>\s*)?<svg[\s>]/i.test(prefix)) {
    return declared;
  }
  if (declared === "application/json" && /^[{[]/.test(prefix)) {
    JSON.parse(Buffer.from(fileBytes).toString("utf8"));
    return declared;
  }
  throw validationError("Uploaded file content does not match an allowed file type.");
}

function startOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function startOfMonth(date = new Date()) {
  const value = new Date(date);
  value.setDate(1);
  value.setHours(0, 0, 0, 0);
  return value;
}

function pathMatches(path: string[], pattern: Array<string | RegExp>) {
  if (path.length !== pattern.length) {
    return false;
  }
  return pattern.every((part, index) =>
    typeof part === "string" ? part === path[index] : part.test(path[index] ?? ""),
  );
}

function parseCursorPagination(request: NextRequest, defaultLimit: number, maxLimit: number) {
  const rawLimit = Number(request.nextUrl.searchParams.get("limit") ?? defaultLimit);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.floor(rawLimit), 1), maxLimit)
    : defaultLimit;
  const cursor = request.nextUrl.searchParams.get("cursor")?.trim() || undefined;
  return { limit, cursor };
}

function pageResult<T extends { id: string }>(items: T[], limit: number) {
  const hasMore = items.length > limit;
  const pageItems = hasMore ? items.slice(0, limit) : items;
  return {
    items: pageItems,
    nextCursor: hasMore ? (pageItems.at(-1)?.id ?? null) : null,
  };
}

async function listOrganizationMembersPage(orgId: string, request: NextRequest, branchId?: string) {
  const { limit, cursor } = parseCursorPagination(request, 50, 100);
  const scopedUserIds = branchId
    ? (
        await prisma.memberSubscription.findMany({
          where: { orgId, branchId },
          select: { memberUserId: true },
          distinct: ["memberUserId"],
        })
      ).map((subscription) => subscription.memberUserId)
    : undefined;
  const profiles = await prisma.memberProfile.findMany({
    where: { orgId, ...(scopedUserIds ? { userId: { in: scopedUserIds } } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const page = pageResult(profiles, limit);
  const memberUserIds = page.items.map((profile) => profile.userId);
  const [users, subscriptions, attendance, payments] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: memberUserIds } } }),
    prisma.memberSubscription.findMany({
      where: { orgId, memberUserId: { in: memberUserIds } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.attendanceRecord.findMany({
      where: { orgId, userId: { in: memberUserIds } },
      orderBy: { checkedInAt: "desc" },
      take: Math.max(memberUserIds.length * 3, 20),
    }),
    prisma.payment.findMany({
      where: { orgId, userId: { in: memberUserIds } },
      orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
      take: Math.max(memberUserIds.length * 3, 20),
    }),
  ]);
  const usersById = new Map(users.map((user) => [user.id, user]));
  const planIds = Array.from(new Set(subscriptions.map((subscription) => subscription.planId)));
  const plans = planIds.length
    ? await prisma.membershipPlan.findMany({
        where: { orgId, id: { in: planIds } },
        select: { id: true, name: true, type: true },
      })
    : [];
  const plansById = new Map(plans.map((plan) => [plan.id, plan]));
  return {
    members: page.items.map((profile) => {
      const user = usersById.get(profile.userId) ?? null;
      const activeSubscription =
        subscriptions.find(
          (subscription) =>
            subscription.memberUserId === profile.userId && subscription.status === "ACTIVE",
        ) ??
        subscriptions.find((subscription) => subscription.memberUserId === profile.userId) ??
        null;
      return {
        profile,
        user: user ? serializeUserForClient(user) : null,
        lastCheckIn: attendance.find((record) => record.userId === profile.userId) ?? null,
        recentCheckIns: attendance
          .filter((record) => record.userId === profile.userId)
          .slice(0, 3)
          .map(attendanceWithEntryCode),
        lastPayment: payments.find((payment) => payment.userId === profile.userId) ?? null,
        activeSubscription: activeSubscription
          ? { ...activeSubscription, plan: plansById.get(activeSubscription.planId) ?? null }
          : null,
      };
    }),
    nextCursor: page.nextCursor,
    limit,
  };
}

async function listOrganizationPaymentsPage(orgId: string, request: NextRequest) {
  const { limit, cursor } = parseCursorPagination(request, 50, 100);
  const ctx = await getRequestContext(request, { orgId });
  const branchId = await assertBranchAccessForContext(ctx, orgId, queryBranchId(request));
  const payments = await prisma.payment.findMany({
    where: { orgId, ...(branchId ? { branchId } : {}) },
    orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const page = pageResult(payments, limit);
  const users = await prisma.user.findMany({
    where: {
      id: { in: page.items.map((payment) => payment.userId).filter(Boolean) as string[] },
    },
  });
  const refunds = page.items.length
    ? await prisma.paymentRefund.findMany({
        where: { orgId, paymentId: { in: page.items.map((payment) => payment.id) } },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const usersById = new Map(users.map((user) => [user.id, user]));
  return {
    payments: page.items.map((payment) => {
      const user = payment.userId ? usersById.get(payment.userId) : undefined;
      const paymentRefunds = refunds.filter((refund) => refund.paymentId === payment.id);
      return {
        ...payment,
        refunds: paymentRefunds,
        refundedAmountPaise: paymentRefunds
          .filter((refund) => !["FAILED", "CANCELLED"].includes(refund.status))
          .reduce((total, refund) => total + refund.amountPaise, 0),
        user: user ? { ...user, email: publicUserEmail(user.email) ?? "" } : null,
      };
    }),
    nextCursor: page.nextCursor,
    limit,
  };
}

async function listOrganizationAttendancePage(orgId: string, request: NextRequest) {
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

async function listOrganizationAuditLogsPage(orgId: string, request: NextRequest) {
  const { limit, cursor } = parseCursorPagination(request, 100, 200);
  const logs = await prisma.auditLog.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const page = pageResult(logs, limit);
  return { auditLogs: page.items, nextCursor: page.nextCursor, limit };
}

async function listTrackingWorkouts(userId: string) {
  const workouts = await prisma.workoutSession.findMany({
    where: { userId, deletedAt: null },
    orderBy: { startedAt: "desc" },
    take: 100,
  });
  const exercises = await prisma.workoutExerciseEntry.findMany({
    where: { workoutSessionId: { in: workouts.map((workout) => workout.id) } },
    orderBy: [{ workoutSessionId: "asc" }, { orderIndex: "asc" }],
  });

  return workouts.map((workout) => ({
    ...workout,
    exercises: exercises.filter((exercise) => exercise.workoutSessionId === workout.id),
  }));
}

async function listPlanAssignmentsForUser(userId: string, assignmentId?: string) {
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

function toTrackingWorkoutRecord(input: {
  id: string;
  userId: string;
  organizationId: string | null;
  title: string;
  workoutType: string;
  startedAt: Date;
  endedAt: Date | null;
  durationMinutes: number | null;
  intensity: string | null;
  notes: string | null;
  mood: string | null;
  visibility: "PRIVATE" | "TRAINER_VISIBLE";
}) {
  return {
    id: input.id,
    userId: input.userId,
    ...(input.organizationId ? { organizationId: input.organizationId } : {}),
    title: input.title,
    workoutType: input.workoutType,
    startedAt: input.startedAt,
    ...(input.endedAt ? { endedAt: input.endedAt } : {}),
    ...(input.durationMinutes !== null ? { durationMinutes: input.durationMinutes } : {}),
    ...(input.intensity ? { intensity: input.intensity } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
    ...(input.mood ? { mood: input.mood } : {}),
    visibility: input.visibility,
  };
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

function isDateUnder18(date: Date) {
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDelta = today.getMonth() - date.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < date.getDate())) {
    age -= 1;
  }
  return age < 18;
}

function serializeUserForClient<T extends { id: string; email: string; phone?: string | null }>(
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

async function getUserByIdentifierOrCreate(identifier: { kind: "email" | "phone"; value: string }) {
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

function getGoogleAuthAudiences() {
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

function getAppleAuthAudiences() {
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

async function verifyRemoteJwt(input: {
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

function providerEmailVerified(payload: Record<string, unknown>) {
  return payload.email_verified === true || payload.email_verified === "true";
}

function displayNameFromProvider(input: {
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

async function getUserBySsoIdentityOrCreate(input: {
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

async function createAuthSessionResponse(
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

async function refreshAuthSession(refreshToken: string) {
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

function setSessionCookie(
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

function assertLocalQaIdentityAllowed() {
  if (!localQaIdentitiesAllowed()) {
    throw validationError("Fresh QA identities are only available in local development.");
  }
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

async function getDemoQaUserOrCreate() {
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

async function createSeededDemoOtpChallenge(input: {
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

async function getAuthUserForVerifiedIdentifier(identifier: {
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

async function markUserIdentifierVerified(
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

function contactOtpPurpose(userId: string, kind: "email" | "phone") {
  return `contact_update:${userId}:${kind}`;
}

async function assertContactIdentifierAvailable(
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

async function ensureOrganizationMembership(input: {
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
  await prisma.organizationUser.upsert({
    where: { orgId_userId: { orgId: input.orgId, userId: input.userId } },
    update: { status: "active", leftAt: null },
    create: {
      orgId: input.orgId,
      userId: input.userId,
      joinedAt: input.joinedAt ?? new Date(),
      status: "active",
    },
  });
  await assertSingleRoleForOrgUser(prisma, {
    orgId: input.orgId,
    userId: input.userId,
    nextRole: "MEMBER",
  });
  await prisma.organizationRoleAssignment.upsert({
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
  await prisma.memberProfile.upsert({
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

async function createDirectNotification(input: {
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

async function fanOutPlatformBroadcast(input: {
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

async function processVerifiedPaymentWebhookEvent(input: {
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
            ensureMembership: ensureOrganizationMembership,
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
          ensureMembership: ensureOrganizationMembership,
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
      ensureMembership: ensureOrganizationMembership,
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

function getObjectMetadata(value: Prisma.JsonValue | null | undefined) {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return {} as Record<string, unknown>;
  }
  return value as Record<string, unknown>;
}

type BillingDocumentKind = "receipt" | "invoice";

type BillingOrgDetails = {
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

function missingBillingDetails(org: BillingOrgDetails, kind: BillingDocumentKind) {
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

async function ensurePaymentReceipt(input: { orgId: string; paymentId: string; userId?: string }) {
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

async function ensurePaymentInvoice(input: { orgId: string; paymentId: string; userId?: string }) {
  const { org, payment, user } = await getPaymentDocumentContext(input);
  if (payment.status !== "SUCCEEDED" && payment.status !== "PARTIALLY_REFUNDED") {
    throw conflictError("Invoices can be generated only after a payment succeeds.");
  }
  const invoice = await ensurePaymentInvoiceDocument({ org, payment, user });
  return { org, payment, user, invoice };
}

function receiptHtml(input: Awaited<ReturnType<typeof ensurePaymentReceipt>>) {
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

function invoiceHtml(input: Awaited<ReturnType<typeof ensurePaymentInvoice>>) {
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

async function invoicePdfResponse(input: {
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

async function invoiceSignedUrl(invoice: { pdfAssetId: string | null; pdfFileAssetId: string | null }) {
  const assetId = invoice.pdfAssetId ?? invoice.pdfFileAssetId;
  if (!assetId) return null;
  const asset = await prisma.fileAsset.findFirst({ where: { id: assetId, deletedAt: null } });
  return asset ? resolveFileUrl(asset, true) : null;
}

function publicTrainerPhotoUrl(value: string | null | undefined) {
  if (!value || value.startsWith("/api/files/")) {
    return null;
  }
  return value;
}

async function assertOrgUser(input: { orgId: string; userId: string; role?: OrgRole }) {
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

function assertActiveContextOrg(ctx: { orgId?: string; orgStatus?: string }, orgId?: string) {
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

function getPaymentProviderOrThrow() {
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

function getEmailProviderOrThrow() {
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

function getSmsProviderOrThrow() {
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

function getMapProviderOrThrow() {
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

function getAIProviderOrThrow() {
  const diagnostics = getAIProviderDiagnostics();
  if (
    diagnostics.status === "misconfigured" ||
    diagnostics.status === "unsupported" ||
    diagnostics.status === "disabled"
  ) {
    throw validationError("The assistant is not available right now.");
  }
  return getAIProvider();
}

function getStorageProviderOrThrow() {
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

function getPushProviderOrThrow() {
  const diagnostics = getPushProviderDiagnostics();
  if (
    diagnostics.status === "misconfigured" ||
    diagnostics.status === "unsupported" ||
    diagnostics.status === "disabled"
  ) {
    throw validationError("Push alerts are not available right now.");
  }
  return getPushProvider();
}

function getWhatsAppProviderOrThrow() {
  const diagnostics = getWhatsAppProviderDiagnostics();
  if (
    diagnostics.status === "misconfigured" ||
    diagnostics.status === "unsupported" ||
    diagnostics.status === "disabled"
  ) {
    throw validationError("WhatsApp alerts are not available right now.");
  }
  return getWhatsAppProvider();
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

async function startPaymentSessionCheckout(input: {
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

const mockPaymentCompletionAdminPermissions: Permission[] = [
  "PAYMENTS_VIEW",
  "PAYMENTS_RECORD_OFFLINE",
  "ORG_MANAGE_BILLING",
];

function hasAnyPermission(ctx: { permissions: Permission[] }, permissionOptions: Permission[]) {
  return permissionOptions.some((permission) => ctx.permissions.includes(permission));
}

function assertCanCompleteMockPayment(
  ctx: Awaited<ReturnType<typeof getRequestContext>>,
  session: {
    orgId: string | null;
    userId: string | null;
  },
) {
  if (!ctx.userId) {
    throw unauthorizedError();
  }
  const ownsSession = Boolean(session.userId && ctx.userId === session.userId);
  const canManageOrgPayment = Boolean(
    session.orgId &&
    ctx.orgId === session.orgId &&
    hasAnyPermission(ctx, mockPaymentCompletionAdminPermissions),
  );
  if (!ownsSession && !canManageOrgPayment && !ctx.isPlatformAdmin) {
    throw forbiddenError("Payment session does not belong to this user.");
  }
}

const liveMandateStatuses: PaymentMandateStatus[] = [
  "CREATED",
  "AUTHENTICATED",
  "ACTIVE",
  "PENDING",
  "HALTED",
  "PAUSED",
];

function providerMandateStatusToLocal(status: string): PaymentMandateStatus {
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

async function generateUserDataExport(input: { userId: string; orgId?: string }) {
  const [
    user,
    memberships,
    attendance,
    payments,
    consents,
    exportRequests,
    deletionRequests,
    shopOrders,
    planAssignments,
    workouts,
    progressEntries,
    habits,
  ] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: input.userId } }),
    prisma.memberSubscription.findMany({
      where: clean({
        memberUserId: input.userId,
        orgId: input.orgId ?? undefined,
      }),
      orderBy: { createdAt: "desc" },
    }),
    prisma.attendanceRecord.findMany({
      where: clean({
        userId: input.userId,
        orgId: input.orgId ?? undefined,
      }),
      orderBy: { checkedInAt: "desc" },
    }),
    prisma.payment.findMany({
      where: clean({
        userId: input.userId,
        orgId: input.orgId ?? undefined,
      }),
      orderBy: { createdAt: "desc" },
    }),
    prisma.consentRecord.findMany({
      where: clean({
        userId: input.userId,
        orgId: input.orgId ?? undefined,
      }),
      orderBy: { createdAt: "desc" },
    }),
    prisma.dataExportRequest.findMany({
      where: { userId: input.userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.accountDeletionRequest.findMany({
      where: { userId: input.userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.shopOrder.findMany({
      where: clean({
        userId: input.userId,
        orgId: input.orgId ?? undefined,
      }),
      orderBy: { createdAt: "desc" },
    }),
    prisma.planAssignment.findMany({
      where: clean({
        assignedToUserId: input.userId,
        orgId: input.orgId ?? undefined,
      }),
      orderBy: { createdAt: "desc" },
    }),
    prisma.workoutSession.findMany({
      where: clean({
        userId: input.userId,
        organizationId: input.orgId ?? undefined,
        deletedAt: null,
      }),
      orderBy: { startedAt: "desc" },
    }),
    prisma.bodyProgressEntry.findMany({
      where: clean({
        userId: input.userId,
        organizationId: input.orgId ?? undefined,
      }),
      orderBy: { measuredAt: "desc" },
    }),
    prisma.memberHabit.findMany({
      where: clean({
        userId: input.userId,
        organizationId: input.orgId ?? undefined,
      }),
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const recipients = await prisma.notificationRecipient.findMany({
    where: { userId: input.userId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const notifications = recipients.length
    ? await prisma.notification.findMany({
        where: { id: { in: recipients.map((recipient) => recipient.notificationId) } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const payload = {
    exportedAt: new Date().toISOString(),
    scope: input.orgId ? { orgId: input.orgId } : { scope: "all_orgs" },
    user,
    memberships,
    attendance,
    payments,
    consents,
    exportRequests,
    deletionRequests,
    shopOrders,
    planAssignments,
    workouts,
    progressEntries,
    habits,
    notifications: recipients.map((recipient) => ({
      ...recipient,
      notification:
        notifications.find((notification) => notification.id === recipient.notificationId) ?? null,
    })),
  };

  const body = Buffer.from(JSON.stringify(payload, null, 2), "utf8");
  const checksum = createHash("sha256").update(body).digest("hex");
  const key = buildStorageKey({
    category: "privacy_export",
    ...(input.orgId ? { orgId: input.orgId } : {}),
    ownerUserId: input.userId,
    originalName: `zook-data-export-${input.userId}.json`,
  });
  const storageProvider = getStorageProviderOrThrow();
  const upload = await storageProvider.uploadFile({
    category: "privacy_export",
    key,
    body,
    contentType: "application/json",
    sizeBytes: body.length,
    originalName: `zook-data-export-${input.userId}.json`,
    visibility: "private",
    cacheControl: "private, max-age=0, no-store",
  });
  const signedUrl = await storageProvider.getSignedUrl({ key, expiresInSeconds: 24 * 60 * 60 });
  const fileAsset = await prisma.fileAsset.create({
    data: {
      ...(input.orgId ? { orgId: input.orgId } : {}),
      ownerUserId: input.userId,
      originalName: `zook-data-export-${input.userId}.json`,
      storageKey: key,
      url: upload.url,
      mimeType: "application/json",
      sizeBytes: body.length,
      purpose: "data_export",
      category: "privacy_export",
      visibility: "private",
      storageProvider: storageProvider.getDiagnostics().provider,
      checksum,
      metadata: {
        recordCount:
          memberships.length +
          attendance.length +
          payments.length +
          consents.length +
          shopOrders.length +
          planAssignments.length +
          workouts.length +
          progressEntries.length +
          habits.length +
          recipients.length,
      } as Prisma.InputJsonValue,
    },
  });

  return {
    fileAssetId: fileAsset.id,
    exportUrl: signedUrl,
    checksum,
    recordCount:
      memberships.length +
      attendance.length +
      payments.length +
      consents.length +
      shopOrders.length +
      planAssignments.length +
      workouts.length +
      progressEntries.length +
      habits.length +
      recipients.length,
  };
}

function currentAIProviderType(): "MOCK" | "OPENAI" {
  return getAIProviderDiagnostics().activeProvider === "openai" ? "OPENAI" : "MOCK";
}

function assertAiLaunchEnabled() {
  if (process.env.AI_FEATURES_ENABLED !== "true") {
    throw serviceUnavailableError(
      "AI plan assistant is coming soon. Trainers can create, review, assign, and send plans manually.",
      {
        expectedFormat: "AI_FEATURES_ENABLED=true",
      },
    );
  }
}

function summarizeAIResponse(response: string | Record<string, unknown>) {
  return (typeof response === "string" ? response : JSON.stringify(response)).slice(0, 120);
}

function aiConsentAllowed(user: { aiConsent: boolean }) {
  return user.aiConsent || process.env.NODE_ENV === "development";
}

function planRequiresExercises(type: PlanType) {
  return [
    "WORKOUT",
    "EXERCISE_ROUTINE",
    "TRANSFORMATION_PROGRAM",
    "MACHINE_GUIDE",
    "RECOVERY",
  ].includes(type);
}

function normalizedStructuredPlanContent(response: string | Record<string, unknown>) {
  if (typeof response === "string") {
    return {
      title: "Trainer plan",
      type: "WORKOUT",
      days: [
        {
          name: "Draft notes",
          exercises: response
            .split(/\n+/)
            .map((line) => line.trim())
            .filter(Boolean)
            .slice(0, 8)
            .map((line) => ({ name: line })),
        },
      ],
      notes: "Generated text was normalized into a trainer-reviewed draft.",
    };
  }
  if (Array.isArray(response.days) || Array.isArray(response.exercises)) {
    return response;
  }
  if (Array.isArray(response.sections)) {
    const exercises = response.sections
      .flatMap((section) => {
        if (!section || typeof section !== "object") {
          return [];
        }
        const record = section as Record<string, unknown>;
        const body = typeof record.body === "string" ? record.body : "";
        return body
          .split(/\n+|[.;]/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => ({ name: line.slice(0, 120) }));
      })
      .slice(0, 12);
    return exercises.length
      ? {
          ...response,
          days: [{ name: "Draft session", exercises }],
        }
      : response;
  }
  return response;
}

async function resolveAIQuotaState(input: { userId: string; role: OrgRole }) {
  const today = startOfDay();
  const monthStart = startOfMonth();
  const [usedTextDaily, usedTextMonth, usedImagesMonth] = await Promise.all([
    prisma.aIUsageLog.count({
      where: {
        userId: input.userId,
        requestType: { in: ["CHAT", "STRUCTURED_PLAN"] },
        createdAt: { gte: today },
      },
    }),
    prisma.aIUsageLog.count({
      where: {
        userId: input.userId,
        requestType: { in: ["CHAT", "STRUCTURED_PLAN"] },
        createdAt: { gte: monthStart },
      },
    }),
    prisma.aIUsageLog.count({
      where: {
        userId: input.userId,
        requestType: "IMAGE",
        createdAt: { gte: monthStart },
      },
    }),
  ]);
  return buildAIQuotaState(input.role, { usedTextDaily, usedTextMonth, usedImagesMonth });
}

async function persistAiConversation(input: {
  conversationId?: string;
  userId: string;
  orgId?: string;
  prompt: string;
  response: string | Record<string, unknown>;
  safetyFlags?: Prisma.InputJsonValue;
}) {
  const conversation =
    (input.conversationId
      ? await prisma.aIConversation.findFirst({
          where: { id: input.conversationId, userId: input.userId },
        })
      : null) ??
    (await prisma.aIConversation.create({
      data: clean({
        userId: input.userId,
        orgId: input.orgId,
        title: input.prompt.slice(0, 80),
      }),
    }));

  await prisma.aIMessage.createMany({
    data: [
      {
        conversationId: conversation.id,
        role: "user",
        content: input.prompt,
      },
      clean({
        conversationId: conversation.id,
        role: "assistant",
        content:
          typeof input.response === "string" ? input.response : JSON.stringify(input.response),
        safetyFlags: input.safetyFlags,
      }),
    ],
  });

  return conversation;
}

async function persistBlockedAiAttempt(input: {
  request: NextRequest;
  orgId?: string;
  userId: string;
  role: OrgRole;
  requestType: AIRequestType;
  prompt: string;
  error: AIGuardError;
}) {
  await prisma.aIUsageLog.create({
    data: clean({
      orgId: input.orgId,
      userId: input.userId,
      role: input.role,
      provider: currentAIProviderType(),
      requestType: input.requestType,
      promptSummary: input.prompt.slice(0, 120),
      responseSummary: input.error.message.slice(0, 120),
      quotaConsumed: 0,
      safetyFlags: input.error.safetyFlags as Prisma.InputJsonValue,
    }),
  });
  if (input.orgId) {
    await writeAuditLog({
      request: input.request,
      orgId: input.orgId,
      actorUserId: input.userId,
      action: "ai.request_blocked",
      entityType: "ai_usage",
      metadata: {
        reason: input.error.reason,
        requestType: input.requestType,
        flags: input.error.safetyFlags,
      },
    });
  }
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

function starterNotificationTemplates(orgId: string, createdById: string) {
  const templates: Array<{
    name: string;
    type: NotificationType;
    title: string;
    body: string;
  }> = [
    {
      name: "Renewal nudge",
      type: "PLAN",
      title: "Your membership is ending soon",
      body: "Renew at the desk or reply in the app if you want help choosing your next plan.",
    },
    {
      name: "Class moved",
      type: "OPERATIONAL",
      title: "Class timing changed",
      body: "Today's class has moved. Please check the new time before you leave for the gym.",
    },
    {
      name: "Holiday closure",
      type: "OPERATIONAL",
      title: "Gym closed for a holiday",
      body: "The gym will stay closed on the announced date. Regular timings resume after that.",
    },
    {
      name: "New plan launch",
      type: "PROMOTIONAL",
      title: "New membership plan available",
      body: "A new plan is now available. Open Zook or visit the desk to choose what fits you.",
    },
    {
      name: "Welcome new member",
      type: "TRANSACTIONAL",
      title: "Welcome to the gym",
      body: "Your membership is active. Show your QR code at the desk when you arrive.",
    },
    {
      name: "Birthday wish",
      type: "ENGAGEMENT",
      title: "Happy birthday",
      body: "Wishing you a strong year ahead. We are glad to have you with us.",
    },
    {
      name: "Stock arrival",
      type: "OPERATIONAL",
      title: "Shop item back in stock",
      body: "The item you asked about is back at the gym shop. Visit the desk to pick it up.",
    },
    {
      name: "Event update",
      type: "OPERATIONAL",
      title: "Gym event update",
      body: "An event update is available for members. Open Zook for the latest details.",
    },
  ];
  return templates.map((template) => ({
    orgId,
    createdById,
    active: true,
    ...template,
  }));
}

async function resolveNotificationRecipients(input: {
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

async function resolveNotificationPreview(input: {
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

async function enforceNotificationBudgets(input: {
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

async function getNotificationBudgetSnapshot(input: {
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

async function splitRecipientsByDailyCap(input: {
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

function toMembershipPlanInput(plan: {
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

async function resolveValidatedReferral(input: {
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

async function redeemReferralCodeForUser(input: {
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
  const existing = await prisma.referralRedemption.findFirst({
    where: { orgId: input.orgId, referralCodeId: referral.id, referredUserId: input.userId },
  });
  if (existing) {
    return { referral, redemption: existing, alreadyRedeemed: true };
  }
  const policy = await prisma.referralPolicy.upsert({
    where: { orgId: input.orgId },
    update: {},
    create: { orgId: input.orgId },
  });
  const reserved = await prisma.referralCode.updateMany({
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
  try {
    const redemption = await prisma.referralRedemption.create({
      data: {
        orgId: input.orgId,
        referralCodeId: referral.id,
        referredUserId: input.userId,
        metadata: { source: "redeem_endpoint" },
      },
    });
    return { referral, redemption, alreadyRedeemed: false };
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

async function generateUniqueReferralCode(seed: string) {
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

function computeDiscountPaise(input: {
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

async function applyAttendanceUsage(input: {
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

class PrismaAuthRepo {
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

export async function handleAuth(request: NextRequest, path: string[]) {
  if (request.method === "POST" && pathMatches(path, ["auth", "request-otp"])) {
    const body = requestOtpSchema.parse(await readJson(request));
    const ipAddress = getClientIp(request);
    const seededDemoLogin = isSeededDemoIdentifier(body.identifier);
    if (!seededDemoLogin) {
      await assertRateLimit(
        "otpRequestByIdentifier",
        body.identifier.value,
        "Too many one-time code requests for this account.",
      );
    }
    await assertRateLimit(
      "otpRequestByIp",
      ipAddress,
      "Too many one-time code requests from this IP.",
    );
    if (seededDemoLogin) {
      const challenge = await createSeededDemoOtpChallenge({
        identifier: body.identifier,
        ...(ipAddress !== "unknown" ? { ipAddress } : {}),
      });
      return ok({
        challengeId: challenge.id,
        expiresAt: challenge.expiresAt,
      });
    }
    if (isQaFreshIdentifier(body.identifier)) {
      assertLocalQaIdentityAllowed();
    } else if (isQaDemoIdentifier(body.identifier)) {
      await getDemoQaUserOrCreate();
    } else {
      await getUserByIdentifierOrCreate(body.identifier);
    }
    const auth = new AuthService(
      new PrismaAuthRepo(),
      getEmailProviderOrThrow(),
      () => new Date(),
      body.identifier.kind === "phone" ? getSmsProviderOrThrow() : undefined,
    );
    const challenge = await auth.requestOtp(
      body.identifier,
      ipAddress !== "unknown" ? { ipAddress } : {},
    );
    return ok({
      challengeId: challenge.id,
      expiresAt: challenge.expiresAt,
      devOtp: getDevOtpResponseValue(),
    });
  }
  if (request.method === "POST" && pathMatches(path, ["auth", "verify-otp"])) {
    const body = verifyOtpSchema.parse(await readJson(request));
    const ipAddress = getClientIp(request);
    const auth = new AuthService(new PrismaAuthRepo(), getEmailProviderOrThrow());
    if (!isSeededDemoIdentifier(body.identifier)) {
      await assertRateLimit(
        "otpVerifyByIdentifier",
        body.identifier.value,
        "Too many one-time code attempts for this account.",
      );
    }
    await assertRateLimit(
      "otpVerifyByIp",
      ipAddress,
      "Too many one-time code attempts from this IP.",
    );
    const user = await getAuthUserForVerifiedIdentifier(body.identifier);
    const session = await auth.verifyOtp(
      clean({
        identifier: body.identifier,
        code: body.code,
        userId: user.id,
        userAgent: request.headers.get("user-agent") ?? undefined,
        ipAddress,
      }),
    );
    await markUserIdentifierVerified(user.id, body.identifier);
    const sessionSummary = await resolveSessionSummaryFromToken(session.token);
    const response = ok({
      user: serializeUserForClient(user),
      token: session.token,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
      refreshExpiresAt: session.refreshExpiresAt,
      ...(sessionSummary ? { session: sessionSummary } : {}),
    });
    response.cookies.set(sessionCookieName, session.token, {
      ...sharedSessionCookieOptions(request, session.expiresAt),
    });
    response.cookies.set(refreshSessionCookieName, session.refreshToken, {
      ...sharedSessionCookieOptions(request, session.refreshExpiresAt),
    });
    return response;
  }
  if (request.method === "POST" && pathMatches(path, ["auth", "google", "callback"])) {
    const body = googleAuthCallbackSchema.parse(await readJson(request));
    const payload = await verifyRemoteJwt({
      token: body.idToken,
      jwksUrl: "https://www.googleapis.com/oauth2/v3/certs",
      issuers: ["https://accounts.google.com", "accounts.google.com"],
      audiences: getGoogleAuthAudiences(),
    });
    const email = typeof payload.email === "string" ? payload.email.toLowerCase() : null;
    const emailVerified = providerEmailVerified(payload);
    const user = await getUserBySsoIdentityOrCreate({
      provider: "GOOGLE",
      providerUserId: payload.sub as string,
      email,
      emailVerified,
      name: displayNameFromProvider({
        name: payload.name,
        email,
        fallback: "Zook member",
      }),
    });
    await writeAuditLog({
      request,
      actorUserId: user.id,
      action: "auth.google_login",
      entityType: "auth",
      entityId: user.id,
    });
    return createAuthSessionResponse(request, user);
  }
  if (request.method === "POST" && pathMatches(path, ["auth", "apple", "callback"])) {
    const body = appleAuthCallbackSchema.parse(await readJson(request));
    const payload = await verifyRemoteJwt({
      token: body.identityToken,
      jwksUrl: "https://appleid.apple.com/auth/keys",
      issuers: ["https://appleid.apple.com"],
      audiences: getAppleAuthAudiences(),
    });
    const email = typeof payload.email === "string" ? payload.email.toLowerCase() : null;
    const emailVerified = providerEmailVerified(payload);
    const user = await getUserBySsoIdentityOrCreate({
      provider: "APPLE",
      providerUserId: payload.sub as string,
      email,
      emailVerified,
      name: displayNameFromProvider({
        email,
        fallback: "Zook member",
        ...(body.fullName ? { explicitName: body.fullName } : {}),
      }),
    });
    await writeAuditLog({
      request,
      actorUserId: user.id,
      action: "auth.apple_login",
      entityType: "auth",
      entityId: user.id,
    });
    return createAuthSessionResponse(request, user);
  }
  if (request.method === "POST" && pathMatches(path, ["auth", "logout"])) {
    const token = extractSessionToken(request);
    if (token) {
      const auth = new AuthService(new PrismaAuthRepo(), getEmailProviderOrThrow());
      await auth.logout(token);
    }
    const logoutUrl = process.env.NEXT_PUBLIC_WEB_URL ?? "https://zookfit.in";
    const response = ok({ loggedOut: true, redirectUrl: new URL("/", logoutUrl).toString() });
    response.cookies.set(sessionCookieName, "", {
      ...sharedSessionCookieOptions(request, new Date(0)),
    });
    response.cookies.set(refreshSessionCookieName, "", {
      ...sharedSessionCookieOptions(request, new Date(0)),
    });
    response.cookies.set(refreshSessionCookieName, "", {
      ...sharedSessionCookieOptions(request, new Date(0), "/api/auth/refresh"),
    });
    return response;
  }
  if (request.method === "GET" && pathMatches(path, ["auth", "refresh"])) {
    const redirectTarget = request.nextUrl.searchParams.get("redirect");
    const safeRedirect =
      redirectTarget?.startsWith("/") && !redirectTarget.startsWith("//")
        ? redirectTarget
        : "/dashboard";
    try {
      const session = await refreshAuthSession(
        request.cookies.get(refreshSessionCookieName)?.value ?? "",
      );
      const response = NextResponse.redirect(new URL(safeRedirect, request.url));
      setSessionCookie(response, request, session.token, session.expiresAt);
      return response;
    } catch {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", safeRedirect);
      loginUrl.searchParams.set("reason", "expired");
      return NextResponse.redirect(loginUrl);
    }
  }
  if (request.method === "POST" && pathMatches(path, ["auth", "refresh"])) {
    const body = await readJson(request).catch(() => ({}));
    const refreshToken =
      typeof body === "object" && body && "refreshToken" in body
        ? String((body as { refreshToken?: unknown }).refreshToken ?? "")
        : (request.cookies.get(refreshSessionCookieName)?.value ?? "");
    const session = await refreshAuthSession(refreshToken);
    const response = ok(session);
    setSessionCookie(response, request, session.token, session.expiresAt);
    return response;
  }
  if (
    request.method === "GET" &&
    (pathMatches(path, ["auth", "me"]) ||
      pathMatches(path, ["auth", "session"]) ||
      pathMatches(path, ["auth", "sessions"]))
  ) {
    const token = extractSessionToken(request);
    const summary = await resolveSessionSummaryFromToken(
      token,
      request.headers.get("x-zook-org-id") ??
        request.nextUrl.searchParams.get("orgId") ??
        undefined,
    );
    if (!summary) {
      return fail("UNAUTHORIZED", "Authentication required", 401);
    }
    return ok(summary);
  }
  return undefined;
}

async function getReferralCodesPayload(input: {
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

async function flagReferralAbuseIfNeeded(input: {
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

export async function handleMeData(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["me", "orgs"])) {
    const token = extractSessionToken(request);
    const summary = await resolveSessionSummaryFromToken(
      token,
      request.headers.get("x-zook-org-id") ??
        request.nextUrl.searchParams.get("orgId") ??
        undefined,
    );
    if (!summary) {
      throw unauthorizedError();
    }
    return ok({ organizations: summary.organizations, activeOrgId: summary.activeOrgId });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "saas-subscription"])) {
    const requestedOrgId = request.nextUrl.searchParams.get("orgId") ?? undefined;
    const ctx = await getRequestContext(request, requestedOrgId ? { orgId: requestedOrgId } : {});
    requireAuth(ctx);
    const orgId = requestedOrgId ?? ctx.orgId;
    if (!orgId || !ctx.roles.some((role) => role === "OWNER" || role === "ADMIN")) {
      throw forbiddenError("Gym billing access required.");
    }
    const [org, subscription, mandate] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { id: true, name: true, status: true, trialStartAt: true, trialEndAt: true },
      }),
      prisma.saaSSubscription.findUnique({ where: { orgId } }),
      prisma.saaSBillingMandate.findUnique({ where: { orgId } }),
    ]);
    return ok({ org, subscription, mandate });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "dashboard"])) {
    const requestedOrgId = request.nextUrl.searchParams.get("orgId") ?? undefined;
    const ctx = await getRequestContext(request, requestedOrgId ? { orgId: requestedOrgId } : {});
    const userId = requireAuth(ctx);
    assertActiveContextOrg(ctx, requestedOrgId);
    const orgId = requestedOrgId ?? ctx.orgId;
    const [home, engagement, referral, preferences] = await Promise.all([
      getMemberHomeData(userId, orgId),
      getEngagementSummary(userId, orgId),
      getReferralCodesPayload({ userId, orgId, roles: ctx.roles }),
      prisma.userNotificationPreference.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      }),
    ]);
    return ok({ home, engagement, referral, preferences });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "home"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    return ok(await getMemberHomeData(userId, ctx.orgId));
  }
  if (request.method === "GET" && pathMatches(path, ["me", "engagement"])) {
    const requestedOrgId = request.nextUrl.searchParams.get("orgId") ?? undefined;
    const ctx = await getRequestContext(request, requestedOrgId ? { orgId: requestedOrgId } : {});
    const userId = requireAuth(ctx);
    assertActiveContextOrg(ctx, requestedOrgId);
    return ok(await getEngagementSummary(userId, requestedOrgId ?? ctx.orgId));
  }
  if (request.method === "GET" && pathMatches(path, ["me", "referral-codes"])) {
    const requestedOrgId = request.nextUrl.searchParams.get("orgId") ?? undefined;
    const ctx = await getRequestContext(request, requestedOrgId ? { orgId: requestedOrgId } : {});
    const userId = requireAuth(ctx);
    assertActiveContextOrg(ctx, requestedOrgId);
    const orgId = requestedOrgId ?? ctx.orgId;
    return ok(await getReferralCodesPayload({ userId, orgId, roles: ctx.roles }));
  }
  if (request.method === "GET" && pathMatches(path, ["me", "referral-rewards"])) {
    const requestedOrgId = request.nextUrl.searchParams.get("orgId") ?? undefined;
    const ctx = await getRequestContext(request, requestedOrgId ? { orgId: requestedOrgId } : {});
    const userId = requireAuth(ctx);
    assertActiveContextOrg(ctx, requestedOrgId);
    const orgId = requestedOrgId ?? ctx.orgId;
    return ok({
      rewards: await prisma.referralReward.findMany({
        where: { referrerUserId: userId, ...(orgId ? { orgId } : {}) },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "contact", "request-otp"])) {
    const body = requestOtpSchema.parse(await readJson(request));
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const ipAddress = getClientIp(request);
    await assertContactIdentifierAvailable(userId, body.identifier);
    await assertRateLimit(
      "otpRequestByIdentifier",
      body.identifier.value,
      "Too many one-time code requests for this contact.",
    );
    await assertRateLimit(
      "otpRequestByIp",
      ipAddress,
      "Too many one-time code requests from this IP.",
    );
    const auth = new AuthService(
      new PrismaAuthRepo(),
      getEmailProviderOrThrow(),
      () => new Date(),
      body.identifier.kind === "phone" ? getSmsProviderOrThrow() : undefined,
    );
    const challenge = await auth.requestOtp(body.identifier, {
      purpose: contactOtpPurpose(userId, body.identifier.kind),
      ...(ipAddress !== "unknown" ? { ipAddress } : {}),
    });
    return ok({
      challengeId: challenge.id,
      expiresAt: challenge.expiresAt,
      devOtp: getDevOtpResponseValue(),
    });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "contact", "verify-otp"])) {
    const body = verifyOtpSchema.parse(await readJson(request));
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const ipAddress = getClientIp(request);
    await assertContactIdentifierAvailable(userId, body.identifier);
    await assertRateLimit(
      "otpVerifyByIdentifier",
      body.identifier.value,
      "Too many one-time code attempts for this contact.",
    );
    await assertRateLimit(
      "otpVerifyByIp",
      ipAddress,
      "Too many one-time code attempts from this IP.",
    );
    const auth = new AuthService(new PrismaAuthRepo(), getEmailProviderOrThrow());
    await auth.verifyOtpChallenge({
      identifier: body.identifier,
      code: body.code,
      purpose: contactOtpPurpose(userId, body.identifier.kind),
    });
    const user = await prisma.user.update({
      where: { id: userId },
      data:
        body.identifier.kind === "email"
          ? { email: body.identifier.value, emailVerifiedAt: new Date() }
          : { phone: body.identifier.value, phoneVerifiedAt: new Date() },
    });
    const token = extractSessionToken(request);
    const session = token ? await resolveSessionSummaryFromToken(token, ctx.orgId) : null;
    return ok({
      user: serializeUserForClient(user),
      ...(session ? { session } : {}),
    });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "profile"])) {
    const requestedOrgId = request.nextUrl.searchParams.get("orgId") ?? undefined;
    const ctx = await getRequestContext(request, requestedOrgId ? { orgId: requestedOrgId } : {});
    const userId = requireAuth(ctx);
    assertActiveContextOrg(ctx, requestedOrgId);
    const orgId = requestedOrgId ?? ctx.orgId;
    const [user, profile, latestBodyProgress] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      orgId
        ? prisma.memberProfile.findUnique({ where: { orgId_userId: { orgId, userId } } })
        : Promise.resolve(null),
      prisma.bodyProgressEntry.findFirst({
        where: { userId, ...(orgId ? { organizationId: orgId } : {}) },
        orderBy: { measuredAt: "desc" },
      }),
    ]);
    return ok({
      user: serializeUserForClient(user),
      profile,
      wellness: {
        ...parseMemberProfileNotes(profile?.notes),
        weightKg: latestBodyProgress?.weightKg ? Number(latestBodyProgress.weightKg) : undefined,
        latestMeasurementAt: latestBodyProgress?.measuredAt ?? undefined,
      },
    });
  }
  if (request.method === "PATCH" && pathMatches(path, ["me", "profile"])) {
    const body = memberWellnessProfileSchema.parse(await readJson(request));
    const ctx = await getRequestContext(request, body.orgId ? { orgId: body.orgId } : {});
    if (ctx.impersonationSessionId && (body.email !== undefined || body.phone !== undefined)) {
      throw forbiddenError("Email and phone changes are blocked during impersonation.");
    }
    const userId = requireAuth(ctx);
    assertActiveContextOrg(ctx, body.orgId);
    const orgId = body.orgId ?? ctx.orgId;
    const dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : undefined;
    if (dateOfBirth && Number.isNaN(dateOfBirth.getTime())) {
      throw validationError("Date of birth must be a valid date.");
    }
    const minorFromDate = dateOfBirth ? isDateUnder18(dateOfBirth) : undefined;
    const [user, profile, latestBodyProgress] = await prisma.$transaction(async (tx) => {
      const currentUser = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      if (body.email && body.email !== publicUserEmail(currentUser.email)) {
        throw validationError("Verify the new email before adding it to your account.");
      }
      if (body.phone !== undefined) {
        let requestedPhone: string | null;
        try {
          requestedPhone = body.phone === null ? null : normalizePhoneNumber(body.phone);
        } catch {
          throw validationError("Enter a valid phone number.");
        }
        if (requestedPhone !== currentUser.phone) {
          throw validationError("Verify the new phone number before adding it to your account.");
        }
      }
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: clean({
          name: body.name,
          dateOfBirth,
          ...(minorFromDate !== undefined
            ? {
                isMinor: minorFromDate,
                guardianPending: false,
              }
            : {}),
          gender: body.gender,
          emergencyContact:
            body.emergencyContact !== undefined
              ? {
                  name: body.emergencyContact.name?.trim() || null,
                  phone: body.emergencyContact.phone?.trim() || null,
                }
              : undefined,
          fitnessGoal: body.fitnessGoal,
          marketingOptIn: body.marketingOptIn,
          aiConsent: body.aiConsent,
          preferredLocale: body.preferredLocale,
          weeklyWorkoutGoal: body.weeklyWorkoutGoal,
        }),
      });
      const currentProfile = orgId
        ? await tx.memberProfile.findUnique({ where: { orgId_userId: { orgId, userId } } })
        : null;
      const existingNotes = parseMemberProfileNotes(currentProfile?.notes);
      const nextNotes = {
        ...existingNotes,
        ...(body.dietPreference !== undefined
          ? { dietPreference: sanitizeRichText(body.dietPreference) }
          : {}),
        ...(body.allergies !== undefined ? { allergies: sanitizeRichText(body.allergies) } : {}),
        ...(body.summaryNote !== undefined
          ? { summaryNote: sanitizeRichText(body.summaryNote) }
          : {}),
      };
      const updatedProfile = orgId
        ? await tx.memberProfile.upsert({
            where: { orgId_userId: { orgId, userId } },
            update: { notes: JSON.stringify(nextNotes) },
            create: {
              orgId,
              userId,
              marketingOptIn: updatedUser.marketingOptIn,
              notes: JSON.stringify(nextNotes),
            },
          })
        : null;
      const progress =
        body.weightKg !== undefined
          ? await tx.bodyProgressEntry.create({
              data: clean({
                userId,
                ...(orgId ? { organizationId: orgId } : {}),
                measuredAt: new Date(),
                weightKg: new Prisma.Decimal(body.weightKg),
                notes: "Updated from profile summary.",
                visibility: "TRAINER_VISIBLE",
              }),
            })
          : await tx.bodyProgressEntry.findFirst({
              where: { userId, ...(orgId ? { organizationId: orgId } : {}) },
              orderBy: { measuredAt: "desc" },
            });
      return [updatedUser, updatedProfile, progress] as const;
    });
    return ok({
      user: serializeUserForClient(user),
      profile,
      wellness: {
        ...parseMemberProfileNotes(profile?.notes),
        weightKg: latestBodyProgress?.weightKg ? Number(latestBodyProgress.weightKg) : undefined,
        latestMeasurementAt: latestBodyProgress?.measuredAt ?? undefined,
      },
    });
  }
  if (request.method === "PATCH" && pathMatches(path, ["me", "profile-photo"])) {
    const body = profilePhotoAssetSchema.parse(await readJson(request));
    const ctx = await getRequestContext(request, body.orgId ? { orgId: body.orgId } : {});
    const userId = requireAuth(ctx);
    assertActiveContextOrg(ctx, body.orgId);
    const asset = await getUserScopedFileAsset({
      fileAssetId: body.fileAssetId,
      userId,
      allowedCategories: ["profile_photo"],
      ...(body.orgId ? { orgId: body.orgId } : {}),
    });
    if (!asset) {
      throw validationError("Profile photo asset is required.");
    }
    const [user, profile] = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { profilePhotoUrl: asset.url },
      });
      const updatedProfile = body.orgId
        ? await tx.memberProfile.upsert({
            where: { orgId_userId: { orgId: body.orgId, userId } },
            update: clean({
              profilePhotoUrl: asset.url,
              profilePhotoConsentAt: body.consentToAttendanceUse ? new Date() : undefined,
            }),
            create: clean({
              orgId: body.orgId,
              userId,
              profilePhotoUrl: asset.url,
              marketingOptIn: updatedUser.marketingOptIn,
              profilePhotoConsentAt: body.consentToAttendanceUse ? new Date() : undefined,
            }),
          })
        : null;
      if (body.consentToAttendanceUse !== undefined) {
        await tx.consentRecord.create({
          data: clean({
            orgId: body.orgId,
            userId,
            type: "PROFILE_PHOTO_ATTENDANCE",
            status: body.consentToAttendanceUse ? "GRANTED" : "REVOKED",
            metadata: { fileAssetId: asset.id } as Prisma.InputJsonValue,
            recordedById: userId,
          }),
        });
      }
      return [updatedUser, updatedProfile] as const;
    });
    return ok({ user: serializeUserForClient(user), profile, file: asset });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "attendance", /.+/])) {
    const userId = requireAuth(await getRequestContext(request));
    const { id } = attendanceDetailParamsSchema.parse({ id: path[2] });
    const record = await prisma.attendanceRecord.findFirst({
      where: { id, userId },
    });
    if (!record) {
      throw notFoundError("Attendance record not found");
    }
    const [attendance] = await enrichAttendanceRecords([record]);
    return ok({ attendance });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "attendance"])) {
    const userId = requireAuth(await getRequestContext(request));
    const records = await prisma.attendanceRecord.findMany({
      where: { userId },
      orderBy: { checkedInAt: "desc" },
      take: 50,
    });
    return ok({
      attendance: await enrichAttendanceRecords(records),
    });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "shop-orders"])) {
    const userId = requireAuth(await getRequestContext(request));
    return ok({ orders: await getMyShopOrders(userId) });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "invoices"])) {
    const userId = requireAuth(await getRequestContext(request));
    const invoices = await prisma.invoice.findMany({
      where: { userId },
      orderBy: [{ issueDate: "desc" }, { issuedAt: "desc" }],
      take: 100,
    });
    const pdfAssetIds = invoices.map((invoice) => invoice.pdfAssetId).filter(Boolean) as string[];
    const assets = pdfAssetIds.length
      ? await prisma.fileAsset.findMany({
          where: { id: { in: pdfAssetIds }, ownerUserId: userId, deletedAt: null },
        })
      : [];
    const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
    return ok({
      invoices: invoices.map((invoice) => ({
        ...invoice,
        invoiceNumber: invoice.invoiceNumber ?? invoice.invoiceNo,
        issueDate: invoice.issueDate ?? invoice.issuedAt,
        subtotalPaise: invoice.subtotalPaise || Math.max(invoice.amountPaise - invoice.taxPaise, 0),
        gstPaise: invoice.gstPaise || invoice.taxPaise,
        totalPaise: invoice.totalPaise || invoice.amountPaise,
        pdfAsset: invoice.pdfAssetId ? (assetsById.get(invoice.pdfAssetId) ?? null) : null,
        invoiceUrl: `/api/me/invoices/${invoice.id}/pdf`,
      })),
    });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "invoices", /.+/, "pdf"])) {
    const userId = requireAuth(await getRequestContext(request));
    const invoice = await prisma.invoice.findFirst({ where: { id: path[2]!, userId } });
    if (!invoice) {
      throw notFoundError("Invoice not found");
    }
    const [org, user] = await Promise.all([
      invoice.orgId ? prisma.organization.findUnique({ where: { id: invoice.orgId } }) : null,
      prisma.user.findUnique({ where: { id: userId } }),
    ]);
    return invoicePdfResponse({ invoice, org, user });
  }
  if (
    (request.method === "POST" || request.method === "GET") &&
    pathMatches(path, ["me", "payments", /.+/, "receipt"])
  ) {
    const userId = requireAuth(await getRequestContext(request));
    const paymentId = path[2]!;
    const payment = await prisma.payment.findFirst({ where: { id: paymentId, userId } });
    if (!payment?.orgId) {
      throw notFoundError("Payment not found");
    }
    const receipt = await ensurePaymentReceipt({ orgId: payment.orgId, paymentId, userId });
    if (request.method === "GET" && request.nextUrl.searchParams.get("format") === "html") {
      return new NextResponse(receiptHtml(receipt), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    return ok({
      receiptNumber: receipt.receiptNumber,
      payment: receipt.payment,
      receiptUrl: `/api/me/payments/${paymentId}/receipt?format=html`,
    });
  }
  if (
    (request.method === "POST" || request.method === "GET") &&
    pathMatches(path, ["me", "payments", /.+/, "invoice"])
  ) {
    const userId = requireAuth(await getRequestContext(request));
    const paymentId = path[2]!;
    const payment = await prisma.payment.findFirst({ where: { id: paymentId, userId } });
    if (!payment?.orgId) {
      throw notFoundError("Payment not found");
    }
    const invoice = await ensurePaymentInvoice({ orgId: payment.orgId, paymentId, userId });
    if (request.method === "GET" && request.nextUrl.searchParams.get("format") === "html") {
      return new NextResponse(invoiceHtml(invoice), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    return ok({
      invoice: invoice.invoice,
      invoiceUrl: `/api/me/invoices/${invoice.invoice.id}/pdf`,
      signedUrl: await invoiceSignedUrl(invoice.invoice),
    });
  }
  return undefined;
}

export async function handleTracking(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["me", "tracking", "summary"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const [workouts, bodyProgress, habits] = await Promise.all([
      listTrackingWorkouts(userId),
      prisma.bodyProgressEntry.findMany({
        where: { userId },
        orderBy: { measuredAt: "desc" },
        take: 10,
      }),
      prisma.memberHabit.findMany({
        where: { userId, active: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    return ok({
      summary: personalTrackingService.getTrackingSummary(
        workouts.map((workout) => toTrackingWorkoutRecord(workout)),
      ),
      recentWorkouts: workouts.slice(0, 5),
      latestBodyProgress: bodyProgress[0] ?? null,
      habits,
    });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "tracking", "workouts"])) {
    const userId = requireAuth(await getRequestContext(request));
    return ok({ workouts: await listTrackingWorkouts(userId) });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "tracking", "workouts"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const body = workoutSessionSchema.parse(await readJson(request));
    let organizationId = body.organizationId;
    if (body.planAssignmentId) {
      const assignment = await prisma.planAssignment.findFirst({
        where: { id: body.planAssignmentId, assignedToUserId: userId, active: true },
      });
      if (!assignment) {
        throw forbiddenError("Plan assignment does not belong to this user.");
      }
      if (organizationId && organizationId !== assignment.orgId) {
        throw forbiddenError("Workout organization does not match the plan assignment.");
      }
      organizationId = assignment.orgId;
    }
    if (organizationId) {
      const membership = await prisma.organizationUser.findFirst({
        where: { orgId: organizationId, userId, status: "active" },
      });
      if (!membership && !ctx.isPlatformAdmin) {
        throw forbiddenError("No organization access for workout tracking.");
      }
    }
    if (body.attendanceRecordId) {
      const attendanceRecord = await prisma.attendanceRecord.findFirst({
        where: {
          id: body.attendanceRecordId,
          userId,
          ...(organizationId ? { orgId: organizationId } : {}),
        },
      });
      if (!attendanceRecord) {
        throw forbiddenError("Attendance record does not belong to this user.");
      }
      organizationId = attendanceRecord.orgId;
    }
    const visibility = personalTrackingService.normalizeVisibility({
      isMinor: user.isMinor,
      guardianConsentGranted: !user.guardianPending,
      ...(body.visibility ? { requestedVisibility: body.visibility } : {}),
    });
    const baseWorkout = personalTrackingService.createWorkoutSession({
      title: body.title,
      workoutType: body.workoutType,
      startedAt: new Date(body.startedAt),
      ...(body.endedAt ? { endedAt: new Date(body.endedAt) } : {}),
      ...(body.intensity ? { intensity: body.intensity } : {}),
      ...(body.notes ? { notes: body.notes } : {}),
      ...(body.mood ? { mood: body.mood } : {}),
      visibility,
    });

    const workout = await prisma.workoutSession.create({
      data: {
        userId,
        ...(organizationId ? { organizationId } : {}),
        ...(body.planAssignmentId ? { planAssignmentId: body.planAssignmentId } : {}),
        ...(body.attendanceRecordId ? { attendanceRecordId: body.attendanceRecordId } : {}),
        title: baseWorkout.title,
        workoutType: baseWorkout.workoutType,
        startedAt: baseWorkout.startedAt,
        ...(baseWorkout.endedAt ? { endedAt: baseWorkout.endedAt } : {}),
        ...(baseWorkout.durationMinutes !== undefined
          ? { durationMinutes: baseWorkout.durationMinutes }
          : {}),
        ...(baseWorkout.intensity ? { intensity: baseWorkout.intensity } : {}),
        ...(baseWorkout.notes ? { notes: baseWorkout.notes } : {}),
        ...(baseWorkout.mood ? { mood: baseWorkout.mood } : {}),
        visibility,
      },
    });

    if (body.exercises.length) {
      await prisma.workoutExerciseEntry.createMany({
        data: body.exercises.map((exercise) => ({
          workoutSessionId: workout.id,
          exerciseName: exercise.exerciseName,
          orderIndex: exercise.orderIndex,
          ...(exercise.muscleGroup ? { muscleGroup: exercise.muscleGroup } : {}),
          ...(exercise.equipment ? { equipment: exercise.equipment } : {}),
          ...(exercise.setsPlanned !== undefined ? { setsPlanned: exercise.setsPlanned } : {}),
          ...(exercise.setsCompleted !== undefined
            ? { setsCompleted: exercise.setsCompleted }
            : {}),
          ...(exercise.reps !== undefined ? { reps: exercise.reps } : {}),
          ...(exercise.weightKg !== undefined
            ? { weightKg: new Prisma.Decimal(exercise.weightKg) }
            : {}),
          ...(exercise.durationSeconds !== undefined
            ? { durationSeconds: exercise.durationSeconds }
            : {}),
          ...(exercise.distanceMeters !== undefined
            ? { distanceMeters: exercise.distanceMeters }
            : {}),
          ...(exercise.notes ? { notes: exercise.notes } : {}),
          completed: exercise.completed,
        })),
      });
    }

    return ok({ workout });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "tracking", "workouts", /.+/])) {
    const userId = requireAuth(await getRequestContext(request));
    const workout = await prisma.workoutSession.findFirst({
      where: { id: path[3]!, userId, deletedAt: null },
    });
    if (!workout) {
      throw notFoundError("Workout not found");
    }
    const exercises = await prisma.workoutExerciseEntry.findMany({
      where: { workoutSessionId: workout.id },
      orderBy: { orderIndex: "asc" },
    });
    return ok({ workout: { ...workout, exercises } });
  }
  if (request.method === "PATCH" && pathMatches(path, ["me", "tracking", "workouts", /.+/])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const existingWorkout = await prisma.workoutSession.findFirst({
      where: { id: path[3]!, userId, deletedAt: null },
    });
    if (!existingWorkout) {
      throw notFoundError("Workout not found");
    }
    const body = workoutSessionSchema.partial().parse(await readJson(request));
    const visibility = personalTrackingService.normalizeVisibility({
      isMinor: user.isMinor,
      guardianConsentGranted: !user.guardianPending,
      ...(body.visibility ? { requestedVisibility: body.visibility } : {}),
    });
    const updated = personalTrackingService.updateWorkoutSession(
      toTrackingWorkoutRecord(existingWorkout),
      {
        ...(body.title ? { title: body.title } : {}),
        ...(body.workoutType ? { workoutType: body.workoutType } : {}),
        ...(body.startedAt ? { startedAt: new Date(body.startedAt) } : {}),
        ...(body.endedAt ? { endedAt: new Date(body.endedAt) } : {}),
        ...(body.intensity ? { intensity: body.intensity } : {}),
        ...(body.notes ? { notes: body.notes } : {}),
        ...(body.mood ? { mood: body.mood } : {}),
        visibility,
      },
    );

    const workout = await prisma.workoutSession.update({
      where: { id: existingWorkout.id },
      data: {
        title: updated.title,
        workoutType: updated.workoutType,
        startedAt: updated.startedAt,
        ...(updated.endedAt ? { endedAt: updated.endedAt } : {}),
        ...(updated.durationMinutes !== undefined
          ? { durationMinutes: updated.durationMinutes }
          : {}),
        ...(updated.intensity ? { intensity: updated.intensity } : {}),
        ...(updated.notes ? { notes: updated.notes } : {}),
        ...(updated.mood ? { mood: updated.mood } : {}),
        visibility,
      },
    });

    if (body.exercises) {
      await prisma.workoutExerciseEntry.deleteMany({ where: { workoutSessionId: workout.id } });
      if (body.exercises.length) {
        await prisma.workoutExerciseEntry.createMany({
          data: body.exercises.map((exercise) => ({
            workoutSessionId: workout.id,
            exerciseName: exercise.exerciseName,
            orderIndex: exercise.orderIndex,
            ...(exercise.muscleGroup ? { muscleGroup: exercise.muscleGroup } : {}),
            ...(exercise.equipment ? { equipment: exercise.equipment } : {}),
            ...(exercise.setsPlanned !== undefined ? { setsPlanned: exercise.setsPlanned } : {}),
            ...(exercise.setsCompleted !== undefined
              ? { setsCompleted: exercise.setsCompleted }
              : {}),
            ...(exercise.reps !== undefined ? { reps: exercise.reps } : {}),
            ...(exercise.weightKg !== undefined
              ? { weightKg: new Prisma.Decimal(exercise.weightKg) }
              : {}),
            ...(exercise.durationSeconds !== undefined
              ? { durationSeconds: exercise.durationSeconds }
              : {}),
            ...(exercise.distanceMeters !== undefined
              ? { distanceMeters: exercise.distanceMeters }
              : {}),
            ...(exercise.notes ? { notes: exercise.notes } : {}),
            completed: exercise.completed,
          })),
        });
      }
    }

    return ok({ workout });
  }
  if (request.method === "DELETE" && pathMatches(path, ["me", "tracking", "workouts", /.+/])) {
    const userId = requireAuth(await getRequestContext(request));
    const workout = await prisma.workoutSession.findFirst({
      where: { id: path[3]!, userId, deletedAt: null },
    });
    if (!workout) {
      throw notFoundError("Workout not found");
    }
    await prisma.workoutSession.update({
      where: { id: workout.id },
      data: { deletedAt: new Date() },
    });
    return ok({ deleted: true });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "tracking", "body-progress"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const body = bodyProgressEntrySchema.parse(await readJson(request));
    const photoAsset = await getUserScopedFileAsset({
      userId,
      allowedCategories: ["body_progress_photo", "profile_photo"],
      ...(body.photoAssetId ? { fileAssetId: body.photoAssetId } : {}),
      ...(body.organizationId ? { orgId: body.organizationId } : {}),
    });
    const visibility = personalTrackingService.normalizeVisibility({
      isMinor: user.isMinor,
      guardianConsentGranted: !user.guardianPending,
      ...(body.visibility ? { requestedVisibility: body.visibility } : {}),
    });
    const entry = await prisma.bodyProgressEntry.create({
      data: {
        userId,
        ...(body.organizationId ? { organizationId: body.organizationId } : {}),
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
        ...(photoAsset ? { photoAssetId: photoAsset.id } : {}),
        ...(body.notes ? { notes: body.notes } : {}),
        visibility,
      },
    });
    return ok({ entry });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "tracking", "body-progress"])) {
    const userId = requireAuth(await getRequestContext(request));
    return ok({
      entries: await prisma.bodyProgressEntry.findMany({
        where: { userId },
        orderBy: { measuredAt: "desc" },
        take: 50,
      }),
    });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "diet"])) {
    const userId = requireAuth(await getRequestContext(request));
    const plan = await prisma.dietPlan.findFirst({
      where: { memberId: userId, status: "PUBLISHED" },
      orderBy: { updatedAt: "desc" },
    });
    const [meals, logs] = await Promise.all([
      plan
        ? prisma.dietPlanMeal.findMany({
            where: { dietPlanId: plan.id },
            orderBy: { order: "asc" },
          })
        : Promise.resolve([]),
      prisma.mealLog.findMany({
        where: {
          userId,
          loggedAt: {
            gte: (() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return today;
            })(),
          },
        },
        orderBy: { loggedAt: "desc" },
        take: 20,
      }),
    ]);
    return ok({ plan: plan ? { ...plan, meals } : null, logs });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "diet", "meal-logs"])) {
    const userId = requireAuth(await getRequestContext(request));
    const body = mealLogSchema.parse(await readJson(request));
    const plan = body.dietPlanId
      ? await prisma.dietPlan.findFirst({ where: { id: body.dietPlanId, memberId: userId } })
      : null;
    if (body.dietPlanId && !plan) {
      throw notFoundError("Diet plan not found");
    }
    const log = await prisma.mealLog.create({
      data: clean({
        userId,
        organizationId: body.organizationId ?? plan?.orgId,
        dietPlanId: plan?.id,
        mealName: body.mealName,
        loggedAt: body.loggedAt ? new Date(body.loggedAt) : new Date(),
        calories: body.calories,
        proteinG: body.proteinG,
        carbsG: body.carbsG,
        fatsG: body.fatsG,
        photoAssetId: body.photoAssetId,
        notes: body.notes,
      }),
    });
    return ok({ log });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "tracking", "habits"])) {
    const userId = requireAuth(await getRequestContext(request));
    const habits = await prisma.memberHabit.findMany({
      where: { userId, active: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const logs = await prisma.memberHabitLog.findMany({
      where: { habitId: { in: habits.map((habit) => habit.id) } },
      orderBy: { loggedAt: "desc" },
      take: 100,
    });
    return ok({
      habits: habits.map((habit) => ({
        ...habit,
        logs: logs.filter((log) => log.habitId === habit.id),
      })),
    });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "tracking", "habits"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const body = memberHabitSchema.parse(await readJson(request));
    const visibility = personalTrackingService.normalizeVisibility({
      isMinor: user.isMinor,
      guardianConsentGranted: !user.guardianPending,
      ...(body.visibility ? { requestedVisibility: body.visibility } : {}),
    });
    const habit = await prisma.memberHabit.create({
      data: {
        userId,
        ...(body.organizationId ? { organizationId: body.organizationId } : {}),
        title: body.title,
        category: body.category,
        ...(body.targetValue !== undefined ? { targetValue: body.targetValue } : {}),
        ...(body.unit ? { unit: body.unit } : {}),
        frequency: body.frequency,
        visibility,
      },
    });
    return ok({ habit });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "tracking", "habits", /.+/, "log"])) {
    const userId = requireAuth(await getRequestContext(request));
    const habit = await prisma.memberHabit.findFirst({
      where: { id: path[3]!, userId, active: true },
    });
    if (!habit) {
      throw notFoundError("Habit not found");
    }
    const body = memberHabitLogSchema.parse(await readJson(request));
    const log = await prisma.memberHabitLog.create({
      data: {
        habitId: habit.id,
        ...(body.loggedAt ? { loggedAt: new Date(body.loggedAt) } : {}),
        ...(body.value !== undefined ? { value: body.value } : {}),
        ...(body.notes ? { notes: body.notes } : {}),
        completed: body.completed,
      },
    });
    return ok({ log });
  }
  return undefined;
}

export async function handleFiles(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["files", "local"])) {
    const storageProvider = getStorageProviderOrThrow();
    if (!(storageProvider instanceof LocalStorageProvider)) {
      throw notFoundError("File preview is not available right now.");
    }
    const key = request.nextUrl.searchParams.get("key") ?? "";
    const expiresAt = Number(request.nextUrl.searchParams.get("expires"));
    const signature = request.nextUrl.searchParams.get("signature") ?? "";
    if (!verifyLocalStorageSignature({ key, expiresAt, signature })) {
      throw forbiddenError("Invalid or expired file signature.");
    }
    const file = await storageProvider.readObject({ key });
    return new NextResponse(new Uint8Array(file.body), {
      headers: {
        "content-type": file.contentType,
        "content-length": String(file.sizeBytes),
        "cache-control": "private, max-age=0, no-store",
      },
    });
  }
  if (request.method === "GET" && pathMatches(path, ["files", "local", "public"])) {
    const storageProvider = getStorageProviderOrThrow();
    if (!(storageProvider instanceof LocalStorageProvider)) {
      throw notFoundError("File preview is not available right now.");
    }
    const key = request.nextUrl.searchParams.get("key") ?? "";
    if (!key) {
      throw validationError("Missing file key.");
    }
    const asset = await prisma.fileAsset.findFirst({
      where: { storageKey: key, deletedAt: null },
    });
    if (!asset) {
      throw notFoundError("File not found");
    }
    assertCanServeLocalPublicFileAsset(asset);
    assertFileStorageProviderMatches(asset, storageProvider.getDiagnostics().provider);
    const file = await storageProvider.readObject({ key });
    return new NextResponse(new Uint8Array(file.body), {
      headers: {
        "content-type": file.contentType,
        "content-length": String(file.sizeBytes),
        "cache-control": "public, max-age=3600, immutable",
      },
    });
  }
  if (request.method === "POST" && pathMatches(path, ["files", "upload"])) {
    if (/^(0|false|no|off)$/i.test(process.env.FILE_UPLOADS_ENABLED ?? "")) {
      throw validationError("File uploads are not available right now.");
    }
    const storageProvider = getStorageProviderOrThrow();
    const upload = await parseFileUploadRequest(request);
    const ctx = await getRequestContext(request, upload.orgId ? { orgId: upload.orgId } : {});
    const userId = requireAuth(ctx);
    await assertRateLimit(
      "fileUploadByActor",
      `${upload.orgId ?? "global"}:${userId}`,
      "Too many file uploads requested.",
    );
    assertFileUploadPermission({
      category: upload.category,
      ctx,
      actorUserId: userId,
      ...(upload.orgId ? { orgId: upload.orgId } : {}),
    });

    const fileBytes = upload.fileBytes;
    const checksum = createHash("sha256").update(fileBytes).digest("hex");
    const storageKey = buildStorageKey({
      category: upload.category,
      ...(upload.orgId ? { orgId: upload.orgId } : {}),
      ownerUserId: userId,
      ...(upload.validated.originalName ? { originalName: upload.validated.originalName } : {}),
    });

    let uploaded = false;
    try {
      await storageProvider.uploadFile({
        key: storageKey,
        contentType: upload.validated.contentType,
        sizeBytes: upload.validated.sizeBytes,
        category: upload.category,
        ...(upload.validated.originalName ? { originalName: upload.validated.originalName } : {}),
        visibility: upload.visibility,
        body: fileBytes,
        cacheControl:
          upload.visibility === "public"
            ? "public, max-age=31536000, immutable"
            : "private, max-age=0, no-store",
      });
      uploaded = true;

      const created = await prisma.fileAsset.create({
        data: {
          orgId: upload.orgId ?? null,
          ownerUserId: userId,
          originalName: upload.validated.originalName ?? null,
          storageKey,
          url: "pending",
          mimeType: upload.validated.contentType,
          sizeBytes: upload.validated.sizeBytes,
          purpose: upload.category,
          category: upload.category,
          visibility: upload.visibility,
          storageProvider: storageProvider.getDiagnostics().provider,
          checksum,
          metadata: {
            normalizedBaseName: upload.validated.normalizedBaseName,
            extension: upload.validated.extension,
          } as Prisma.InputJsonValue,
        },
      });
      const asset = await prisma.fileAsset.update({
        where: { id: created.id },
        data: { url: buildFileAssetUrl(created.id) },
      });
      await writeAuditLog({
        request,
        ...(upload.orgId ? { orgId: upload.orgId } : {}),
        actorUserId: userId,
        action: "file.uploaded",
        entityType: "file_asset",
        entityId: asset.id,
        metadata: {
          category: upload.category,
          visibility: upload.visibility,
          sizeBytes: upload.validated.sizeBytes,
        },
      });
      return ok({
        file: asset,
        deliveryUrl: asset.url,
        signedUrl: await resolveFileUrl(asset, true),
      });
    } catch (error) {
      if (uploaded) {
        await storageProvider.deleteFile({ key: storageKey }).catch(() => undefined);
      }
      throw error;
    }
  }
  if (request.method === "GET" && pathMatches(path, ["files", /.+/, "signed-url"])) {
    const asset = await findFileAssetOrThrow(path[1]!);
    const ctx = await getRequestContext(request, asset.orgId ? { orgId: asset.orgId } : {});
    assertCanAccessFileAsset(asset, ctx);
    await writeAuditLog({
      request,
      ...(asset.orgId ? { orgId: asset.orgId } : {}),
      ...(ctx.userId ? { actorUserId: ctx.userId } : {}),
      action: "file.signed_url_issued",
      entityType: "file_asset",
      entityId: asset.id,
      metadata: { category: asset.category, visibility: asset.visibility },
    });
    return ok({
      file: asset,
      url: await resolveFileUrl(asset, true),
    });
  }
  if (request.method === "GET" && pathMatches(path, ["files", /.+/, "content"])) {
    const asset = await findFileAssetOrThrow(path[1]!);
    const ctx = await getRequestContext(request, asset.orgId ? { orgId: asset.orgId } : {});
    assertCanAccessFileAsset(asset, ctx);
    await writeAuditLog({
      request,
      ...(asset.orgId ? { orgId: asset.orgId } : {}),
      ...(ctx.userId ? { actorUserId: ctx.userId } : {}),
      action: "file.read",
      entityType: "file_asset",
      entityId: asset.id,
      metadata: { category: asset.category, visibility: asset.visibility },
    });
    return redirectTo(await resolveFileUrl(asset));
  }
  if (request.method === "DELETE" && pathMatches(path, ["files", /.+/])) {
    const storageProvider = getStorageProviderOrThrow();
    const asset = await findFileAssetOrThrow(path[1]!);
    const ctx = await getRequestContext(request, asset.orgId ? { orgId: asset.orgId } : {});
    const userId = requireAuth(ctx);
    const category = (asset.category ?? "profile_photo") as StorageFileCategory;
    const orgDeletePermissions: Partial<Record<StorageFileCategory, string[]>> = {
      payment_proof: ["PAYMENTS_VIEW", "PAYMENTS_RECORD_OFFLINE"],
      product_image: ["SHOP_MANAGE_PRODUCTS"],
      plan_image: ["PLANS_CREATE"],
      ai_generated_image: ["AI_GENERATE_IMAGE", "PLANS_CREATE"],
      trainer_upi_qr: ["PT_RECORD", "TRAINERS_MANAGE"],
      org_logo: ["ORG_MANAGE_PROFILE"],
      org_cover: ["ORG_MANAGE_PROFILE"],
      org_gallery: ["ORG_MANAGE_PROFILE"],
    };

    const canDeleteOwn = asset.ownerUserId === userId;
    const canDeleteOrg =
      Boolean(asset.orgId) &&
      ctx.orgId === asset.orgId &&
      (orgDeletePermissions[category] ?? []).some((permission) =>
        ctx.permissions.includes(permission as never),
      );

    if (!canDeleteOwn && !canDeleteOrg) {
      throw forbiddenError("You do not have permission to delete this file.");
    }

    assertFileStorageProviderMatches(asset, storageProvider.getDiagnostics().provider);
    await storageProvider.deleteFile({ key: asset.storageKey });
    const deleted = await prisma.fileAsset.update({
      where: { id: asset.id },
      data: { deletedAt: new Date() },
    });
    await writeAuditLog({
      request,
      ...(asset.orgId ? { orgId: asset.orgId } : {}),
      actorUserId: userId,
      action: "file.deleted",
      entityType: "file_asset",
      entityId: asset.id,
      metadata: { category },
    });
    return ok({ file: deleted, deleted: true });
  }
  return undefined;
}

export async function handleOrganizations(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["orgs", "public", "search"])) {
    await assertRateLimit(
      "publicOrgSearchByIp",
      getClientIp(request),
      "Too many gym searches from this IP.",
    );
    const query = request.nextUrl.searchParams.get("q") ?? "";
    const city = request.nextUrl.searchParams.get("city") ?? undefined;
    const limit = Math.min(
      50,
      Math.max(1, Number(request.nextUrl.searchParams.get("limit") ?? 50)),
    );
    const cursor = request.nextUrl.searchParams.get("cursor") ?? undefined;
    const nearLat = request.nextUrl.searchParams.get("nearLat");
    const nearLng = request.nextUrl.searchParams.get("nearLng");
    const gyms = await prisma.organization.findMany({
      where: {
        ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { username: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: limit + 1,
    });
    const pageGyms = gyms.slice(0, limit);
    const results = buildGymDiscoveryResults({
      gyms: pageGyms.map((gym) => ({
        id: gym.id,
        name: gym.name,
        username: gym.username,
        city: gym.city,
        state: gym.state,
        visibility: gym.visibility,
        joinMode: gym.joinMode,
        latitude: gym.latitude ? Number(gym.latitude) : null,
        longitude: gym.longitude ? Number(gym.longitude) : null,
        amenities: Array.isArray(gym.amenities)
          ? gym.amenities.filter((item): item is string => typeof item === "string")
          : [],
        coverImageUrl: gym.coverImageUrl,
        logoUrl: gym.logoUrl,
      })),
      ...(query ? { query } : {}),
      ...(city ? { city } : {}),
      ...(nearLat && nearLng
        ? { near: { latitude: Number(nearLat), longitude: Number(nearLng) } }
        : {}),
      mapProvider: getMapProviderOrThrow(),
    });
    return ok({ gyms: results, nextCursor: gyms.length > limit ? gyms[limit]?.id : null });
  }
  if (request.method === "GET" && pathMatches(path, ["platform-referrals", "lookup"])) {
    const code = request.nextUrl.searchParams.get("code")?.trim().toLowerCase();
    if (!code) {
      return ok({ match: null });
    }
    const sourceOrg = await prisma.organization.findUnique({
      where: { username: code },
      select: { id: true, name: true, username: true, city: true },
    });
    if (!sourceOrg) {
      return ok({ match: null });
    }
    return ok({
      match: {
        code: sourceOrg.username.toUpperCase(),
        sourceOrgName: sourceOrg.name,
        sourceOrgCity: sourceOrg.city,
      },
    });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", "public", /.+/])) {
    const username = path[2]!;
    const ctx = await getRequestContext(request);
    const viewerUserId = ctx.userId;
    const referralCode = request.nextUrl.searchParams.get("ref")?.toUpperCase() ?? undefined;
    const org = await prisma.organization.findUnique({ where: { username } });
    if (!org || org.visibility === "HIDDEN") {
      return fail("NOT_FOUND", "Gym not found", 404);
    }
    const [
      plans,
      activeMembership,
      pendingJoinRequest,
      approvedJoinRequest,
      referral,
      trainerAssignments,
      branches,
      settings,
      offers,
    ] = await Promise.all([
      prisma.membershipPlan.findMany({
        where: { orgId: org.id, active: true, publicVisible: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      viewerUserId
        ? prisma.memberSubscription.findFirst({
            where: { orgId: org.id, memberUserId: viewerUserId, status: "ACTIVE" },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve(null),
      viewerUserId
        ? prisma.membershipJoinRequest.findFirst({
            where: { orgId: org.id, userId: viewerUserId, status: "pending" },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve(null),
      viewerUserId
        ? prisma.membershipJoinRequest.findFirst({
            where: { orgId: org.id, userId: viewerUserId, status: "approved" },
            orderBy: { reviewedAt: "desc" },
          })
        : Promise.resolve(null),
      referralCode
        ? prisma.referralCode.findUnique({ where: { code: referralCode } })
        : Promise.resolve(null),
      prisma.organizationRoleAssignment.findMany({
        where: { orgId: org.id, role: "TRAINER" },
        take: 8,
      }),
      prisma.branch.findMany({ where: { orgId: org.id, active: true }, take: 5 }),
      prisma.organizationSetting.findUnique({ where: { orgId: org.id } }),
      prisma.offer.findMany({
        where: {
          orgId: org.id,
          active: true,
          startsAt: { lte: new Date() },
          endsAt: { gte: new Date() },
        },
        orderBy: { endsAt: "asc" },
        take: 10,
      }),
    ]);
    const [trainerUsers, trainerProfiles] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: trainerAssignments.map((assignment) => assignment.userId) } },
      }),
      prisma.trainerProfile.findMany({
        where: {
          orgId: org.id,
          userId: { in: trainerAssignments.map((assignment) => assignment.userId) },
        },
      }),
    ]);
    const settingValues =
      settings?.keyValues &&
      typeof settings.keyValues === "object" &&
      !Array.isArray(settings.keyValues)
        ? (settings.keyValues as Record<string, unknown>)
        : {};
    return ok({
      org: {
        ...org,
        tagline: typeof settingValues.tagline === "string" ? settingValues.tagline : null,
        gallery:
          Array.isArray(settingValues.gallery) &&
          settingValues.gallery.every((item) => typeof item === "string")
            ? settingValues.gallery
            : [],
        facilities:
          Array.isArray(settingValues.facilities) &&
          settingValues.facilities.every((item) => typeof item === "string")
            ? settingValues.facilities
            : [],
        equipment:
          Array.isArray(settingValues.equipment) &&
          settingValues.equipment.every((item) => typeof item === "string")
            ? settingValues.equipment
            : [],
        gymType: typeof settingValues.gymType === "string" ? settingValues.gymType : null,
        openingHoursSummary:
          typeof settingValues.openingHoursSummary === "string"
            ? settingValues.openingHoursSummary
            : null,
        appStoreUrl:
          typeof settingValues.appStoreUrl === "string" ? settingValues.appStoreUrl : null,
        playStoreUrl:
          typeof settingValues.playStoreUrl === "string" ? settingValues.playStoreUrl : null,
      },
      branches,
      trainers: trainerAssignments
        .map((assignment) => {
          const user = trainerUsers.find((candidate) => candidate.id === assignment.userId) ?? null;
          const profile =
            trainerProfiles.find((candidate) => candidate.userId === assignment.userId) ?? null;
          return {
            userId: assignment.userId,
            name: user?.name ?? "Trainer",
            profilePhotoUrl: publicTrainerPhotoUrl(user?.profilePhotoUrl),
            bio: profile?.bio ?? null,
            specialties: profile?.specialties ?? null,
            visibleToMembers: profile?.visibleToMembers ?? true,
          };
        })
        .filter((trainer) => trainer.visibleToMembers !== false),
      plans: plans.map((plan) => {
        const offer = offers.find((candidate) => {
          const applicablePlans = Array.isArray(candidate.applicablePlans)
            ? candidate.applicablePlans.filter((item): item is string => typeof item === "string")
            : [];
          const applies = applicablePlans.length === 0 || applicablePlans.includes(plan.id);
          return (
            applies &&
            (!candidate.maxRedemptions || candidate.redemptionCount < candidate.maxRedemptions)
          );
        });
        const offerDiscountPaise = offer
          ? computeDiscountPaise({
              type: offer.discountType,
              value: offer.discountValue,
              amountPaise: plan.pricePaise,
            })
          : 0;
        return {
          ...plan,
          activeOffer: offer
            ? {
                id: offer.id,
                name: offer.name,
                description: offer.description,
                discountType: offer.discountType,
                discountValue: offer.discountValue,
                endsAt: offer.endsAt,
              }
            : null,
          effectivePricePaise: Math.max(plan.pricePaise - offerDiscountPaise, 0),
        };
      }),
      offers,
      viewerState: viewerUserId
        ? {
            activeMembership,
            pendingJoinRequest,
            approvedJoinRequest,
          }
        : null,
      referral:
        referral && referral.orgId === org.id
          ? {
              code: referral.code,
              couponId: referral.couponId,
              status: referral.status,
              maxUses: referral.maxUses,
              redemptionCount: referral.redemptionCount,
            }
          : null,
    });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    await assertRateLimit(
      "organizationCreateByActor",
      userId,
      "You can create one organization per day from this account.",
    );
    const body = createOrganizationSchema.parse(await readJson(request));
    const username = normalizeUsername(body.username);
    const trial = createTrialWindow();
    const org = await prisma.$transaction(async (tx) => {
      const created = await tx.organization.create({
        data: clean({
          name: body.name,
          legalName: body.name,
          username,
          contactPhone: body.contactPhone,
          contactEmail: body.contactEmail,
          gstNumber: body.gstNumber,
          address: body.address,
          city: body.city,
          state: body.state,
          pincode: body.pincode,
          originalGoogleMapsUrl: body.originalGoogleMapsUrl,
          latitude: body.latitude ? new Prisma.Decimal(body.latitude) : undefined,
          longitude: body.longitude ? new Prisma.Decimal(body.longitude) : undefined,
          locationSource: "MANUAL",
          amenities: body.amenities,
          visibility: body.visibility,
          joinMode: body.joinMode,
          trialStartAt: trial.trialStartAt,
          trialEndAt: trial.trialEndAt,
          createdByUserId: userId,
        }),
      });
      const branch = await tx.branch.create({
        data: clean({
          orgId: created.id,
          name: `${created.name} Main`,
          address: created.address,
          city: created.city,
          state: created.state,
          pincode: created.pincode,
          latitude: created.latitude,
          longitude: created.longitude,
          contactPhone: created.contactPhone,
          contactEmail: created.contactEmail,
          whatsappNumber: created.contactPhone,
          operatingHours:
            created.operatingHours === null
              ? undefined
              : (created.operatingHours as Prisma.InputJsonValue),
          amenities: Array.isArray(created.amenities)
            ? created.amenities.filter((item): item is string => typeof item === "string")
            : [],
          isDefault: true,
        }),
      });
      await tx.organizationUser.create({ data: { orgId: created.id, userId } });
      await tx.organizationRoleAssignment.create({
        data: { orgId: created.id, userId, role: "OWNER", assignedById: userId },
      });
      await tx.saaSSubscription.create({
        data: { orgId: created.id, trialStartAt: trial.trialStartAt, trialEndAt: trial.trialEndAt },
      });
      if (body.platformReferralCode) {
        const normalizedReferral = body.platformReferralCode.toLowerCase();
        if (normalizedReferral !== username) {
          const sourceOrg = await tx.organization.findUnique({
            where: { username: normalizedReferral },
            select: { id: true },
          });
          if (sourceOrg) {
            await tx.orgReferralPartnership.upsert({
              where: {
                sourceOrgId_targetOrgId: { sourceOrgId: sourceOrg.id, targetOrgId: created.id },
              },
              create: {
                sourceOrgId: sourceOrg.id,
                targetOrgId: created.id,
                referralPolicySnapshot: {
                  code: body.platformReferralCode,
                  redeemedAt: new Date().toISOString(),
                  rewardTier: "trial_extension_30d",
                } as Prisma.InputJsonValue,
                status: "pending",
              },
              update: {},
            });
          }
        }
      }
      await tx.organizationSetting.create({
        data: {
          orgId: created.id,
          keyValues: {
            defaultBranchId: branch.id,
            attendanceMode: "EXCEPTION_APPROVAL",
            equipment: body.equipment,
            gymType: body.amenities[0] ?? "",
          },
        },
      });
      await tx.notificationTemplate.createMany({
        data: starterNotificationTemplates(created.id, userId),
      });
      return created;
    });
    await writeAuditLog({
      request,
      orgId: org.id,
      actorUserId: userId,
      action: "organization.created",
      entityType: "organization",
      entityId: org.id,
      metadata: { username: org.username },
    });
    return ok({ org });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", "current"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const membership = await prisma.organizationUser.findFirst({
      where: { userId, status: "active" },
    });
    if (!membership) {
      return ok({ org: null });
    }
    return ok({ org: await prisma.organization.findUnique({ where: { id: membership.orgId } }) });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "billing-profile"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "ORG_MANAGE_BILLING");
    const [org, subscription] = await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId } }),
      prisma.saaSSubscription.findUnique({ where: { orgId } }),
    ]);
    if (!org) {
      throw notFoundError("Organization not found");
    }
    return ok({
      billingProfile: {
        legalName: org.legalName ?? "",
        gstNumber: org.gstNumber ?? "",
        billingEmail: subscription?.billingEmail ?? org.contactEmail ?? "",
        contactEmail: org.contactEmail ?? "",
        contactPhone: org.contactPhone ?? "",
        address: org.address,
        city: org.city,
        state: org.state,
        pincode: org.pincode,
        receiptReady: missingBillingDetails(org, "receipt").length === 0,
        invoiceReady: missingBillingDetails(org, "invoice").length === 0,
        receiptMissing: missingBillingDetails(org, "receipt"),
        invoiceMissing: missingBillingDetails(org, "invoice"),
      },
    });
  }
  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "billing-profile"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_BILLING");
    const body = organizationBillingDetailsSchema.parse(await readJson(request));
    const [org] = await prisma.$transaction([
      prisma.organization.update({
        where: { id: orgId },
        data: {
          legalName: body.legalName,
          gstNumber: body.gstNumber,
          contactEmail: body.contactEmail,
          contactPhone: body.contactPhone || null,
          address: body.address,
          city: body.city,
          state: body.state,
          pincode: body.pincode,
        },
      }),
      prisma.saaSSubscription.upsert({
        where: { orgId },
        create: {
          orgId,
          status: "TRIAL_ACTIVE",
          trialStartAt: new Date(),
          trialEndAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          billingEmail: body.contactEmail,
        },
        update: { billingEmail: body.contactEmail },
      }),
    ]);
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "organization.billing_profile_updated",
      entityType: "organization",
      entityId: orgId,
    });
    return ok({
      billingProfile: {
        legalName: org.legalName ?? "",
        gstNumber: org.gstNumber ?? "",
        billingEmail: body.contactEmail,
        contactEmail: org.contactEmail ?? "",
        contactPhone: org.contactPhone ?? "",
        address: org.address,
        city: org.city,
        state: org.state,
        pincode: org.pincode,
        receiptReady: missingBillingDetails(org, "receipt").length === 0,
        invoiceReady: missingBillingDetails(org, "invoice").length === 0,
        receiptMissing: missingBillingDetails(org, "receipt"),
        invoiceMissing: missingBillingDetails(org, "invoice"),
      },
    });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "billing", "subscription"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "ORG_MANAGE_BILLING");
    const [org, subscription, mandate, activeMemberCount, planCatalog, usage] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { id: true, username: true, status: true, trialStartAt: true, trialEndAt: true },
      }),
      prisma.saaSSubscription.findUnique({ where: { orgId } }),
      prisma.saaSBillingMandate.findUnique({ where: { orgId } }),
      prisma.memberProfile.count({ where: { orgId } }),
      getSaasPlanCatalog(),
      getOrgSaasUsage(orgId),
    ]);
    if (!org) {
      throw notFoundError("Organization not found");
    }
    const resolvedTier =
      subscription?.tier === "STARTER" || subscription?.tier === "GROWTH" || subscription?.tier === "PRO"
        ? subscription.tier
        : "FREE";
    const referralPartnerships = await prisma.orgReferralPartnership.findMany({
      where: { sourceOrgId: orgId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return ok({
      subscription: {
        orgStatus: org.status,
        trialStartAt: org.trialStartAt,
        trialEndAt: org.trialEndAt,
        status: subscription?.status ?? org.status,
        tier: subscription?.tier ?? "FREE",
        billingCycle: subscription?.billingCycle ?? "MONTHLY",
        priceLockedPaise: subscription?.priceLockedPaise ?? null,
        billingEmail: subscription?.billingEmail ?? null,
        nextBillingAt: subscription?.nextBillingAt ?? null,
        nextRenewalAt: subscription?.nextRenewalAt ?? null,
        cancelledAt: subscription?.cancelledAt ?? null,
        cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
      },
      activeMemberCount,
      pricing: pricingFromPlanCatalog(planCatalog),
      planCatalog,
      entitlements: planCatalog[resolvedTier].entitlements,
      usage,
      mandate: mandate
        ? {
            id: mandate.id,
            status: mandate.status,
            provider: mandate.provider,
            providerMandateId: mandate.providerMandateId,
            amountPaise: mandate.amountPaise,
            currency: mandate.currency,
            billingPeriod: mandate.billingPeriod,
            billingInterval: mandate.billingInterval,
            paidCount: mandate.paidCount,
            totalCount: mandate.totalCount,
            nextChargeAt: mandate.nextChargeAt,
            currentEndAt: mandate.currentEndAt,
            authenticatedAt: mandate.authenticatedAt,
            activatedAt: mandate.activatedAt,
            cancelledAt: mandate.cancelledAt,
            checkoutUrl: mandate.checkoutUrl,
          }
        : null,
      platformReferral: {
        code: org.username.toUpperCase(),
        referredCount: referralPartnerships.length,
        recent: referralPartnerships.slice(0, 5).map((row) => ({
          id: row.id,
          targetOrgId: row.targetOrgId,
          status: row.status,
          createdAt: row.createdAt,
        })),
      },
    });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "saas-subscription", "upgrade"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_BILLING");
    await assertRateLimit(
      "paymentSessionByActor",
      `saas-upgrade:${orgId}:${userId}`,
      "Too many billing setup attempts.",
    );
    const body = saasUpgradeSchema.parse(await readJson(request).catch(() => ({})));
    const tier = body.tier as PaidSaasTier;
    const billingCycle = body.billingCycle as SaasBillingCycle;
    const [org, subscription, existingMandate, pricing] = await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId } }),
      prisma.saaSSubscription.findUnique({ where: { orgId } }),
      prisma.saaSBillingMandate.findUnique({ where: { orgId } }),
      getSaasPricing(),
    ]);
    if (!org) throw notFoundError("Organization not found");
    const provider = getPaymentProviderOrThrow();
    const amountPaise = priceForSaasPlan(pricing, tier, billingCycle);
    const now = new Date();
    const startsAt =
      org.trialEndAt && org.trialEndAt.getTime() > now.getTime() ? org.trialEndAt : now;
    const nextRenewalAt = renewalAfter(startsAt, billingCycle);
    const session = await prisma.paymentSession.create({
      data: {
        orgId,
        userId,
        purpose: "SAAS_BILLING",
        amountPaise,
        currency: "INR",
        status: "CREATED",
        checkoutUrl: "",
        provider: provider.providerName,
        metadata: {
          purpose: "SAAS_BILLING",
          orgId,
          tier,
          billingCycle,
          priceLockedPaise: amountPaise,
        } as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    const mandate =
      existingMandate ??
      (await prisma.saaSBillingMandate.create({
        data: {
          orgId,
          createdByUserId: userId,
          provider: provider.providerName,
          status: "CREATED",
          amountPaise,
          currency: "INR",
          billingPeriod: billingCycle === "YEARLY" ? "yearly" : "monthly",
          billingInterval: 1,
          totalCount: billingCycle === "YEARLY" ? 10 : 120,
          nextChargeAt: startsAt,
          paymentSessionId: session.id,
          metadata: { orgId, paymentSessionId: session.id, tier, billingCycle } as Prisma.InputJsonValue,
        },
      }));
    const createdMandate = await provider.createMandate({
      orgId,
      userId,
      amountPaise,
      currency: "INR",
      referenceId: session.id,
      planName: `Zook ${tier.toLowerCase()} ${billingCycle.toLowerCase()}`,
      description: `Zook ${tier} plan billed ${billingCycle.toLowerCase()}`,
      billingPeriod: billingCycle === "YEARLY" ? "yearly" : "monthly",
      billingInterval: 1,
      totalCount: billingCycle === "YEARLY" ? 10 : 120,
      startAt: startsAt,
      returnUrl: `/dashboard/billing`,
      customer: clean({
        name: org.name,
        email: org.contactEmail ?? subscription?.billingEmail ?? undefined,
        phone: org.contactPhone ?? undefined,
      }),
      metadata: {
        purpose: "SAAS_BILLING",
        saasBillingMandateId: mandate.id,
        orgId,
        paymentSessionId: session.id,
        tier,
        billingCycle,
        priceLockedPaise: amountPaise,
      },
    });
    const checkoutUrl =
      createdMandate.checkoutUrl ??
      (provider.providerName === "mock" ? `/checkout/mock/${session.id}` : `/checkout/${session.id}`);
    const [updatedMandate, updatedSession, updatedSubscription] = await prisma.$transaction([
      prisma.saaSBillingMandate.update({
        where: { id: mandate.id },
        data: clean({
          provider: provider.providerName,
          status: providerMandateStatusToLocal(createdMandate.status),
          providerMandateId: createdMandate.mandateId,
          providerPlanId: createdMandate.providerPlanId,
          checkoutUrl,
          amountPaise,
          billingPeriod: billingCycle === "YEARLY" ? "yearly" : "monthly",
          totalCount: billingCycle === "YEARLY" ? 10 : 120,
          nextChargeAt: createdMandate.nextChargeAt ?? startsAt,
          currentStartAt: createdMandate.currentStartAt,
          currentEndAt: createdMandate.currentEndAt,
          paidCount: createdMandate.paidCount,
          paymentSessionId: session.id,
          metadata: {
            ...getObjectMetadata(mandate.metadata),
            orgId,
            paymentSessionId: session.id,
            tier,
            billingCycle,
            priceLockedPaise: amountPaise,
            providerCheckoutData: createdMandate.checkoutData ?? null,
          } as Prisma.InputJsonValue,
        }),
      }),
      prisma.paymentSession.update({
        where: { id: session.id },
        data: {
          provider: provider.providerName,
          providerRef: createdMandate.mandateId,
          checkoutUrl,
          status: "CREATED",
          metadata: {
            ...getObjectMetadata(session.metadata),
            saasBillingMandateId: mandate.id,
            tier,
            billingCycle,
            priceLockedPaise: amountPaise,
            providerCheckoutData: createdMandate.checkoutData ?? null,
          } as Prisma.InputJsonValue,
        },
      }),
      prisma.saaSSubscription.upsert({
        where: { orgId },
        create: {
          orgId,
          status: "TRIAL_ACTIVE",
          tier,
          billingCycle,
          trialStartAt: org.trialStartAt ?? new Date(),
          trialEndAt: org.trialEndAt ?? startsAt,
          billingEmail: org.contactEmail,
          paymentSessionId: session.id,
          nextBillingAt: createdMandate.nextChargeAt ?? startsAt,
          nextRenewalAt,
          priceLockedPaise: amountPaise,
        },
        update: {
          tier,
          billingCycle,
          billingEmail: org.contactEmail,
          paymentSessionId: session.id,
          nextBillingAt: createdMandate.nextChargeAt ?? startsAt,
          nextRenewalAt,
          priceLockedPaise: amountPaise,
          cancelAtPeriodEnd: false,
          cancelledAt: null,
        },
      }),
    ]);
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "organization.saas_subscription_upgrade_started",
      entityType: "saas_subscription",
      entityId: updatedSubscription.id,
      metadata: { tier, billingCycle, amountPaise },
    });
    return ok({
      subscription: updatedSubscription,
      mandate: updatedMandate,
      checkoutUrl,
      checkoutData: createdMandate.checkoutData ?? null,
      session: updatedSession,
    });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "saas-subscription", "cancel"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_BILLING");
    const [subscription, mandate] = await Promise.all([
      prisma.saaSSubscription.findUnique({ where: { orgId } }),
      prisma.saaSBillingMandate.findUnique({ where: { orgId } }),
    ]);
    if (!subscription) throw notFoundError("SaaS subscription not found.");
    let nextMandate = mandate;
    if (mandate?.providerMandateId && !mandate.cancelledAt && mandate.status !== "CANCELLED") {
      const provider = getPaymentProviderOrThrow();
      const cancellation = await provider.cancelMandate({ mandateId: mandate.providerMandateId });
      nextMandate = await prisma.saaSBillingMandate.update({
        where: { id: mandate.id },
        data: {
          status: providerMandateStatusToLocal(cancellation.status),
          cancelledAt: new Date(),
        },
      });
    }
    const updated = await prisma.saaSSubscription.update({
      where: { orgId },
      data: { cancelAtPeriodEnd: true, cancelledAt: new Date() },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "organization.saas_subscription_cancel_at_period_end",
      entityType: "saas_subscription",
      entityId: updated.id,
      metadata: { mandateId: nextMandate?.id },
    });
    return ok({ subscription: updated, mandate: nextMandate });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "billing", "mandate"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_BILLING");
    await assertRateLimit(
      "paymentSessionByActor",
      `saas-billing:${orgId}:${userId}`,
      "Too many billing setup attempts.",
    );
    const body = saasBillingMandateSchema.parse(await readJson(request).catch(() => ({})));
    const [org, subscription, existingMandate] = await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId } }),
      prisma.saaSSubscription.findUnique({ where: { orgId } }),
      prisma.saaSBillingMandate.findUnique({ where: { orgId } }),
    ]);
    if (!org) {
      throw notFoundError("Organization not found");
    }
    if (existingMandate?.checkoutUrl && liveMandateStatuses.includes(existingMandate.status)) {
      return ok({
        mandate: existingMandate,
        checkoutUrl: existingMandate.checkoutUrl,
        checkoutData: null,
        session: existingMandate.paymentSessionId
          ? await prisma.paymentSession.findUnique({
              where: { id: existingMandate.paymentSessionId },
            })
          : null,
      });
    }

    const provider = getPaymentProviderOrThrow();
    const amountPaise =
      body.amountPaise ?? Number(process.env.ZOOK_SAAS_MONTHLY_AMOUNT_PAISE ?? 299900);
    if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
      throw validationError("Zook SaaS billing amount is not configured.");
    }
    const trialEndAt =
      subscription?.trialEndAt ?? org.trialEndAt ?? new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    const session = await prisma.paymentSession.create({
      data: {
        orgId,
        userId,
        purpose: "SAAS_BILLING",
        amountPaise,
        currency: "INR",
        status: "CREATED",
        checkoutUrl: "",
        provider: provider.providerName,
        metadata: clean({
          purpose: "SAAS_BILLING",
          orgId,
          startsAfterTrial: true,
        }) as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    let mandate = existingMandate;
    if (!mandate) {
      mandate = await prisma.saaSBillingMandate.create({
        data: {
          orgId,
          createdByUserId: userId,
          provider: provider.providerName,
          status: "CREATED",
          amountPaise,
          currency: "INR",
          billingPeriod: "monthly",
          billingInterval: 1,
          totalCount: 120,
          nextChargeAt: trialEndAt,
          paymentSessionId: session.id,
          metadata: clean({
            orgId,
            paymentSessionId: session.id,
          }) as Prisma.InputJsonValue,
        },
      });
    }
    let createdMandate;
    try {
      createdMandate = await provider.createMandate({
        orgId,
        userId,
        amountPaise,
        currency: "INR",
        referenceId: session.id,
        planName: "Zook Gym OS monthly",
        description: "Zook Gym OS billing after the two-month free trial",
        billingPeriod: "monthly",
        billingInterval: 1,
        totalCount: 120,
        startAt: trialEndAt,
        returnUrl: `/dashboard/billing`,
        customer: clean({
          name: org.name,
          email: org.contactEmail ?? subscription?.billingEmail ?? undefined,
          phone: org.contactPhone ?? undefined,
        }),
        metadata: {
          purpose: "SAAS_BILLING",
          saasBillingMandateId: mandate.id,
          orgId,
          paymentSessionId: session.id,
        },
      });
    } catch (error) {
      await prisma.$transaction([
        prisma.paymentSession.update({
          where: { id: session.id },
          data: { status: "FAILED", completedAt: new Date() },
        }),
        prisma.saaSBillingMandate.update({
          where: { id: mandate.id },
          data: { status: "FAILED", paymentSessionId: session.id },
        }),
      ]);
      throw error;
    }

    const checkoutUrl =
      createdMandate.checkoutUrl ??
      (provider.providerName === "mock"
        ? `/checkout/mock/${session.id}`
        : `/checkout/${session.id}`);
    const [updatedMandate, updatedSession] = await prisma.$transaction([
      prisma.saaSBillingMandate.update({
        where: { id: mandate.id },
        data: clean({
          provider: provider.providerName,
          status: providerMandateStatusToLocal(createdMandate.status),
          providerMandateId: createdMandate.mandateId,
          providerPlanId: createdMandate.providerPlanId,
          checkoutUrl,
          currentStartAt: createdMandate.currentStartAt,
          currentEndAt: createdMandate.currentEndAt,
          nextChargeAt: createdMandate.nextChargeAt ?? trialEndAt,
          paidCount: createdMandate.paidCount,
          totalCount: createdMandate.totalCount,
          paymentSessionId: session.id,
          metadata: {
            ...getObjectMetadata(mandate.metadata),
            orgId,
            paymentSessionId: session.id,
            providerCheckoutData: createdMandate.checkoutData ?? null,
          } as Prisma.InputJsonValue,
        }),
      }),
      prisma.paymentSession.update({
        where: { id: session.id },
        data: {
          provider: provider.providerName,
          providerRef: createdMandate.mandateId,
          checkoutUrl,
          status: "CREATED",
          metadata: {
            ...getObjectMetadata(session.metadata),
            saasBillingMandateId: mandate.id,
            providerCheckoutData: createdMandate.checkoutData ?? null,
          } as Prisma.InputJsonValue,
        },
      }),
      prisma.saaSSubscription.upsert({
        where: { orgId },
        create: {
          orgId,
          status: "TRIAL_ACTIVE",
          trialStartAt: org.trialStartAt ?? new Date(),
          trialEndAt,
          billingEmail: org.contactEmail,
          paymentSessionId: session.id,
          nextBillingAt: createdMandate.nextChargeAt ?? trialEndAt,
        },
        update: {
          billingEmail: org.contactEmail,
          paymentSessionId: session.id,
          nextBillingAt: createdMandate.nextChargeAt ?? trialEndAt,
        },
      }),
    ]);
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "organization.billing_mandate_created",
      entityType: "saas_billing_mandate",
      entityId: updatedMandate.id,
      metadata: { provider: provider.providerName },
    });
    return ok({
      mandate: updatedMandate,
      checkoutUrl,
      checkoutData: createdMandate.checkoutData ?? null,
      session: updatedSession,
    });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "profile"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "ORG_MANAGE_PROFILE");
    const [org, settings, branches] = await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId } }),
      prisma.organizationSetting.findUnique({ where: { orgId } }),
      prisma.branch.findMany({
        where: { orgId },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      }),
    ]);
    if (!org) {
      throw notFoundError("Organization not found");
    }
    const settingValues = getObjectMetadata(settings?.keyValues);
    return ok({
      org: {
        ...org,
        tagline: typeof settingValues.tagline === "string" ? settingValues.tagline : "",
        gallery: Array.isArray(settingValues.gallery)
          ? settingValues.gallery.filter((item): item is string => typeof item === "string")
          : [],
        facilities: Array.isArray(settingValues.facilities)
          ? settingValues.facilities.filter((item): item is string => typeof item === "string")
          : [],
        equipment: Array.isArray(settingValues.equipment)
          ? settingValues.equipment.filter((item): item is string => typeof item === "string")
          : [],
        gymType: typeof settingValues.gymType === "string" ? settingValues.gymType : "",
        openingHoursSummary:
          typeof settingValues.openingHoursSummary === "string"
            ? settingValues.openingHoursSummary
            : "",
        appStoreUrl: typeof settingValues.appStoreUrl === "string" ? settingValues.appStoreUrl : "",
        playStoreUrl:
          typeof settingValues.playStoreUrl === "string" ? settingValues.playStoreUrl : "",
      },
      branches,
      links: {
        publicProfile: `/in/${org.username}`,
        join: `/join/${org.username}`,
        appDeepLink: `zook://join/${org.username}`,
        qr: `/qr/${org.username}?target=join`,
      },
    });
  }
  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "profile"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_PROFILE");
    const body = organizationPublicProfileSchema.parse(await readJson(request));
    const existing = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!existing) {
      throw notFoundError("Organization not found");
    }
    const nextUsername = body.username ? normalizeUsername(body.username) : existing.username;
    if (nextUsername !== existing.username) {
      const usernameOwner = await prisma.organization.findUnique({
        where: { username: nextUsername },
      });
      if (usernameOwner && usernameOwner.id !== orgId) {
        throw conflictError("This public username is already taken.");
      }
    }
    const galleryAssets = body.galleryAssetIds?.length
      ? await Promise.all(
          body.galleryAssetIds.map((assetId) =>
            getOrganizationScopedFileAsset(assetId, orgId, ["org_gallery"]),
          ),
        )
      : null;
    const gallery = galleryAssets
      ? galleryAssets.map((asset) => asset?.url).filter((url): url is string => Boolean(url))
      : body.gallery;
    const org = await prisma.$transaction(async (tx) => {
      const updated = await tx.organization.update({
        where: { id: orgId },
        data: clean({
          name: body.name,
          username: nextUsername,
          contactPhone: body.contactPhone,
          contactEmail: body.contactEmail,
          address: body.address,
          city: body.city,
          state: body.state,
          pincode: body.pincode,
          amenities: body.amenities,
          visibility: body.visibility,
          joinMode: body.joinMode,
          logoUrl: body.logoUrl || null,
          coverImageUrl: body.coverImageUrl || null,
        }),
      });
      if (nextUsername !== existing.username) {
        await tx.organizationUsernameHistory.create({
          data: {
            orgId,
            oldUsername: existing.username,
            newUsername: nextUsername,
            changedById: userId,
          },
        });
      }
      const currentSettings = await tx.organizationSetting.findUnique({ where: { orgId } });
      const currentValues = getObjectMetadata(currentSettings?.keyValues);
      await tx.organizationSetting.upsert({
        where: { orgId },
        create: {
          orgId,
          keyValues: {
            ...currentValues,
            tagline: body.tagline ?? "",
            gallery,
            facilities: body.facilities,
            equipment: body.equipment,
            gymType: body.gymType ?? "",
            openingHoursSummary: body.openingHoursSummary ?? "",
            appStoreUrl: body.appStoreUrl || "",
            playStoreUrl: body.playStoreUrl || "",
          } as Prisma.InputJsonValue,
        },
        update: {
          keyValues: {
            ...currentValues,
            tagline: body.tagline ?? "",
            gallery,
            facilities: body.facilities,
            equipment: body.equipment,
            gymType: body.gymType ?? "",
            openingHoursSummary: body.openingHoursSummary ?? "",
            appStoreUrl: body.appStoreUrl || "",
            playStoreUrl: body.playStoreUrl || "",
          } as Prisma.InputJsonValue,
        },
      });
      await tx.branch.updateMany({
        where: { orgId, isDefault: true },
        data: {
          address: body.address,
          city: body.city,
          state: body.state,
          pincode: body.pincode,
        },
      });
      return updated;
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "organization.public_profile_updated",
      entityType: "organization",
      entityId: orgId,
      metadata: {
        username: org.username,
        visibility: org.visibility,
        joinMode: org.joinMode,
      },
    });
    const branches = await prisma.branch.findMany({
      where: { orgId },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
    return ok({
      org: {
        ...org,
        tagline: body.tagline ?? "",
        gallery,
        facilities: body.facilities,
        equipment: body.equipment,
        gymType: body.gymType ?? "",
        openingHoursSummary: body.openingHoursSummary ?? "",
        appStoreUrl: body.appStoreUrl || "",
        playStoreUrl: body.playStoreUrl || "",
      },
      branches,
      links: {
        publicProfile: `/in/${org.username}`,
        join: `/join/${org.username}`,
        appDeepLink: `zook://join/${org.username}`,
        qr: `/qr/${org.username}?target=join`,
      },
    });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "branches"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "ORG_MANAGE_LOCATION");
    return ok({
      branches: await prisma.branch.findMany({
        where: { orgId },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      }),
    });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "branches"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_LOCATION");
    await assertRateLimit(
      "branchCreationBurstByOwner",
      `${orgId}:${userId}`,
      "Please wait a moment before adding another branch.",
    );
    await assertRateLimit(
      "branchCreationByOwner",
      `${orgId}:${userId}`,
      "Please wait a moment before adding another branch.",
    );
    const body = await resolveBranchLocation(branchManageSchema.parse(await readJson(request)));
    const warnings = branchLocationWarnings(body);
    await assertBranchManager(orgId, body.managerId);
    const duplicate = await prisma.branch.findFirst({
      where: { orgId, address: body.address, city: body.city, active: true },
    });
    if (duplicate) {
      throw conflictError("A branch with this address already exists.");
    }
    const [{ tier, entitlements }, activeBranchCount] = await Promise.all([
      getOrgSaasEntitlements(orgId),
      prisma.branch.count({ where: { orgId, active: true } }),
    ]);
    assertLimitAvailable({
      limit: entitlements.branchLimit,
      used: activeBranchCount,
      label: "Branch",
      tier,
    });
    const branch = await prisma.$transaction(async (tx) => {
      const previousDefault = await tx.branch.findFirst({
        where: { orgId, isDefault: true, active: true },
      });
      if (body.isDefault) {
        await tx.branch.updateMany({
          where: { orgId, isDefault: true },
          data: { isDefault: false },
        });
      }
      const created = await tx.branch.create({
        data: clean({
          orgId,
          name: body.name,
          address: body.address,
          city: body.city,
          state: body.state,
          pincode: body.pincode,
          latitude: body.latitude != null ? new Prisma.Decimal(body.latitude) : undefined,
          longitude: body.longitude != null ? new Prisma.Decimal(body.longitude) : undefined,
          locationSource: body.locationSource ?? "MANUAL",
          contactPhone: body.contactPhone,
          contactEmail: body.contactEmail,
          whatsappNumber: body.whatsappNumber ?? body.contactPhone,
          operatingHours: body.operatingHours as Prisma.InputJsonValue | undefined,
          amenities: body.amenities,
          managerId: body.managerId,
          logoAssetId: body.logoAssetId,
          coverAssetId: body.coverAssetId,
          isDefault: body.isDefault ?? false,
          active: body.active ?? true,
        }),
      });
      const activeDefault = await tx.branch.findFirst({
        where: { orgId, isDefault: true, active: true },
      });
      const sharedCommerceSource = body.isDefault ? previousDefault : activeDefault;
      if (body.commerceSetup === "SHARED" && sharedCommerceSource) {
        const [plans, products] = await Promise.all([
          tx.membershipPlan.findMany({
            where: {
              orgId,
              active: true,
              OR: [{ branchId: null }, { branchId: sharedCommerceSource.id }],
            },
          }),
          tx.product.findMany({
            where: {
              orgId,
              active: true,
              OR: [{ branchId: null }, { branchId: sharedCommerceSource.id }],
            },
          }),
        ]);
        if (plans.length) {
          await tx.membershipPlan.createMany({
            data: plans.map((plan) =>
              clean({
                orgId,
                branchId: created.id,
                name: plan.name,
                description: plan.description,
                type: plan.type,
                pricePaise: plan.pricePaise,
                currency: plan.currency,
                gstRateBps: plan.gstRateBps,
                joiningFeePaise: plan.joiningFeePaise,
                durationDays: plan.durationDays,
                visitLimit: plan.visitLimit,
                validityDays: plan.validityDays,
                startDate: plan.startDate,
                endDate: plan.endDate,
                accessDays: plan.accessDays as Prisma.InputJsonValue | undefined,
                maxEntriesPerDay: plan.maxEntriesPerDay,
                active: plan.active,
                publicVisible: plan.publicVisible,
                terms: plan.terms,
                cancellationPolicy: plan.cancellationPolicy,
                createdById: userId,
              }),
            ),
          });
        }
        if (products.length) {
          await tx.product.createMany({
            data: products.map((product) =>
              clean({
                orgId,
                branchId: created.id,
                name: product.name,
                description: product.description,
                category: product.category,
                pricePaise: product.pricePaise,
                stock: product.stock,
                lowStockThreshold: product.lowStockThreshold,
                imageUrl: product.imageUrl,
                active: product.active,
                taxRateBps: product.taxRateBps,
              }),
            ),
          });
        }
      }
      if (!activeDefault) {
        await tx.branch.update({
          where: { id: created.id },
          data: { isDefault: true, active: true },
        });
        return tx.branch.findUniqueOrThrow({ where: { id: created.id } });
      }
      return created;
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "branch.created",
      entityType: "branch",
      entityId: branch.id,
      metadata: {
        name: branch.name,
        isDefault: branch.isDefault,
        commerceSetup: body.commerceSetup,
      },
    });
    return ok({ branch, warnings });
  }
  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "branches", /.+/])) {
    const orgId = path[1]!;
    const branchId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_LOCATION");
    const body = branchManageBaseSchema.partial().parse(await readJson(request));
    const existing = await prisma.branch.findFirst({ where: { id: branchId, orgId } });
    if (!existing) {
      throw notFoundError("Branch not found");
    }
    const warnings = branchLocationWarnings({
      state: body.state ?? existing.state,
      pincode: body.pincode ?? existing.pincode,
    });
    await assertBranchManager(orgId, body.managerId);
    if (body.address || body.city) {
      const duplicate = await prisma.branch.findFirst({
        where: {
          orgId,
          address: body.address ?? existing.address,
          city: body.city ?? existing.city,
          active: true,
          id: { not: branchId },
        },
      });
      if (duplicate) {
        throw conflictError("A branch with this address already exists.");
      }
    }
    const resolvedBody =
      (body.address || body.city || body.state || body.pincode) &&
      (body.latitude == null || body.longitude == null)
        ? await resolveBranchLocation({
            name: body.name ?? existing.name,
            address: body.address ?? existing.address,
            city: body.city ?? existing.city,
            state: body.state ?? existing.state,
            pincode: body.pincode ?? existing.pincode,
            latitude: body.latitude ?? undefined,
            longitude: body.longitude ?? undefined,
            locationSource: body.locationSource ?? undefined,
            contactPhone: body.contactPhone ?? existing.contactPhone ?? "",
            contactEmail: body.contactEmail ?? existing.contactEmail,
            whatsappNumber: body.whatsappNumber ?? existing.whatsappNumber,
            operatingHours: (body.operatingHours ?? existing.operatingHours) as never,
          })
        : body;
    const branch = await prisma.$transaction(async (tx) => {
      if (body.isDefault) {
        await tx.branch.updateMany({
          where: { orgId, isDefault: true, id: { not: branchId } },
          data: { isDefault: false },
        });
      }
      const updated = await tx.branch.update({
        where: { id: branchId },
        data: clean({
          name: resolvedBody.name,
          address: resolvedBody.address,
          city: resolvedBody.city,
          state: resolvedBody.state,
          pincode: resolvedBody.pincode,
          latitude:
            resolvedBody.latitude != null
              ? new Prisma.Decimal(resolvedBody.latitude)
              : resolvedBody.latitude,
          longitude:
            resolvedBody.longitude != null
              ? new Prisma.Decimal(resolvedBody.longitude)
              : resolvedBody.longitude,
          locationSource: resolvedBody.locationSource,
          contactPhone: resolvedBody.contactPhone,
          contactEmail: resolvedBody.contactEmail,
          whatsappNumber: resolvedBody.whatsappNumber,
          operatingHours:
            body.operatingHours === null
              ? Prisma.JsonNull
              : (body.operatingHours as Prisma.InputJsonValue | undefined),
          amenities: body.amenities,
          managerId: body.managerId,
          logoAssetId: body.logoAssetId,
          coverAssetId: body.coverAssetId,
          isDefault: body.isDefault,
          active: body.active,
        }),
      });
      if (updated.isDefault && !updated.active) {
        throw conflictError("Default branch must stay active.");
      }
      if (existing.isDefault && body.isDefault === false) {
        const replacement = await tx.branch.findFirst({
          where: { orgId, active: true, id: { not: branchId } },
          orderBy: { createdAt: "asc" },
        });
        if (!replacement) {
          throw conflictError("At least one active default branch is required.");
        }
        await tx.branch.update({ where: { id: replacement.id }, data: { isDefault: true } });
      }
      return updated;
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "branch.updated",
      entityType: "branch",
      entityId: branch.id,
      metadata: { name: branch.name, isDefault: branch.isDefault, active: branch.active },
    });
    return ok({ branch, warnings });
  }
  if (request.method === "DELETE" && pathMatches(path, ["orgs", /.+/, "branches", /.+/])) {
    const orgId = path[1]!;
    const branchId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_LOCATION");
    const existing = await prisma.branch.findFirst({ where: { id: branchId, orgId } });
    if (!existing) {
      throw notFoundError("Branch not found");
    }
    if (existing.isDefault) {
      throw conflictError(
        "Default branch cannot be deactivated. Make another branch default first.",
      );
    }
    const branch = await prisma.branch.update({
      where: { id: branchId },
      data: { active: false },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "branch.deactivated",
      entityType: "branch",
      entityId: branch.id,
      metadata: { name: branch.name },
    });
    return ok({ branch });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "dashboard"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "ORG_VIEW_REPORTS");
    const requestedBranchId = queryBranchId(request);
    const branchId = await assertBranchAccessForContext(ctx, orgId, requestedBranchId);
    return ok(
      await getOrganizationDashboardData(
        orgId,
        clean({
          branchId,
          allBranches: isAllBranchesRequest(requestedBranchId),
          allBranchesAllowed:
            ctx.isPlatformAdmin || ctx.roles.some((role) => role === "OWNER" || role === "ADMIN"),
        }),
      ),
    );
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "members"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "MEMBERS_VIEW");
    await assertRateLimit(
      "memberListByActor",
      `${orgId}:${userId}`,
      "Too many member list requests. Please wait before trying again.",
    );
    const branchId = await assertBranchAccessForContext(ctx, orgId, queryBranchId(request));
    const page = await listOrganizationMembersPage(orgId, request, branchId);
    if (page.members.length >= 75 || page.nextCursor) {
      await writeAuditLog({
        request,
        orgId,
        actorUserId: userId,
        action: "member.list.large_read",
        entityType: "member_profile",
        metadata: { count: page.members.length, hasMore: Boolean(page.nextCursor), branchId },
      });
    }
    return ok({
      members: page.members,
      nextCursor: page.nextCursor,
      limit: page.limit,
    });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "members", /.+/])) {
    const { orgId, memberUserId } = orgMemberDetailParamsSchema.parse({
      orgId: path[1],
      memberUserId: path[3],
    });
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "MEMBERS_VIEW");
    const branchId = await assertBranchAccessForContext(ctx, orgId, queryBranchId(request));
    const membership = await prisma.organizationUser.findFirst({
      where: { orgId, userId: memberUserId, status: "active" },
    });
    if (!membership) {
      throw notFoundError("Member not found");
    }
    if (branchId) {
      const branchSubscription = await prisma.memberSubscription.findFirst({
        where: { orgId, branchId, memberUserId },
      });
      if (!branchSubscription) {
        throw forbiddenError("This member belongs to another branch.");
      }
    }
    const [user, profile, subscriptions, payments, attendance, bodyProgress, workouts] =
      await Promise.all([
        prisma.user.findUnique({ where: { id: memberUserId } }),
        prisma.memberProfile.findUnique({
          where: { orgId_userId: { orgId, userId: memberUserId } },
        }),
        prisma.memberSubscription.findMany({
          where: { orgId, memberUserId },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
        prisma.payment.findMany({
          where: { orgId, userId: memberUserId },
          orderBy: { recordedAt: "desc" },
          take: 10,
        }),
        prisma.attendanceRecord.findMany({
          where: { orgId, userId: memberUserId },
          orderBy: { checkedInAt: "desc" },
          take: 20,
        }),
        prisma.bodyProgressEntry.findMany({
          where: { organizationId: orgId, userId: memberUserId },
          orderBy: { measuredAt: "desc" },
          take: 12,
        }),
        prisma.workoutSession.findMany({
          where: { organizationId: orgId, userId: memberUserId, visibility: "TRAINER_VISIBLE" },
          orderBy: { startedAt: "desc" },
          take: 10,
        }),
      ]);
    const plans = await prisma.membershipPlan.findMany({
      where: { id: { in: subscriptions.map((subscription) => subscription.planId) } },
    });
    return ok({
      member: {
        user: user ? { ...user, email: publicUserEmail(user.email) ?? "" } : null,
        profile,
        subscriptions: subscriptions.map((subscription) => ({
          ...subscription,
          plan: plans.find((plan) => plan.id === subscription.planId) ?? null,
        })),
        activeSubscription:
          subscriptions.find((subscription) => subscription.status === "ACTIVE") ??
          subscriptions[0] ??
          null,
        lastCheckIn: attendance[0] ?? null,
        recentCheckIns: attendance.slice(0, 3),
        lastPayment: payments[0] ?? null,
        payments,
        attendance,
        bodyProgress,
        workouts,
      },
    });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "reports", "summary"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "ORG_VIEW_REPORTS");
    const requestedBranchId = queryBranchId(request);
    const branchId = await assertBranchAccessForContext(ctx, orgId, requestedBranchId);
    return ok(
      await getOrganizationDashboardData(
        orgId,
        clean({
          branchId,
          allBranches: isAllBranchesRequest(requestedBranchId),
          allBranchesAllowed:
            ctx.isPlatformAdmin || ctx.roles.some((role) => role === "OWNER" || role === "ADMIN"),
        }),
      ),
    );
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "location", "resolve"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_LOCATION");
    const body = (await readJson(request)) as {
      googleMapsUrl?: string;
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
    };
    const mapProvider = getMapProviderOrThrow();
    const result = body.googleMapsUrl
      ? await mapProvider.resolveGoogleMapsLink(body.googleMapsUrl)
      : await mapProvider.geocodeAddress({
          address: body.address ?? "Manual address",
          city: body.city ?? "Pune",
          state: body.state ?? "Maharashtra",
          pincode: body.pincode ?? "411001",
        });
    if (!result) {
      throw validationError("Unable to resolve the provided Google Maps link.");
    }
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "organization.location_resolved",
      entityType: "organization",
      entityId: orgId,
      metadata: body,
    });
    return ok({ location: result });
  }
  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "location"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_LOCATION");
    const body = organizationLocationSchema.parse(await readJson(request));
    const mapProvider = getMapProviderOrThrow();
    const resolvedFromLink = body.googleMapsUrl
      ? await mapProvider.resolveGoogleMapsLink(body.googleMapsUrl)
      : null;
    if (body.googleMapsUrl && !resolvedFromLink) {
      throw validationError("Unable to resolve the provided Google Maps link.");
    }
    const location = resolvedFromLink ?? {
      address: body.address,
      city: body.city,
      state: body.state,
      pincode: body.pincode,
      latitude: body.latitude ?? 0,
      longitude: body.longitude ?? 0,
      locationSource: "MANUAL" as const,
      ...(body.googlePlaceId ? { googlePlaceId: body.googlePlaceId } : {}),
      ...(body.googleMapsUrl ? { originalGoogleMapsUrl: body.googleMapsUrl } : {}),
      name: body.address,
    };
    const org = await prisma.organization.update({
      where: { id: orgId },
      data: clean({
        address: location.address,
        city: location.city,
        state: location.state,
        pincode: location.pincode,
        latitude: new Prisma.Decimal(location.latitude),
        longitude: new Prisma.Decimal(location.longitude),
        googlePlaceId: location.googlePlaceId,
        originalGoogleMapsUrl: location.originalGoogleMapsUrl,
        locationSource: location.locationSource as never,
      }),
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "organization.location_updated",
      entityType: "organization",
      entityId: org.id,
      metadata: clean({
        googleMapsUrl: body.googleMapsUrl,
        googlePlaceId: location.googlePlaceId,
        locationSource: location.locationSource,
      }),
    });
    return ok({ org });
  }
  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "assets"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_PROFILE");
    const body = organizationAssetSchema.parse(await readJson(request));
    const [logoAsset, coverAsset] = await Promise.all([
      getOrganizationScopedFileAsset(body.logoAssetId, orgId, ["org_logo"]),
      getOrganizationScopedFileAsset(body.coverAssetId, orgId, ["org_cover"]),
    ]);
    const org = await prisma.organization.update({
      where: { id: orgId },
      data: clean({
        ...(logoAsset ? { logoUrl: logoAsset.url } : {}),
        ...(coverAsset ? { coverImageUrl: coverAsset.url } : {}),
      }),
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "organization.assets_updated",
      entityType: "organization",
      entityId: org.id,
      metadata: clean({
        logoAssetId: logoAsset?.id,
        coverAssetId: coverAsset?.id,
      }),
    });
    return ok({ org, assets: clean({ logoAsset, coverAsset }) });
  }
  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "join-mode"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_PROFILE");
    const body = (await readJson(request)) as {
      joinMode: "OPEN_JOIN" | "APPROVAL_REQUIRED" | "INVITE_ONLY";
    };
    const org = await prisma.organization.update({
      where: { id: orgId },
      data: { joinMode: body.joinMode },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "organization.join_mode_updated",
      entityType: "organization",
      entityId: org.id,
      metadata: { joinMode: body.joinMode },
    });
    return ok({ org });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "members", "import"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireAuth(ctx);
    requireOrgPermission(ctx, orgId, "MEMBERS_MANAGE");
    await assertRateLimit(
      "fileUploadByActor",
      `member-import:${orgId}:${userId}`,
      "Too many import attempts. Try again later.",
    );
    const body = z
      .object({
        csv: z.string().min(1).max(500_000),
        planId: z.string().optional(),
        sendWelcomeNotification: z.boolean().default(true),
        activateSubscription: z.boolean().default(false),
      })
      .parse(await readJson(request));

    const lines = body.csv
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length < 2) {
      throw validationError("CSV must contain a header row and at least one data row.");
    }
    const headerLine = lines[0]!.toLowerCase();
    const headers = headerLine.split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
    const nameIndex = headers.findIndex(
      (h) => h === "name" || h === "full name" || h === "member name",
    );
    const emailIndex = headers.findIndex((h) => h === "email" || h === "email address");
    const phoneIndex = headers.findIndex(
      (h) => h === "phone" || h === "mobile" || h === "phone number",
    );
    if (nameIndex < 0 || emailIndex < 0) {
      throw validationError("CSV must include 'name' and 'email' columns.");
    }

    const organization = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!organization) {
      throw notFoundError("Gym not found");
    }

    let plan: Awaited<ReturnType<typeof prisma.membershipPlan.findFirst>> | null = null;
    if (body.planId) {
      plan = await prisma.membershipPlan.findFirst({
        where: { id: body.planId, orgId, active: true },
      });
      if (!plan) {
        throw notFoundError("Membership plan not found");
      }
    }

    const dataLines = lines.slice(1);
    const maxRows = 500;
    if (dataLines.length > maxRows) {
      throw validationError(`Import limited to ${maxRows} members at a time.`);
    }

    const results: Array<{
      row: number;
      status: "created" | "existing" | "error";
      email?: string;
      error?: string;
    }> = [];
    const importedUserIds: string[] = [];
    const branch = await resolveOrgBranch(orgId);

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i]!;
      const columns = line.split(",").map((col) => col.trim().replace(/^["']|["']$/g, ""));
      const name = columns[nameIndex]?.trim();
      const email = columns[emailIndex]?.trim().toLowerCase();
      const phone =
        phoneIndex >= 0 ? normalizePhoneNumber(columns[phoneIndex]?.trim() ?? "") : undefined;

      if (!name || !email) {
        results.push({ row: i + 2, status: "error", error: "Missing name or email" });
        continue;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        results.push({ row: i + 2, status: "error", email, error: "Invalid email format" });
        continue;
      }

      try {
        let user = await prisma.user.findUnique({ where: { email } });
        let isNewUser = false;
        if (!user) {
          user = await prisma.user.create({
            data: clean({
              email,
              name,
              slug: await createUniqueMemberSlug(),
              phone: phone || undefined,
              marketingOptIn: true,
            }),
          });
          isNewUser = true;
        }

        await ensureOrganizationMembership({
          orgId,
          userId: user.id,
          marketingOptIn: user.marketingOptIn,
        });

        if (plan && body.activateSubscription) {
          const existingSub = await prisma.memberSubscription.findFirst({
            where: { orgId, memberUserId: user.id, status: { in: ["ACTIVE", "PENDING_PAYMENT"] } },
          });
          if (!existingSub) {
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
            await prisma.memberSubscription.create({
              data: clean({
                orgId,
                branchId: branch.id,
                memberUserId: user.id,
                planId: plan.id,
                status: "ACTIVE",
                startsAt: window.startsAt,
                endsAt: window.endsAt,
                remainingVisits: window.remainingVisits,
                activatedById: userId,
                notes: "bulk_import",
              }),
            });
          }
        }

        importedUserIds.push(user.id);
        results.push({ row: i + 2, status: isNewUser ? "created" : "existing", email });
      } catch (error) {
        results.push({
          row: i + 2,
          status: "error",
          email,
          error: error instanceof Error ? error.message : "Unexpected error",
        });
      }
    }

    if (body.sendWelcomeNotification && importedUserIds.length > 0) {
      await createDirectNotification({
        orgId,
        createdById: userId,
        type: "TRANSACTIONAL",
        title: `Welcome to ${organization.name}`,
        body: "You have been added as a member. Open Zook to check your membership details.",
        audience: "selected_members",
        userIds: importedUserIds,
      });
    }

    const created = results.filter((r) => r.status === "created").length;
    const existing = results.filter((r) => r.status === "existing").length;
    const errors = results.filter((r) => r.status === "error").length;

    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "members.bulk_imported",
      entityType: "organization",
      entityId: orgId,
      metadata: { totalRows: dataLines.length, created, existing, errors },
    });

    return ok({ results, summary: { total: dataLines.length, created, existing, errors } });
  }
  return undefined;
}

export async function handleReports(request: NextRequest, path: string[]) {
  const csvHeaders = (fileName: string) => ({
    "content-type": "text/csv; charset=utf-8",
    "content-disposition": `attachment; filename="${fileName}"`,
  });

  const reportRoutes: Record<string, OrgReportType> = {
    "members.csv": "members",
    "attendance.csv": "attendance",
    "payments.csv": "payments",
    "revenue.csv": "revenue",
    "manual-cash.csv": "manual-cash",
    "expiring-members.csv": "expiring-members",
    "invoices.csv": "invoices",
    "referrals.csv": "referrals",
    "shop.csv": "shop",
    "ai-usage.csv": "ai-usage",
  };

  if (
    request.method === "GET" &&
    path.length === 4 &&
    path[0] === "orgs" &&
    path[2] === "reports" &&
    path[3]
  ) {
    const orgId = path[1]!;
    const report = reportRoutes[path[3]!];
    if (!report) {
      return undefined;
    }

    const ctx = await getRequestContext(request, { orgId });
    const userId = requireAuth(ctx);
    await assertRateLimit(
      "reportExportByActor",
      `${orgId}:${userId}`,
      "Too many report exports from this account today.",
    );
    const filters = parseReportFilters(request.nextUrl.searchParams);
    const branchId = await assertBranchAccessForContext(ctx, orgId, filters.branchId);
    const scopedFilters = clean({
      ...filters,
      branchId,
      allBranches: isAllBranchesRequest(filters.branchId),
    });

    if (
      !canExportOrgReport({
        report,
        ctx,
        actorUserId: userId,
        ...(filters.trainerId ? { trainerId: filters.trainerId } : {}),
      })
    ) {
      throw forbiddenError("You do not have permission to export this report.");
    }

    const rows: Array<Record<string, unknown>> =
      report === "members"
        ? await reportsService.membersReport(orgId, scopedFilters)
        : report === "attendance"
          ? await reportsService.attendanceReport(orgId, scopedFilters)
          : report === "payments"
            ? await reportsService.paymentsReport(orgId, scopedFilters)
            : report === "revenue"
              ? await reportsService.revenueReport(orgId, scopedFilters)
              : report === "manual-cash"
                ? await reportsService.manualCashReport(orgId, scopedFilters)
                : report === "expiring-members"
                  ? await reportsService.membershipExpiryReport(orgId, scopedFilters)
                  : report === "invoices"
                    ? await reportsService.invoiceReport(orgId, scopedFilters)
                    : report === "referrals"
                      ? await reportsService.referralReport(orgId, scopedFilters)
                      : report === "shop"
                        ? await reportsService.shopReport(orgId, scopedFilters)
                        : await reportsService.aiUsageReport(orgId, scopedFilters);

    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "report.exported",
      entityType: "report",
      entityId: report,
      metadata: {
        format: "csv",
        rowCount: rows.length,
        filters: Object.fromEntries(request.nextUrl.searchParams.entries()),
      },
    });

    return new NextResponse(renderCsv({ report, generatedBy: userId, rows }), {
      headers: csvHeaders(`zook-${report}.csv`),
    });
  }

  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "audit-logs.csv"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireAuth(ctx);
    await assertRateLimit(
      "reportExportByActor",
      `${orgId}:${userId}`,
      "Too many report exports from this account today.",
    );
    const filters = parseReportFilters(request.nextUrl.searchParams);
    const branchId = await assertBranchAccessForContext(ctx, orgId, filters.branchId);
    const scopedFilters = clean({ ...filters, branchId });
    if (!canExportOrgReport({ report: "audit-logs", ctx, actorUserId: userId })) {
      throw forbiddenError("You do not have permission to export activity history.");
    }
    const rows = await reportsService.auditLogReport(orgId, scopedFilters);
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "report.exported",
      entityType: "report",
      entityId: "audit-logs",
      metadata: {
        format: "csv",
        rowCount: rows.length,
        filters: Object.fromEntries(request.nextUrl.searchParams.entries()),
      },
    });
    return new NextResponse(renderCsv({ report: "audit-logs", generatedBy: userId, rows }), {
      headers: csvHeaders("zook-audit-logs.csv"),
    });
  }

  return undefined;
}

export async function handleHealthReadiness(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["health"])) {
    return ok(getHealthPayload());
  }

  if (request.method === "GET" && pathMatches(path, ["ready"])) {
    const readiness = await getReadinessPayload();
    return ok(readiness, { status: readiness.ready ? 200 : 503 });
  }

  if (request.method === "GET" && pathMatches(path, ["status"])) {
    const statusPayload = await getStatusPayload();
    return NextResponse.json(statusPayload, {
      status: statusPayload.status === "down" ? 503 : 200,
    });
  }

  if (request.method === "POST" && pathMatches(path, ["diagnostics", "throw"])) {
    if (getAppEnv() !== "staging") {
      throw forbiddenError("Diagnostics throw is available only when APP_ENV=staging.");
    }
    const ctx = await getRequestContext(request);
    const userId = requirePlatformAdmin(ctx);
    const body = diagnosticsThrowSchema.parse(await readJson(request).catch(() => ({})));
    const error = new Error("Zook diagnostics throw test");
    if (body.mode === "handled") {
      getErrorReporter().captureException(error, {
        method: request.method,
        path: request.nextUrl.pathname,
        userId,
        metadata: {
          email: "diagnostics-redaction@example.com",
          phone: "+919999999999",
          mode: body.mode,
        },
      });
      return ok({ captured: true, mode: body.mode });
    }
    throw error;
  }

  if (request.method === "POST" && pathMatches(path, ["cron", "account-deletion-purge"])) {
    const cronSecret = process.env.CRON_SECRET?.trim();
    const authHeader = request.headers.get("authorization");
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      throw forbiddenError("Invalid cron authorization.");
    }
    if (!cronSecret && getAppEnv() === "production") {
      throw forbiddenError("CRON_SECRET must be set in production.");
    }

    const now = new Date();
    const runningCutoff = new Date(now.getTime() - 30 * 60 * 1000);
    const running = await prisma.accountDeletionJob.findFirst({
      where: { status: "RUNNING", startedAt: { gte: runningCutoff } },
    });
    if (running) {
      return ok({ processed: false, skipped: true, reason: "previous_run_active" });
    }

    const jobs = await prisma.accountDeletionJob.findMany({
      where: { status: "QUEUED", scheduledFor: { lte: now } },
      orderBy: { scheduledFor: "asc" },
      take: Number(process.env.ACCOUNT_DELETION_PURGE_BATCH_SIZE ?? 25),
    });
    let succeeded = 0;
    let failed = 0;
    for (const job of jobs) {
      try {
        await prisma.$transaction(async (tx) => {
          const user = await tx.user.findUnique({
            where: { id: job.userId },
            select: { email: true },
          });
          await tx.accountDeletionJob.update({
            where: { id: job.id },
            data: { status: "RUNNING", startedAt: now },
          });
          await tx.userSession.updateMany({
            where: { userId: job.userId, revokedAt: null },
            data: { revokedAt: now },
          });
          await tx.organizationUser.updateMany({
            where: { userId: job.userId },
            data: { status: "inactive" },
          });
          await tx.user.update({
            where: { id: job.userId },
            data: {
              email: `deleted-${randomUUID()}@deleted.zook.local`,
              emailVerifiedAt: null,
              name: "Deleted account",
              phone: null,
              phoneVerifiedAt: null,
              dateOfBirth: null,
              profilePhotoUrl: null,
              gender: null,
              fitnessGoal: null,
              emergencyContact: {},
              marketingOptIn: false,
              aiConsent: false,
              deletedAt: now,
            },
          });
          await tx.accountDeletionRequest.update({
            where: { id: job.requestId },
            data: { status: "completed", processedAt: now, completedAt: now },
          });
          await tx.accountDeletionJob.update({
            where: { id: job.id },
            data: { status: "SUCCEEDED", completedAt: now, anonymizedAt: now },
          });
          await tx.auditLog.create({
            data: {
              actorUserId: job.userId,
              action: "privacy.account_deleted",
              entityType: "user",
              entityId: job.userId,
              riskLevel: "HIGH",
              metadata: {
                previousEmailHash: user?.email
                  ? createHash("sha256").update(user.email.toLowerCase()).digest("hex")
                  : null,
                accountDeletionRequestId: job.requestId,
              },
            },
          });
        });
        succeeded++;
      } catch (error) {
        failed++;
        await prisma.accountDeletionJob.update({
          where: { id: job.id },
          data: {
            status: "FAILED",
            completedAt: new Date(),
            errorCode: "ACCOUNT_DELETION_PURGE_FAILED",
            errorMessage:
              error instanceof Error ? error.message : "Unknown account deletion error",
          },
        });
      }
    }
    return ok({ processed: true, jobs: jobs.length, succeeded, failed });
  }

  if (request.method === "POST" && pathMatches(path, ["cron", "renewal-reminders"])) {
    const cronSecret = process.env.CRON_SECRET?.trim();
    const authHeader = request.headers.get("authorization");
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      throw forbiddenError("Invalid cron authorization.");
    }
    if (!cronSecret && getAppEnv() === "production") {
      throw forbiddenError("CRON_SECRET must be set in production.");
    }

    const now = new Date();
    const reminderWindowDays = [7, 3, 1];
    let totalCreated = 0;
    let totalSkipped = 0;
    let totalNotified = 0;

    for (const daysAhead of reminderWindowDays) {
      const windowStart = new Date(now.getTime() + (daysAhead - 1) * 24 * 60 * 60 * 1000);
      const windowEnd = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

      const expiringSubscriptions = await prisma.memberSubscription.findMany({
        where: {
          status: "ACTIVE",
          endsAt: { gte: windowStart, lt: windowEnd },
        },
        take: 500,
      });

      const planIds = [...new Set(expiringSubscriptions.map((s) => s.planId))];
      const plans = planIds.length
        ? await prisma.membershipPlan.findMany({
            where: { id: { in: planIds } },
            select: { id: true, name: true },
          })
        : [];
      const planNameById = new Map(plans.map((p) => [p.id, p.name]));

      for (const sub of expiringSubscriptions) {
        const existingReminder = await prisma.subscriptionReminder.findFirst({
          where: {
            subscriptionId: sub.id,
            kind: "SUBSCRIPTION_EXPIRING",
            status: { in: ["PENDING", "SENT"] },
            dueAt: { gte: windowStart, lt: windowEnd },
          },
        });

        if (existingReminder) {
          totalSkipped++;
          continue;
        }

        await prisma.subscriptionReminder.create({
          data: {
            orgId: sub.orgId,
            userId: sub.memberUserId,
            subscriptionId: sub.id,
            kind: "SUBSCRIPTION_EXPIRING",
            status: "SENT",
            dueAt: sub.endsAt!,
            sentAt: now,
            attemptCount: 1,
            metadata: {
              daysRemaining: daysAhead,
              planName: planNameById.get(sub.planId),
            } as Prisma.InputJsonValue,
          },
        });
        totalCreated++;

        const daysLabel = daysAhead === 1 ? "tomorrow" : `in ${daysAhead} days`;
        try {
          await createDirectNotification({
            orgId: sub.orgId,
            type: "OPERATIONAL",
            title: "Membership expiring soon",
            body: `Your membership expires ${daysLabel}. Renew now to keep your access.`,
            audience: "expiring_member",
            userIds: [sub.memberUserId],
            pushEnabled: true,
            metadata: {
              subscriptionId: sub.id,
              daysRemaining: daysAhead,
            } as Prisma.InputJsonValue,
          });
          totalNotified++;
        } catch {
          // Notification delivery is best-effort for cron
        }
      }
    }

    for (const daysAhead of [7, 3, 1, 0]) {
      const windowStart = new Date(now.getTime() + (daysAhead - 1) * 24 * 60 * 60 * 1000);
      const windowEnd = new Date(now.getTime() + (daysAhead === 0 ? 1 : daysAhead) * 24 * 60 * 60 * 1000);
      const trialSubscriptions = await prisma.saaSSubscription.findMany({
        where: {
          status: "TRIAL_ACTIVE",
          trialEndAt: daysAhead === 0 ? { lte: now } : { gte: windowStart, lt: windowEnd },
        },
        take: 500,
      });
      for (const sub of trialSubscriptions) {
        const existingReminder = await prisma.subscriptionReminder.findFirst({
          where: {
            orgId: sub.orgId,
            kind: "SAAS_TRIAL_END",
            status: { in: ["PENDING", "SENT"] },
            metadata: { path: ["daysRemaining"], equals: daysAhead },
          },
        });
        if (existingReminder) {
          totalSkipped++;
          continue;
        }
        const owner = await prisma.organizationRoleAssignment.findFirst({
          where: { orgId: sub.orgId, role: "OWNER" },
          orderBy: { createdAt: "asc" },
        });
        if (!owner) {
          totalSkipped++;
          continue;
        }
        await prisma.subscriptionReminder.create({
          data: {
            orgId: sub.orgId,
            userId: owner.userId,
            kind: "SAAS_TRIAL_END",
            status: "SENT",
            dueAt: sub.trialEndAt,
            sentAt: now,
            attemptCount: 1,
            metadata: { daysRemaining: daysAhead, saasSubscriptionId: sub.id } as Prisma.InputJsonValue,
          },
        });
        totalCreated++;
        try {
          await createDirectNotification({
            orgId: sub.orgId,
            type: "OPERATIONAL",
            title: daysAhead === 0 ? "Zook trial ended" : "Zook trial ending soon",
            body:
              daysAhead === 0
                ? "Your free Zook trial has ended. Upgrade now to keep owner tools writable."
                : `Your free Zook trial ends in ${daysAhead} days. Upgrade now to keep owner tools writable.`,
            audience: "selected_member",
            userIds: [owner.userId],
            pushEnabled: true,
            metadata: { saasSubscriptionId: sub.id, daysRemaining: daysAhead } as Prisma.InputJsonValue,
          });
          totalNotified++;
        } catch {
          // Notification delivery is best-effort for cron
        }
      }
    }

    return ok({
      processed: true,
      remindersCreated: totalCreated,
      remindersSkipped: totalSkipped,
      notificationsSent: totalNotified,
    });
  }

  if (request.method === "POST" && pathMatches(path, ["cron", "refund-reconcile"])) {
    const cronSecret = process.env.CRON_SECRET?.trim();
    const authHeader = request.headers.get("authorization");
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      throw forbiddenError("Invalid cron authorization.");
    }
    if (!cronSecret && getAppEnv() === "production") {
      throw forbiddenError("CRON_SECRET must be set in production.");
    }

    const provider = getPaymentProvider();
    const cutoff = new Date(Date.now() - 10 * 60 * 1000);
    const refunds = await prisma.paymentRefund.findMany({
      where: {
        status: "REQUESTED",
        createdAt: { lte: cutoff },
        provider: provider.providerName,
      },
      orderBy: { createdAt: "asc" },
      take: 50,
    });
    let reconciled = 0;
    let skipped = 0;
    for (const refund of refunds) {
      const payment = await prisma.payment.findUnique({ where: { id: refund.paymentId } });
      if (!payment?.providerRef) {
        skipped++;
        continue;
      }
      const status = await provider.getPaymentStatus({ providerPaymentId: payment.providerRef });
      if (status !== "REFUNDED" && status !== "PARTIALLY_REFUNDED") {
        skipped++;
        continue;
      }
      await prisma.paymentRefund.update({
        where: { id: refund.id },
        data: { status, processedAt: new Date() },
      });
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
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: refundedAmountPaise >= payment.amountPaise ? "REFUNDED" : "PARTIALLY_REFUNDED",
          metadata: {
            ...jsonObject(payment.metadata),
            refundedAmountPaise,
          },
        },
      });
      reconciled++;
    }
    return ok({ inspected: refunds.length, reconciled, skipped });
  }

  if (request.method === "POST" && pathMatches(path, ["cron", "trainer-payouts-draft"])) {
    const cronSecret = process.env.CRON_SECRET?.trim();
    const authHeader = request.headers.get("authorization");
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      throw forbiddenError("Invalid cron authorization.");
    }
    if (!cronSecret && getAppEnv() === "production") {
      throw forbiddenError("CRON_SECRET must be set in production.");
    }

    const month = request.nextUrl.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
    const orgs = await prisma.organization.findMany({
      where: { status: { notIn: ["DELETED", "CANCELLED"] } },
      select: { id: true },
      take: 500,
    });
    let drafted = 0;
    let skipped = 0;
    const failures: Array<{ orgId: string; error: string }> = [];
    for (const org of orgs) {
      try {
        const payouts = await draftPayoutsForMonth(org.id, month);
        drafted += payouts.length;
      } catch (cause) {
        skipped++;
        failures.push({
          orgId: org.id,
          error: cause instanceof Error ? cause.message : "Unknown payout draft error",
        });
      }
    }
    return ok({ month, organizations: orgs.length, drafted, skipped, failures: failures.slice(0, 10) });
  }

  return undefined;
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

  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "membership-plans"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgAnyPermission(ctx, orgId, [
      "MEMBERSHIP_PLAN_MANAGE",
      "PAYMENTS_RECORD_OFFLINE",
      "MEMBERS_VIEW",
    ]);
    const branchId = await assertBranchAccessForContext(ctx, orgId, queryBranchId(request));
    return ok({
      plans: await prisma.membershipPlan.findMany({
        where: {
          orgId,
          ...(branchId ? { OR: [{ branchId }, { branchId: null }] } : {}),
        },
        orderBy: { createdAt: "desc" },
      }),
    });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "membership-plans"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "MEMBERSHIP_PLAN_MANAGE");
    const body = membershipPlanSchema.parse(await readJson(request));
    const branch = await resolveOrgBranch(orgId, queryBranchId(request));
    const plan = await prisma.membershipPlan.create({
      data: clean({
        orgId,
        branchId: branch.id,
        name: body.name,
        description: sanitizeRichText(body.description),
        type: body.type,
        pricePaise: body.pricePaise,
        durationDays: body.durationDays,
        visitLimit: body.visitLimit,
        validityDays: body.validityDays,
        publicVisible: body.publicVisible,
        createdById: userId,
      }),
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "membership_plan.created",
      entityType: "membership_plan",
      entityId: plan.id,
      metadata: { name: plan.name, type: plan.type },
    });
    return ok({ plan });
  }
  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "membership-plans", /.+/])) {
    const orgId = path[1]!;
    const planId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "MEMBERSHIP_PLAN_MANAGE");
    const body = membershipPlanSchema
      .extend({ active: z.boolean().optional() })
      .partial()
      .parse(await readJson(request));
    const existingPlan = await prisma.membershipPlan.findFirst({ where: { id: planId, orgId } });
    if (!existingPlan) {
      throw notFoundError("Membership plan not found");
    }
    const plan = await prisma.membershipPlan.update({
      where: { id: existingPlan.id },
      data: clean({
        name: body.name,
        description: sanitizeRichText(body.description),
        type: body.type,
        pricePaise: body.pricePaise,
        durationDays: body.durationDays,
        visitLimit: body.visitLimit,
        validityDays: body.validityDays,
        publicVisible: body.publicVisible,
        active: body.active,
      }),
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "membership_plan.updated",
      entityType: "membership_plan",
      entityId: plan.id,
      metadata: { name: plan.name, active: plan.active, publicVisible: plan.publicVisible },
    });
    return ok({ plan });
  }
  if (request.method === "DELETE" && pathMatches(path, ["orgs", /.+/, "membership-plans", /.+/])) {
    const orgId = path[1]!;
    const planId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "MEMBERSHIP_PLAN_MANAGE");
    const existingPlan = await prisma.membershipPlan.findFirst({ where: { id: planId, orgId } });
    if (!existingPlan) {
      throw notFoundError("Membership plan not found");
    }
    const usageCount = await prisma.memberSubscription.count({
      where: { orgId, planId: existingPlan.id },
    });
    if (usageCount > 0) {
      throw conflictError("This plan has subscriptions attached. Archive it instead of deleting.");
    }
    await prisma.membershipPlan.delete({ where: { id: existingPlan.id } });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "membership_plan.deleted",
      entityType: "membership_plan",
      entityId: existingPlan.id,
      metadata: { name: existingPlan.name },
    });
    return ok({ deleted: true });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "join-requests"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const orgId = path[1]!;
    await assertRateLimit(
      "joinRequestByActorOrg",
      `${orgId}:${userId}`,
      "Too many join requests for this gym today.",
    );
    const body = joinRequestSchema.parse(await readJson(request));
    const organization = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!organization || organization.visibility === "HIDDEN") {
      throw notFoundError("Gym not found");
    }
    if (organization.joinMode === "OPEN_JOIN") {
      throw conflictError("This gym supports direct join. Choose a plan and continue to payment.");
    }
    if (organization.joinMode === "INVITE_ONLY" && !body.referralCode) {
      throw forbiddenError("Invite-only gyms require a valid referral or invite code.");
    }
    if (body.planId) {
      const plan = await prisma.membershipPlan.findFirst({ where: { id: body.planId, orgId } });
      if (!plan) {
        throw notFoundError("Membership plan not found");
      }
    }
    const defaultBranch = await resolveOrgBranch(orgId);
    await resolveValidatedReferral({
      orgId,
      userId,
      ...(body.referralCode ? { referralCode: body.referralCode } : {}),
    });
    const [existingPending, existingSubscription] = await Promise.all([
      prisma.membershipJoinRequest.findFirst({
        where: { orgId, userId, status: { in: ["pending", "approved"] } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.memberSubscription.findFirst({
        where: { orgId, memberUserId: userId, status: { in: ["PENDING_PAYMENT", "ACTIVE"] } },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    if (existingPending) {
      throw conflictError("You already have a join request in progress for this gym.");
    }
    if (existingSubscription) {
      throw conflictError("You already have a membership in progress for this gym.");
    }
    const requestRow = await prisma.membershipJoinRequest.create({
      data: clean({
        orgId,
        branchId: defaultBranch.id,
        userId,
        planId: body.planId,
        referralCode: body.referralCode,
        message: body.message,
      }),
    });
    return ok({ joinRequest: requestRow });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "join-requests"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "MEMBERS_MANAGE");
    return ok({
      joinRequests: await prisma.membershipJoinRequest.findMany({
        where: { orgId },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    });
  }
  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "join-requests", "approve-batch"])
  ) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "MEMBERS_MANAGE");
    const body = joinRequestBatchApproveSchema.parse(await readJson(request));
    const joinRequestIds = Array.from(new Set(body.joinRequestIds));
    const existingJoinRequests = await prisma.membershipJoinRequest.findMany({
      where: { id: { in: joinRequestIds }, orgId, status: "pending" },
    });
    if (!existingJoinRequests.length) {
      throw notFoundError("No pending join requests found");
    }
    await assertSaasMemberCapacityForUsers(
      orgId,
      existingJoinRequests.map((joinRequest) => joinRequest.userId),
    );
    await prisma.membershipJoinRequest.updateMany({
      where: { id: { in: existingJoinRequests.map((joinRequest) => joinRequest.id) }, orgId },
      data: { status: "approved", reviewedById: userId, reviewedAt: new Date() },
    });
    const joinRequests = await prisma.membershipJoinRequest.findMany({
      where: { id: { in: existingJoinRequests.map((joinRequest) => joinRequest.id) }, orgId },
    });
    await createDirectNotification({
      orgId,
      createdById: userId,
      type: "TRANSACTIONAL",
      title: "Membership request approved",
      body: "You can now continue to payment and activate your membership in Zook.",
      audience: "selected_member",
      userIds: joinRequests.map((joinRequest) => joinRequest.userId),
      metadata: { joinRequestIds: joinRequests.map((joinRequest) => joinRequest.id), orgId },
    });
    await Promise.all(
      joinRequests.map((joinRequest) =>
        writeAuditLog({
          request,
          orgId,
          actorUserId: userId,
          action: "membership_join_request.approved",
          entityType: "membership_join_request",
          entityId: joinRequest.id,
        }),
      ),
    );
    return ok({ joinRequests });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "payments", "recent"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "PAYMENTS_RECORD_OFFLINE");
    const branchId = await assertBranchAccessForContext(ctx, orgId, queryBranchId(request));
    return ok({ payments: await getOrganizationRecentPayments(orgId, clean({ branchId })) });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "payments"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgAnyPermission(ctx, orgId, ["PAYMENTS_VIEW", "PAYMENTS_RECORD_OFFLINE"]);
    return ok(await listOrganizationPaymentsPage(orgId, request));
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "invoices"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgAnyPermission(ctx, orgId, ["ORG_MANAGE_BILLING", "PAYMENTS_VIEW"]);
    const invoices = await prisma.invoice.findMany({
      where: { orgId },
      orderBy: [{ issueDate: "desc" }, { issuedAt: "desc" }],
      take: 100,
    });
    const users = invoices.some((invoice) => invoice.userId)
      ? await prisma.user.findMany({
          where: {
            id: { in: invoices.map((invoice) => invoice.userId).filter(Boolean) as string[] },
          },
        })
      : [];
    const usersById = new Map(users.map((user) => [user.id, user]));
    return ok({
      invoices: invoices.map((invoice) => ({
        ...invoice,
        user: invoice.userId ? (usersById.get(invoice.userId) ?? null) : null,
        invoiceUrl: `/api/orgs/${orgId}/invoices/${invoice.id}/pdf`,
      })),
    });
  }
  if (
    (request.method === "POST" || request.method === "GET") &&
    pathMatches(path, ["orgs", /.+/, "invoices", /.+/])
  ) {
    const orgId = path[1]!;
    const paymentId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgAnyPermission(ctx, orgId, ["ORG_MANAGE_BILLING", "PAYMENTS_VIEW"]);
    const invoice = await ensurePaymentInvoice({ orgId, paymentId });
    return ok({
      invoice: invoice.invoice,
      invoiceUrl: `/api/orgs/${orgId}/invoices/${invoice.invoice.id}/pdf`,
      signedUrl: await invoiceSignedUrl(invoice.invoice),
    });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "invoices", /.+/, "pdf"])) {
    const orgId = path[1]!;
    const invoiceId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgAnyPermission(ctx, orgId, ["ORG_MANAGE_BILLING", "PAYMENTS_VIEW"]);
    const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, orgId } });
    if (!invoice) throw notFoundError("Invoice not found.");
    const [org, user] = await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId } }),
      invoice.userId ? prisma.user.findUnique({ where: { id: invoice.userId } }) : null,
    ]);
    return invoicePdfResponse({ invoice, org, user });
  }
  if (
    request.method === "GET" &&
    pathMatches(path, ["orgs", /.+/, "saas-subscription", "invoices", /.+/])
  ) {
    const orgId = path[1]!;
    const invoiceId = path[4]!.replace(/\.pdf$/i, "");
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "ORG_MANAGE_BILLING");
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, orgId, kind: "SAAS" },
    });
    if (!invoice) throw notFoundError("SaaS invoice not found.");
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    return invoicePdfResponse({ invoice, org });
  }
  if (
    (request.method === "POST" || request.method === "GET") &&
    pathMatches(path, ["orgs", /.+/, "payments", /.+/, "receipt"])
  ) {
    const orgId = path[1]!;
    const paymentId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgAnyPermission(ctx, orgId, ["PAYMENTS_VIEW", "PAYMENTS_RECORD_OFFLINE"]);
    const receipt = await ensurePaymentReceipt({ orgId, paymentId });
    if (request.method === "GET" && request.nextUrl.searchParams.get("format") === "html") {
      return new NextResponse(receiptHtml(receipt), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    return ok({
      receiptNumber: receipt.receiptNumber,
      payment: receipt.payment,
      receiptUrl: `/api/orgs/${orgId}/payments/${paymentId}/receipt?format=html`,
    });
  }
  if (
    (request.method === "POST" || request.method === "GET") &&
    pathMatches(path, ["orgs", /.+/, "payments", /.+/, "invoice"])
  ) {
    const orgId = path[1]!;
    const paymentId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgAnyPermission(ctx, orgId, ["ORG_MANAGE_BILLING", "PAYMENTS_VIEW"]);
    const invoice = await ensurePaymentInvoice({ orgId, paymentId });
    if (request.method === "GET" && request.nextUrl.searchParams.get("format") === "html") {
      return new NextResponse(invoiceHtml(invoice), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    return ok({
      invoice: invoice.invoice,
      invoiceUrl: `/api/orgs/${orgId}/invoices/${invoice.invoice.id}/pdf`,
      signedUrl: await invoiceSignedUrl(invoice.invoice),
    });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "payments", /.+/, "refund"])) {
    const orgId = path[1]!;
    const paymentId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    assertNotImpersonating(ctx, "Refund approval");
    const userId = requireOrgPermission(ctx, orgId, "PAYMENTS_REFUND");
    const body = paymentRefundSchema.parse(await readJson(request).catch(() => ({})));
    const payment = await prisma.payment.findFirst({ where: { id: paymentId, orgId } });
    if (!payment) {
      throw notFoundError("Payment not found");
    }
    const result = await refundPaymentForActor({
      request,
      actorUserId: userId,
      paymentId: payment.id,
      reason: body.reason,
      ...(body.amountPaise ? { amountPaise: body.amountPaise } : {}),
    });
    return ok(result);
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "subscription-reminders"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgAnyPermission(ctx, orgId, [
      "ORG_MANAGE_BILLING",
      "PAYMENTS_VIEW",
      "PAYMENTS_RECORD_OFFLINE",
    ]);
    const status = request.nextUrl.searchParams.get("status")?.trim().toUpperCase();
    const reminders = await prisma.subscriptionReminder.findMany({
      where: clean({
        orgId,
        status:
          status && ["PENDING", "SENT", "RESOLVED", "CANCELLED"].includes(status)
            ? status
            : undefined,
      }),
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: 100,
    });
    return ok({ reminders });
  }
  if (
    request.method === "PATCH" &&
    pathMatches(path, ["orgs", /.+/, "subscription-reminders", /.+/])
  ) {
    const orgId = path[1]!;
    const reminderId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_BILLING");
    const body = subscriptionReminderResolveSchema.parse(await readJson(request).catch(() => ({})));
    const existing = await prisma.subscriptionReminder.findFirst({
      where: { id: reminderId, orgId },
    });
    if (!existing) {
      throw notFoundError("Subscription reminder not found");
    }
    const reminder = await prisma.subscriptionReminder.update({
      where: { id: existing.id },
      data: {
        status: body.status,
        resolvedAt: body.status === "RESOLVED" ? new Date() : existing.resolvedAt,
      },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "subscription_reminder.updated",
      entityType: "subscription_reminder",
      entityId: reminder.id,
      metadata: { status: reminder.status },
    });
    return ok({ reminder });
  }
  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "join-requests", /.+/, "approve"])
  ) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "MEMBERS_MANAGE");
    const existingJoinRequest = await prisma.membershipJoinRequest.findFirst({
      where: { id: path[3]!, orgId },
    });
    if (!existingJoinRequest) {
      throw notFoundError("Join request not found");
    }
    await assertSaasMemberCapacity(orgId, existingJoinRequest.userId);
    const joinRequest = await prisma.membershipJoinRequest.update({
      where: { id: existingJoinRequest.id },
      data: { status: "approved", reviewedById: userId, reviewedAt: new Date() },
    });
    await createDirectNotification({
      orgId,
      createdById: userId,
      type: "TRANSACTIONAL",
      title: "Membership request approved",
      body: "You can now continue to payment and activate your membership in Zook.",
      audience: "selected_member",
      userIds: [joinRequest.userId],
      metadata: { joinRequestId: joinRequest.id, orgId },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "membership_join_request.approved",
      entityType: "membership_join_request",
      entityId: joinRequest.id,
    });
    return ok({ joinRequest });
  }
  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "join-requests", /.+/, "reject"])
  ) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "MEMBERS_MANAGE");
    const existingJoinRequest = await prisma.membershipJoinRequest.findFirst({
      where: { id: path[3]!, orgId },
    });
    if (!existingJoinRequest) {
      throw notFoundError("Join request not found");
    }
    const joinRequest = await prisma.membershipJoinRequest.update({
      where: { id: existingJoinRequest.id },
      data: { status: "rejected", reviewedById: userId, reviewedAt: new Date() },
    });
    await createDirectNotification({
      orgId,
      createdById: userId,
      type: "TRANSACTIONAL",
      title: "Membership request rejected",
      body: "Your join request was not approved. Contact the gym for the next step.",
      audience: "selected_member",
      userIds: [joinRequest.userId],
      metadata: { joinRequestId: joinRequest.id, orgId },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "membership_join_request.rejected",
      entityType: "membership_join_request",
      entityId: joinRequest.id,
    });
    return ok({ joinRequest });
  }
  if (request.method === "POST" && pathMatches(path, ["payments", "checkout"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    await assertRateLimit(
      "paymentSessionByActor",
      userId ?? getClientIp(request),
      "Too many payment sessions requested.",
    );
    const body = checkoutSchema.parse(await readJson(request));
    getPaymentProviderOrThrow();
    if (body.purpose === "MEMBERSHIP" || body.purpose === "SHOP_ORDER") {
      throw validationError("Use the membership or shop checkout route for this purpose.");
    }
    if (body.metadata?.subscriptionId || body.metadata?.shopOrderId) {
      throw validationError(
        "Generic checkout cannot directly reference membership or shop records.",
      );
    }
    if (body.userId && body.userId !== userId && !ctx.isPlatformAdmin) {
      throw forbiddenError("You cannot start this payment for another person.");
    }

    const customer = await prisma.user.findUnique({ where: { id: body.userId ?? userId } });
    const session = await prisma.paymentSession.create({
      data: clean({
        orgId: body.orgId,
        userId: body.userId ?? userId,
        purpose: body.purpose,
        amountPaise: body.amountPaise,
        currency: body.currency,
        status: "CREATED",
        checkoutUrl: "",
        provider: getPaymentProviderDiagnostics().selectedProvider,
        metadata: (body.metadata ?? {}) as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      }),
    });
    let started;
    try {
      started = await startPaymentSessionCheckout({
        session,
        customer: clean({
          name: customer?.name,
          email: customer?.email,
          phone: customer?.phone ?? undefined,
        }),
      });
    } catch (error) {
      await prisma.paymentSession.update({
        where: { id: session.id },
        data: { status: "FAILED", completedAt: new Date() },
      });
      throw error;
    }
    return ok({
      session: started.session,
      checkoutUrl: started.checkoutUrl,
      checkoutData: started.checkout.checkoutData ?? null,
      provider: started.checkout.providerSessionId ? started.session.provider : session.provider,
    });
  }
  if (request.method === "GET" && pathMatches(path, ["payments", "session", /.+/])) {
    const session = await prisma.paymentSession.findUnique({ where: { id: path[2]! } });
    if (!session) {
      return fail("NOT_FOUND", "Payment session not found", 404);
    }
    const ctx = await getRequestContext(request, session.orgId ? { orgId: session.orgId } : {});
    const userId = requireAuth(ctx);
    await assertRateLimit(
      "paymentSessionByActor",
      `${userId}:${path[2]!}`,
      "Too many payment session checks. Please wait before trying again.",
    );
    const canReadOwnSession = Boolean(session.userId && session.userId === userId);
    const canReadOrgSession = Boolean(
      session.orgId &&
      ctx.orgId === session.orgId &&
      ctx.permissions.includes("PAYMENTS_VIEW") &&
      ctx.orgStatus !== "SUSPENDED" &&
      ctx.orgStatus !== "CANCELLED",
    );
    if (!canReadOwnSession && !canReadOrgSession) {
      throw forbiddenError("No payment session access.");
    }
    return ok({ session });
  }
  if (request.method === "POST" && pathMatches(path, ["payments", "webhooks", "razorpay"])) {
    const provider = getPaymentProviderOrThrow();
    if (provider.providerName !== "razorpay") {
      throw validationError(
        "Razorpay webhooks are unavailable while PAYMENT_PROVIDER is not set to razorpay.",
      );
    }

    const startedAt = Date.now();
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") ?? undefined;
    const headers = Object.fromEntries(request.headers.entries());
    const rawPayloadHash = createHash("sha256").update(rawBody).digest("hex");
    const verificationInput = {
      rawBody,
      headers,
      ...(signature ? { signature } : {}),
    };
    const verification = await provider.verifyWebhook(verificationInput);
    const parsed = verification.valid ? await provider.parseWebhookEvent(verificationInput) : null;
    const providerEventId =
      parsed?.providerEventId ??
      verification.providerEventId ??
      `invalid:${rawPayloadHash.slice(0, 24)}`;

    let event;
    try {
      event = await prisma.paymentEvent.create({
        data: clean({
          provider: "razorpay",
          providerEventId,
          eventType: parsed?.eventType ?? "payment.unknown",
          eventVersion: parsed?.eventVersion,
          status: verification.valid ? "VERIFIED" : "FAILED",
          payload: (parsed?.rawPayload ?? responseBodyForStorage(rawBody)) as Prisma.InputJsonValue,
          headers: headers as Prisma.InputJsonValue,
          rawPayloadHash,
          sourceIpAddress: getClientIp(request),
          signature,
          signatureVerified: verification.valid,
          signatureVerifiedAt: verification.valid ? new Date() : undefined,
          attemptCount: 1,
          lastAttemptAt: new Date(),
          processingError: verification.valid ? null : verification.reason,
        }),
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
        throw error;
      }
      const existing = await prisma.paymentEvent.update({
        where: {
          provider_providerEventId: {
            provider: "razorpay",
            providerEventId,
          },
        },
        data: {
          lastAttemptAt: new Date(),
          attemptCount: { increment: 1 },
        },
      });
      const replayAttempt = await prisma.paymentWebhookAttempt.create({
        data: {
          paymentEventId: existing.id,
          attemptNo: existing.attemptCount,
          processor: "api.payments.webhooks.razorpay",
          status: "SUCCEEDED",
          httpStatusCode: 200,
          durationMs: Date.now() - startedAt,
          completedAt: new Date(),
          result: { duplicate: true } as Prisma.InputJsonValue,
        },
      });
      return ok({
        received: true,
        duplicate: true,
        providerEventId,
        attemptNo: replayAttempt.attemptNo,
      });
    }

    const attempt = await prisma.paymentWebhookAttempt.create({
      data: {
        paymentEventId: event.id,
        attemptNo: event.attemptCount,
        processor: "api.payments.webhooks.razorpay",
        status: "PENDING",
      },
    });

    if (!verification.valid) {
      await prisma.paymentWebhookAttempt.update({
        where: {
          paymentEventId_attemptNo: { paymentEventId: event.id, attemptNo: attempt.attemptNo },
        },
        data: {
          status: "FAILED",
          httpStatusCode: 401,
          errorCode: "invalid_signature",
          errorMessage: verification.reason ?? "Signature verification failed.",
          durationMs: Date.now() - startedAt,
          completedAt: new Date(),
        },
      });
      return fail(
        "invalid_signature",
        verification.reason ?? "Signature verification failed.",
        401,
      );
    }

    return processVerifiedPaymentWebhookEvent({
      event,
      attempt,
      parsed,
      providerEventId,
      startedAt,
    });
  }
  if (request.method === "POST" && pathMatches(path, ["payments", "mock", /.+/, "complete"])) {
    if (!isMockPaymentCompletionAllowed()) {
      throw forbiddenError("Test payment confirmation is not available here.");
    }
    const sessionId = path[2]!;
    const body = completeMockPaymentSchema.parse(await readJson(request));
    const status = body.status ?? "SUCCEEDED";
    const currentSession = await prisma.paymentSession.findUnique({ where: { id: sessionId } });
    if (!currentSession) {
      throw notFoundError("Payment session not found");
    }
    if (
      status === "SUCCEEDED" &&
      currentSession.status !== "SUCCEEDED" &&
      currentSession.expiresAt.getTime() < Date.now()
    ) {
      throw conflictError("Payment session expired. Start payment again.");
    }
    const ctx = await getRequestContext(
      request,
      currentSession.orgId ? { orgId: currentSession.orgId } : {},
    );
    assertCanCompleteMockPayment(ctx, currentSession);
    const providerEventId = `mock:${sessionId}:${status}`;
    const existingEvent = await prisma.paymentEvent.findUnique({
      where: {
        provider_providerEventId: {
          provider: "mock",
          providerEventId,
        },
      },
    });
    if (existingEvent?.processedAt) {
      const existingPayment = await prisma.payment.findFirst({
        where: { sessionId: currentSession.id },
        orderBy: { createdAt: "desc" },
      });
      return ok({ session: currentSession, payment: existingPayment, duplicateEvent: true });
    }
    if (!existingEvent) {
      await prisma.paymentEvent.create({
        data: {
          orgId: currentSession.orgId,
          userId: currentSession.userId,
          sessionId: currentSession.id,
          paymentId: null,
          status: "VERIFIED",
          provider: "mock",
          providerEventId,
          eventType: `payment.${status.toLowerCase()}`,
          payload: body as Prisma.InputJsonValue,
          signatureVerified: true,
        },
      });
    }
    const processed = await applyPaymentSessionStatus({
      sessionId,
      nextStatus: status,
      provider: "mock",
      providerRef: `mock_${sessionId}`,
      paymentMode: "MOCK_ONLINE",
      createNotification: createDirectNotification,
      ensureMembership: ensureOrganizationMembership,
    });
    await prisma.paymentEvent.update({
      where: {
        provider_providerEventId: {
          provider: "mock",
          providerEventId,
        },
      },
      data: clean({
        sessionId: processed.session.id,
        paymentId: processed.payment?.id,
        status: "PROCESSED",
        processedAt: new Date(),
        processingError: null,
      }),
    });
    return ok({ session: processed.session, payment: processed.payment });
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
        ensureMembership: ensureOrganizationMembership,
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
  if (request.method === "GET" && pathMatches(path, ["me", "membership", "active"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    return ok({ membership: await getActiveMembershipData(userId, ctx.orgId) });
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
        ensureMembership: ensureOrganizationMembership,
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
      "paymentSessionByActor",
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
  if (request.method === "GET" && pathMatches(path, ["me", "memberships"])) {
    const userId = requireAuth(await getRequestContext(request));
    const subscriptions = await prisma.memberSubscription.findMany({
      where: { memberUserId: userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const [plans, organizations, payments, mandates] = await Promise.all([
      prisma.membershipPlan.findMany({
        where: { id: { in: subscriptions.map((subscription) => subscription.planId) } },
      }),
      prisma.organization.findMany({
        where: { id: { in: subscriptions.map((subscription) => subscription.orgId) } },
      }),
      prisma.payment.findMany({
        where: { userId },
        orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
        take: 25,
      }),
      prisma.paymentMandate.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);
    return ok({
      subscriptions: subscriptions.map((subscription) => ({
        ...subscription,
        plan: plans.find((plan) => plan.id === subscription.planId) ?? null,
        organization:
          organizations.find((organization) => organization.id === subscription.orgId) ?? null,
        autopay:
          mandates.find(
            (mandate) =>
              mandate.sourceSubscriptionId === subscription.id ||
              mandate.latestSubscriptionId === subscription.id,
          ) ?? null,
      })),
      payments,
      autopayMandates: mandates,
    });
  }
  return undefined;
}

export async function handleCouponsReferrals(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "offers"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "COUPONS_MANAGE");
    return ok({
      offers: await prisma.offer.findMany({
        where: { orgId },
        orderBy: [{ active: "desc" }, { startsAt: "desc" }],
      }),
    });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "offers"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "COUPONS_MANAGE");
    const body = offerSchema.parse(await readJson(request));
    const startsAt = new Date(body.startsAt);
    const endsAt = new Date(body.endsAt);
    if (endsAt <= startsAt) {
      throw validationError("Offer end date must be after the start date.");
    }
    if (body.discountType === "PERCENTAGE" && body.discountValue > 10_000) {
      throw validationError("Percentage offers cannot exceed 100%.");
    }
    if (body.applicablePlanIds?.length) {
      const planCount = await prisma.membershipPlan.count({
        where: { orgId, id: { in: body.applicablePlanIds } },
      });
      if (planCount !== body.applicablePlanIds.length) {
        throw notFoundError("One or more offer plans were not found.");
      }
    }
    const offer = await prisma.offer.create({
      data: clean({
        orgId,
        name: body.name,
        description: body.description,
        discountType: body.discountType,
        discountValue: body.discountValue,
        applicablePlans: body.applicablePlanIds?.length ? body.applicablePlanIds : undefined,
        startsAt,
        endsAt,
        maxRedemptions: body.maxRedemptions,
        active: body.active,
        stackable: body.stackable,
        createdById: userId,
      }),
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "offer.created",
      entityType: "offer",
      entityId: offer.id,
      metadata: { name: offer.name, active: offer.active },
    });
    return ok({ offer });
  }
  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "offers", /.+/])) {
    const orgId = path[1]!;
    const offerId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "COUPONS_MANAGE");
    const body = offerSchema.partial().parse(await readJson(request));
    const existingOffer = await prisma.offer.findFirst({ where: { id: offerId, orgId } });
    if (!existingOffer) {
      throw notFoundError("Offer not found");
    }
    const startsAt = body.startsAt ? new Date(body.startsAt) : existingOffer.startsAt;
    const endsAt = body.endsAt ? new Date(body.endsAt) : existingOffer.endsAt;
    if (endsAt <= startsAt) {
      throw validationError("Offer end date must be after the start date.");
    }
    if (body.discountType === "PERCENTAGE" && body.discountValue && body.discountValue > 10_000) {
      throw validationError("Percentage offers cannot exceed 100%.");
    }
    if (body.applicablePlanIds?.length) {
      const planCount = await prisma.membershipPlan.count({
        where: { orgId, id: { in: body.applicablePlanIds } },
      });
      if (planCount !== body.applicablePlanIds.length) {
        throw notFoundError("One or more offer plans were not found.");
      }
    }
    const offer = await prisma.offer.update({
      where: { id: existingOffer.id },
      data: clean({
        name: body.name,
        description: body.description,
        discountType: body.discountType,
        discountValue: body.discountValue,
        applicablePlans: body.applicablePlanIds ? body.applicablePlanIds : undefined,
        startsAt: body.startsAt ? startsAt : undefined,
        endsAt: body.endsAt ? endsAt : undefined,
        maxRedemptions: body.maxRedemptions,
        active: body.active,
        stackable: body.stackable,
      }),
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "offer.updated",
      entityType: "offer",
      entityId: offer.id,
      metadata: { name: offer.name, active: offer.active },
    });
    return ok({ offer });
  }
  if (request.method === "DELETE" && pathMatches(path, ["orgs", /.+/, "offers", /.+/])) {
    const orgId = path[1]!;
    const offerId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "COUPONS_MANAGE");
    const existingOffer = await prisma.offer.findFirst({ where: { id: offerId, orgId } });
    if (!existingOffer) {
      throw notFoundError("Offer not found");
    }
    const offer = await prisma.offer.update({
      where: { id: existingOffer.id },
      data: { active: false },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "offer.deactivated",
      entityType: "offer",
      entityId: offer.id,
      metadata: { name: offer.name },
    });
    return ok({ offer });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "referral-policy"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "REFERRALS_MANAGE");
    const policy = await prisma.referralPolicy.upsert({
      where: { orgId },
      update: {},
      create: { orgId },
    });
    return ok({ policy });
  }
  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "referral-policy"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "REFERRALS_MANAGE");
    const body = referralPolicySchema.partial().parse(await readJson(request));
    const policyDefaults = {
      enabled: true,
      referrerRewardType: "DAYS" as const,
      referrerRewardValue: 7,
      referredDiscountType: "PERCENTAGE" as const,
      referredDiscountValue: 1000,
      maxDiscountCapBps: 3000,
      maxReferralsPerMonth: 10,
      referralCodeExpiryDays: 90,
      trainerReferralEnabled: true,
      staffReferralEnabled: false,
    };
    const policy = await prisma.referralPolicy.upsert({
      where: { orgId },
      update: clean({ ...body, updatedById: userId }),
      create: {
        orgId,
        enabled: body.enabled ?? policyDefaults.enabled,
        referrerRewardType: body.referrerRewardType ?? policyDefaults.referrerRewardType,
        referrerRewardValue: body.referrerRewardValue ?? policyDefaults.referrerRewardValue,
        referredDiscountType: body.referredDiscountType ?? policyDefaults.referredDiscountType,
        referredDiscountValue: body.referredDiscountValue ?? policyDefaults.referredDiscountValue,
        maxDiscountCapBps: body.maxDiscountCapBps ?? policyDefaults.maxDiscountCapBps,
        maxReferralsPerMonth: body.maxReferralsPerMonth ?? policyDefaults.maxReferralsPerMonth,
        referralCodeExpiryDays:
          body.referralCodeExpiryDays ?? policyDefaults.referralCodeExpiryDays,
        trainerReferralEnabled:
          body.trainerReferralEnabled ?? policyDefaults.trainerReferralEnabled,
        staffReferralEnabled: body.staffReferralEnabled ?? policyDefaults.staffReferralEnabled,
        updatedById: userId,
      },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "referral_policy.updated",
      entityType: "referral_policy",
      entityId: policy.id,
      metadata: {
        enabled: policy.enabled,
        referrerRewardType: policy.referrerRewardType,
        referredDiscountType: policy.referredDiscountType,
      },
    });
    return ok({ policy });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "coupons", "validate"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const body = publicCouponValidateSchema.parse(await readJson(request));
    const plan = await prisma.membershipPlan.findFirst({
      where: { id: body.planId, orgId, active: true, publicVisible: true },
      select: { id: true, pricePaise: true },
    });
    if (!plan) {
      throw notFoundError("Plan not found");
    }
    try {
      const preview = await getPublicCouponPreview({
        orgId,
        planId: plan.id,
        couponCode: body.code,
        amountPaise: plan.pricePaise,
        ...(ctx.userId ? { userId: ctx.userId } : {}),
      });
      if (!preview) {
        return fail("coupon_invalid", "Coupon code is not valid for this gym.", 404);
      }
      return ok({
        coupon: { code: preview.code },
        discountPaise: preview.discountPaise,
        finalAmountPaise: preview.finalAmountPaise,
      });
    } catch (error) {
      return fail(
        "coupon_invalid",
        error instanceof Error ? error.message : "Coupon code is not valid for this gym.",
        400,
      );
    }
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "coupons"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "COUPONS_MANAGE");
    return ok({ coupons: await prisma.coupon.findMany({ where: { orgId } }) });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "coupons"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "COUPONS_MANAGE");
    const body = couponSchema.parse(await readJson(request));
    const coupon = await prisma.coupon.create({
      data: clean({
        orgId,
        code: body.code,
        type: body.type,
        valuePaise: body.valuePaise,
        valuePercentBps: body.valuePercentBps,
        maxRedemptions: body.maxRedemptions,
        perUserLimit: body.perUserLimit,
        applicablePlanId: body.applicablePlanId,
        active: body.active,
        validFrom: body.validFrom ? new Date(body.validFrom) : undefined,
        validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
        createdById: userId,
      }),
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "coupon.created",
      entityType: "coupon",
      entityId: coupon.id,
      metadata: { code: coupon.code },
    });
    return ok({ coupon });
  }
  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "coupons", /.+/])) {
    const orgId = path[1]!;
    const couponId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "COUPONS_MANAGE");
    const body = couponSchema.partial().parse(await readJson(request));
    const existingCoupon = await prisma.coupon.findFirst({ where: { id: couponId, orgId } });
    if (!existingCoupon) {
      throw notFoundError("Coupon not found");
    }
    const coupon = await prisma.coupon.update({
      where: { id: existingCoupon.id },
      data: clean({
        code: body.code,
        type: body.type,
        valuePaise: body.valuePaise,
        valuePercentBps: body.valuePercentBps,
        maxRedemptions: body.maxRedemptions,
        perUserLimit: body.perUserLimit,
        applicablePlanId: body.applicablePlanId,
        active: body.active,
        validFrom: body.validFrom ? new Date(body.validFrom) : undefined,
        validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
      }),
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "coupon.updated",
      entityType: "coupon",
      entityId: coupon.id,
      metadata: { code: coupon.code, active: coupon.active },
    });
    return ok({ coupon });
  }
  if (request.method === "DELETE" && pathMatches(path, ["orgs", /.+/, "coupons", /.+/])) {
    const orgId = path[1]!;
    const couponId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "COUPONS_MANAGE");
    const existingCoupon = await prisma.coupon.findFirst({ where: { id: couponId, orgId } });
    if (!existingCoupon) {
      throw notFoundError("Coupon not found");
    }
    const coupon = await prisma.coupon.update({
      where: { id: existingCoupon.id },
      data: { active: false },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "coupon.deactivated",
      entityType: "coupon",
      entityId: coupon.id,
      metadata: { code: coupon.code },
    });
    return ok({ coupon });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "referrals"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "REFERRALS_MANAGE");
    const referrals = await prisma.referralCode.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const [users, coupons] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: referrals.map((referral) => referral.referrerUserId) } },
      }),
      prisma.coupon.findMany({
        where: {
          id: { in: referrals.map((referral) => referral.couponId).filter(Boolean) as string[] },
        },
      }),
    ]);
    return ok({ referrals, users, coupons });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "referral-analytics"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "REFERRALS_MANAGE");
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [codes, redemptions, rewards, recentRedemptions, openFlags] = await Promise.all([
      prisma.referralCode.findMany({
        where: { orgId },
        orderBy: { redemptionCount: "desc" },
        take: 25,
      }),
      prisma.referralRedemption.findMany({ where: { orgId, createdAt: { gte: startOfMonth } } }),
      prisma.referralReward.findMany({ where: { orgId, createdAt: { gte: startOfMonth } } }),
      prisma.referralRedemption.findMany({
        where: { orgId, createdAt: { gte: last24h } },
        select: { referralCodeId: true, referredUserId: true, metadata: true },
      }),
      prisma.organizationAbuseFlag.findMany({
        where: { orgId, type: "referral_velocity", status: "open" },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);
    const topReferrerIds = [...new Set(codes.slice(0, 5).map((code) => code.referrerUserId))];
    const users = await prisma.user.findMany({ where: { id: { in: topReferrerIds } } });
    const recentByCode = new Map<string, typeof recentRedemptions>();
    for (const redemption of recentRedemptions) {
      recentByCode.set(redemption.referralCodeId, [
        ...(recentByCode.get(redemption.referralCodeId) ?? []),
        redemption,
      ]);
    }
    return ok({
      summary: {
        activeCodes: codes.filter((code) => code.status === "active").length,
        redemptionsThisMonth: redemptions.length,
        rewardCreditsThisMonth: rewards.reduce((total, reward) => total + reward.rewardValue, 0),
        appliedRewardsThisMonth: rewards.filter((reward) => reward.status === "applied").length,
        openAbuseFlags: openFlags.length,
      },
      topReferrers: codes.slice(0, 5).map((code) => ({
        code,
        user: users.find((user) => user.id === code.referrerUserId) ?? null,
        abuseSignals: {
          redemptions24h: recentByCode.get(code.id)?.length ?? 0,
          uniqueInviteePhones: new Set(
            (recentByCode.get(code.id) ?? [])
              .map((redemption) =>
                typeof redemption.metadata === "object" &&
                redemption.metadata &&
                "phone" in redemption.metadata
                  ? String(redemption.metadata.phone)
                  : "",
              )
              .filter(Boolean),
          ).size,
          suspiciousClustering: (recentByCode.get(code.id)?.length ?? 0) > 5,
        },
      })),
      pendingRewards: rewards
        .filter((reward) => reward.status === "pending")
        .slice(0, 10)
        .map((reward) => ({
          id: reward.id,
          referrerUserId: reward.referrerUserId,
          referralCodeId: reward.referralCodeId,
          rewardType: reward.rewardType,
          rewardValue: reward.rewardValue,
          status: reward.status,
          createdAt: reward.createdAt,
        })),
      openFlags,
    });
  }
  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "referral-rewards", /.+/, "mark-paid"])
  ) {
    const orgId = path[1]!;
    const rewardId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "REFERRALS_MANAGE");
    const reward = await prisma.referralReward.findFirst({ where: { id: rewardId, orgId } });
    if (!reward) {
      throw notFoundError("Referral reward not found");
    }
    const updated = await prisma.referralReward.update({
      where: { id: reward.id },
      data: { status: "applied", appliedAt: new Date() },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "referral_reward.marked_paid",
      entityType: "referral_reward",
      entityId: reward.id,
      metadata: { referrerUserId: reward.referrerUserId, rewardType: reward.rewardType },
    });
    return ok({ reward: updated });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "referrals", "redeem"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireAuth(ctx);
    await assertRateLimit(
      "referralRedeemByActor",
      `${orgId}:${userId}`,
      "Too many referral redemption attempts from this account.",
    );
    const body = referralRedeemSchema.parse(await readJson(request));
    const { referral, redemption, alreadyRedeemed } = await redeemReferralCodeForUser({
      orgId,
      userId,
      code: body.code,
      ctx,
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: alreadyRedeemed ? "referral.redeem_replayed" : "referral.redeemed",
      entityType: "referral_redemption",
      entityId: redemption.id,
      metadata: { code: referral.code, referralCodeId: referral.id },
    });
    if (!alreadyRedeemed) {
      await flagReferralAbuseIfNeeded({
        orgId,
        referralCodeId: referral.id,
        referredUserId: userId,
      });
    }
    return ok({ referral, redemption, alreadyRedeemed });
  }
  if (
    request.method === "POST" &&
    (pathMatches(path, ["orgs", /.+/, "referrals"]) ||
      pathMatches(path, ["orgs", /.+/, "referral-codes"]))
  ) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireAuth(ctx);
    if (ctx.orgId !== orgId || !ctx.roles.length) {
      throw forbiddenError("No organization access");
    }
    const canManage = ctx.permissions.includes("REFERRALS_MANAGE");
    const body = referralCodeManageSchema.parse(await readJson(request).catch(() => ({})));
    if ((body.referrerUserId || body.createdByRole || body.couponId) && !canManage) {
      throw forbiddenError("Referral management permission required.");
    }
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { username: true },
    });
    if (!org) {
      return fail("NOT_FOUND", "Gym not found", 404);
    }
    const policy = await prisma.referralPolicy.upsert({
      where: { orgId },
      update: {},
      create: { orgId },
    });
    if (!policy.enabled) {
      throw validationError("Referral program is not active for this gym.");
    }
    const referrerUserId = canManage && body.referrerUserId ? body.referrerUserId : userId;
    const createdByRole = (body.createdByRole ?? ctx.roles[0] ?? "MEMBER") as OrgRole;
    if (createdByRole === "TRAINER" && !policy.trainerReferralEnabled) {
      throw validationError("Trainer referrals are not enabled.");
    }
    if (
      (createdByRole === "ADMIN" || createdByRole === "RECEPTIONIST") &&
      !policy.staffReferralEnabled
    ) {
      throw validationError("Staff referrals are not enabled.");
    }
    if (body.couponId) {
      const coupon = await prisma.coupon.findFirst({ where: { id: body.couponId, orgId } });
      if (!coupon) {
        throw notFoundError("Coupon not found");
      }
    }
    const code = body.code ?? (await generateUniqueReferralCode(referrerUserId));
    const referral = await prisma.referralCode.create({
      data: clean({
        orgId,
        referrerUserId,
        code,
        couponId: body.couponId,
        createdByRole,
        autoGenerated: !body.code,
        displayName: body.displayName,
        maxUses: body.maxUses ?? 20,
        expiresAt: body.expiresAt
          ? new Date(body.expiresAt)
          : policy.referralCodeExpiryDays > 0
            ? new Date(Date.now() + policy.referralCodeExpiryDays * 24 * 60 * 60 * 1000)
            : undefined,
        status: body.status ?? "active",
        lastResetAt: new Date(),
      }),
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "referral.created",
      entityType: "referral_code",
      entityId: referral.id,
      metadata: { code: referral.code, createdByRole: referral.createdByRole },
    });
    return ok({
      referral,
      links: { web: `/join/${org.username}?ref=${code}`, short: `/r/${code}` },
    });
  }
  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "referrals", /.+/])) {
    const orgId = path[1]!;
    const referralId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "REFERRALS_MANAGE");
    const body = referralCodeManageSchema.partial().parse(await readJson(request));
    const existingReferral = await prisma.referralCode.findFirst({
      where: { id: referralId, orgId },
    });
    if (!existingReferral) {
      throw notFoundError("Referral code not found");
    }
    if (body.couponId) {
      const coupon = await prisma.coupon.findFirst({ where: { id: body.couponId, orgId } });
      if (!coupon) {
        throw notFoundError("Coupon not found");
      }
    }
    const referral = await prisma.referralCode.update({
      where: { id: existingReferral.id },
      data: clean({
        code: body.code,
        referrerUserId: body.referrerUserId,
        couponId: body.couponId,
        createdByRole: body.createdByRole,
        displayName: body.displayName,
        maxUses: body.maxUses,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : body.expiresAt,
        status: body.status,
      }),
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "referral.updated",
      entityType: "referral_code",
      entityId: referral.id,
      metadata: { code: referral.code, status: referral.status },
    });
    return ok({ referral });
  }
  if (request.method === "GET" && pathMatches(path, ["r", /.+/])) {
    const referral = await prisma.referralCode.findUnique({ where: { code: path[1]! } });
    if (!referral) return fail("NOT_FOUND", "Referral not found", 404);
    const org = await prisma.organization.findUnique({ where: { id: referral.orgId } });
    return ok({ referral, org });
  }
  if (request.method === "POST" && pathMatches(path, ["referrals", /.+/, "redeem"])) {
    const code = path[1]!.trim().toUpperCase();
    const referralRecord = await prisma.referralCode.findUnique({ where: { code } });
    if (!referralRecord) {
      throw notFoundError("Referral not found");
    }
    const orgId = referralRecord.orgId;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireAuth(ctx);
    await assertRateLimit(
      "referralRedeemByActor",
      `${orgId}:${userId}:${code}`,
      "Too many referral redemption attempts from this account.",
    );
    const { referral, redemption, alreadyRedeemed } = await redeemReferralCodeForUser({
      orgId,
      userId,
      code,
      ctx,
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: alreadyRedeemed ? "referral.redeem_replayed" : "referral.redeemed",
      entityType: "referral_redemption",
      entityId: redemption.id,
      metadata: { code: referral.code, referralCodeId: referral.id },
    });
    if (!alreadyRedeemed) {
      await flagReferralAbuseIfNeeded({
        orgId,
        referralCodeId: referral.id,
        referredUserId: userId,
      });
    }
    return ok({ referral, redemption, alreadyRedeemed });
  }
  return undefined;
}

export async function handleAttendance(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "attendance"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgAnyPermission(ctx, orgId, ["ATTENDANCE_APPROVE", "MEMBERS_VIEW"]);
    return ok(await listOrganizationAttendancePage(orgId, request));
  }

  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "attendance", "qr-token"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ATTENDANCE_QR_DISPLAY");
    const branchId = await assertBranchAccessForContext(ctx, orgId, queryBranchId(request));
    const branch = await resolveOrgBranch(orgId, branchId);
    const payload = createSignedQrToken({
      orgId,
      branchId: branch.id,
      secret: getQrSigningSecret(),
    });
    await prisma.attendanceQrToken.create({
      data: {
        orgId,
        branchId: branch.id,
        nonce: payload.nonce,
        issuedAt: new Date(payload.timestamp),
        expiresAt: new Date(payload.expiry),
        signature: payload.signature,
        createdById: userId,
      },
    });
    return ok({
      qrPayload: encodeQrPayload(payload),
      checkInCode: checkInCodeForQrNonce(payload.nonce),
      expiresAt: new Date(payload.expiry),
    });
  }
  if (request.method === "POST" && pathMatches(path, ["attendance", "dev-scan"])) {
    const appEnv = (process.env.APP_ENV ?? process.env.ENV_PROFILE ?? "local").toLowerCase();
    if (appEnv !== "local" || process.env.NODE_ENV === "production") {
      throw forbiddenError("Test check-in is only available in development.");
    }
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const orgId = ctx.orgId;
    if (!orgId) {
      throw validationError("Select a gym before trying a sample check-in.");
    }
    const branch = await resolveOrgBranch(orgId);
    const dateKey = operationalDateKey();
    const existing = await prisma.attendanceRecord.findFirst({
      where: {
        orgId,
        branchId: branch.id,
        userId,
        dateKey,
      },
      orderBy: { checkedInAt: "desc" },
    });
    const record = await prisma.attendanceRecord.create({
      data: {
        orgId,
        branchId: branch.id,
        userId,
        dateKey,
        status: "APPROVED",
        source: "MANUAL",
        suspiciousFlags: ["local_dev_scan"],
      },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "attendance.dev_scan",
      entityType: "AttendanceRecord",
      entityId: record.id,
      metadata: { source: "local_dev_scan" },
    });
    const newBadges = await awardEngagementBadges({ orgId, userId });
    return ok({
      attendance: {
        ...attendanceWithEntryCode(record),
        checkedInAt: record.checkedInAt,
        branchName: branch.name,
        planName: "Test check-in",
      },
      status: record.status,
      duplicate: Boolean(existing),
      suspiciousFlags: [],
      newBadges,
    });
  }
  if (request.method === "POST" && pathMatches(path, ["attendance", "scan"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const body = attendanceScanSchema.parse(await readJson(request));
    await assertRateLimit(
      "qrScanByActor",
      `${userId}:${body.deviceId ?? "unknown-device"}`,
      "Too many attendance scans. Please wait before trying again.",
    );
    const now = new Date();
    const decoded = body.qrPayload
      ? validateSignedQrToken({
          encoded: body.qrPayload,
          secret: getQrSigningSecret(),
          now,
        })
      : await (async () => {
          const normalizedCode = normalizeCheckInCode(body.checkInCode ?? "");
          if (!normalizedCode) {
            throw validationError("Enter the check-in code as two letters and four digits.");
          }
          await assertRateLimit(
            "qrScanByToken",
            `code:${normalizedCode}`,
            "Too many code attempts. Please wait before trying again.",
          );
          const activeTokens = await prisma.attendanceQrToken.findMany({
            where: { expiresAt: { gt: now } },
            orderBy: { issuedAt: "desc" },
            take: 500,
          });
          const matches = activeTokens.filter(
            (token) => checkInCodeForQrNonce(token.nonce) === normalizedCode,
          );
          if (matches.length !== 1) {
            throw validationError(
              matches.length > 1
                ? "This check-in code matched more than one active branch. Please scan the QR."
                : "Check-in code is invalid or expired.",
            );
          }
          const token = matches[0]!;
          return validateSignedQrToken({
            encoded: encodeQrPayload({
              orgId: token.orgId,
              branchId: token.branchId,
              timestamp: token.issuedAt.getTime(),
              nonce: token.nonce,
              expiry: token.expiresAt.getTime(),
              signature: token.signature,
            }),
            secret: getQrSigningSecret(),
            now,
          });
        })();
    await assertRateLimit(
      "qrScanByToken",
      decoded.nonce,
      "This QR code has been scanned too many times. Ask reception to refresh it.",
    );
    const qrToken = await prisma.attendanceQrToken.findUnique({ where: { nonce: decoded.nonce } });
    if (
      !qrToken ||
      qrToken.orgId !== decoded.orgId ||
      qrToken.branchId !== decoded.branchId ||
      qrToken.signature !== decoded.signature ||
      qrToken.expiresAt <= now
    ) {
      throw validationError("QR token is invalid or expired.");
    }
    const scanReservation = await prisma.attendanceQrToken.updateMany({
      where: { nonce: decoded.nonce, scanCount: { lt: 200 } },
      data: { scanCount: { increment: 1 }, lastScannedAt: now },
    });
    if (scanReservation.count !== 1) {
      throw validationError(
        "This QR code has expired due to scan volume. Ask reception to refresh it.",
      );
    }
    const [org, memberProfile, scanUser, subscription, expiredSubscription, recentCheckIn, branch] =
      await Promise.all([
        prisma.organization.findUnique({ where: { id: decoded.orgId } }),
        prisma.memberProfile.findUnique({
          where: { orgId_userId: { orgId: decoded.orgId, userId } },
        }),
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.memberSubscription.findFirst({
          where: { orgId: decoded.orgId, memberUserId: userId, status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
        }),
        prisma.memberSubscription.findFirst({
          where: { orgId: decoded.orgId, memberUserId: userId, status: "EXPIRED" },
          orderBy: { createdAt: "desc" },
        }),
        prisma.attendanceRecord.findFirst({
          where: {
            orgId: decoded.orgId,
            branchId: decoded.branchId,
            userId,
            dateKey: operationalDateKey(now),
          },
          orderBy: { checkedInAt: "desc" },
        }),
        prisma.branch.findUnique({
          where: { id: decoded.branchId },
          select: { id: true, name: true, operatingHours: true },
        }),
      ]);
    const plan = subscription
      ? await prisma.membershipPlan.findUnique({
          where: { id: subscription.planId },
        })
      : null;
    if (!org || !subscription) {
      if (expiredSubscription) {
        return fail("MEMBERSHIP_EXPIRED", "Membership expired. Renew before checking in.", 400);
      }
      return fail("NO_ACTIVE_MEMBERSHIP", "No active membership", 400);
    }
    if (!branch) {
      return fail("BRANCH_NOT_FOUND", "Branch not found", 404);
    }
    const branchHours = evaluateOperatingHours({ operatingHours: branch.operatingHours, now });
    if (!branchHours.open) {
      return fail(
        "BRANCH_CLOSED",
        "This branch is closed right now. Ask reception for manual check-in.",
        400,
      );
    }
    assertMinorConsentGranted({
      isMinor: Boolean(scanUser?.isMinor),
      guardianPending: Boolean(scanUser?.guardianPending),
      action: "attendance check-in",
    });
    const hasProfilePhoto = Boolean(memberProfile?.profilePhotoUrl || scanUser?.profilePhotoUrl);
    if (!hasProfilePhoto) {
      return fail(
        "PROFILE_PHOTO_REQUIRED",
        "Add a profile photo before check-in so the desk can verify you.",
        400,
      );
    }
    if (!plan) return fail("PLAN_NOT_FOUND", "Plan not found", 400);
    const validation = validateAttendanceScan({
      subscription: clean({
        id: subscription.id,
        orgId: subscription.orgId,
        branchId: subscription.branchId,
        memberUserId: subscription.memberUserId,
        planId: subscription.planId,
        status: subscription.status,
        startsAt: subscription.startsAt ?? undefined,
        endsAt: subscription.endsAt ?? undefined,
        remainingVisits: subscription.remainingVisits ?? undefined,
      }),
      plan: toMembershipPlanInput(plan),
      orgStatus: org.status,
      hasProfilePhoto,
      alreadyCheckedInToday: Boolean(recentCheckIn),
      wrongBranch: false,
      multiEntryConsumes: org.multiEntryConsumes,
      now,
    });
    if (!validation.allowed) {
      return fail(
        validation.reason?.toUpperCase() ?? "ATTENDANCE_BLOCKED",
        validation.reason ?? "Attendance blocked",
        400,
      );
    }
    const status = validation.suspiciousFlags.length
      ? decideAttendanceStatus({ mode: "AUTOMATIC", suspiciousFlags: validation.suspiciousFlags })
      : "APPROVED";
    const record = await prisma.attendanceRecord.create({
      data: clean({
        orgId: decoded.orgId,
        branchId: decoded.branchId,
        userId,
        subscriptionId: subscription.id,
        dateKey: operationalDateKey(now),
        status,
        source: "QR_SCAN",
        qrTokenId: decoded.nonce,
        suspiciousFlags: validation.suspiciousFlags,
        deviceId: body.deviceId,
      }),
    });
    const newBadges =
      status === "APPROVED"
        ? await (async () => {
            await applyAttendanceUsage({
              orgId: decoded.orgId,
              subscription,
              plan,
              recordId: record.id,
              alreadyCheckedInToday: Boolean(recentCheckIn),
              multiEntryConsumes: org.multiEntryConsumes,
            });
            return awardEngagementBadges({ orgId: decoded.orgId, userId });
          })()
        : [];
    return ok({
      attendance: {
        ...attendanceWithEntryCode(record),
        checkedInAt: record.checkedInAt,
        branchName: branch?.name ?? null,
        planName: plan.name,
      },
      status,
      duplicate: Boolean(recentCheckIn),
      suspiciousFlags: validation.suspiciousFlags,
      warnings: validation.warnings,
      newBadges,
    });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "reception", "verify-code"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireAuth(ctx);
    if (!ctx.isPlatformAdmin && (ctx.orgId !== orgId || !ctx.roles.length)) {
      throw forbiddenError("No organization access");
    }
    if (
      !ctx.isPlatformAdmin &&
      !ctx.permissions.includes("ATTENDANCE_APPROVE") &&
      !ctx.permissions.includes("SHOP_FULFILL_ORDER")
    ) {
      throw forbiddenError("Permission denied: reception code verification");
    }
    const body = receptionCodeVerifySchema.parse(await readJson(request));
    const code = body.code.toUpperCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [attendanceRecords, pickupCode] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where: { orgId, checkedInAt: { gte: today } },
        orderBy: { checkedInAt: "desc" },
        take: 150,
      }),
      prisma.pickupCode.findFirst({ where: { orgId, code } }),
    ]);
    const attendance = attendanceRecords.find(
      (record) => entryCodeForAttendanceId(record.id) === code,
    );
    if (attendance) {
      const [user, branch] = await Promise.all([
        prisma.user.findUnique({ where: { id: attendance.userId } }),
        prisma.branch.findUnique({ where: { id: attendance.branchId }, select: { name: true } }),
      ]);
      return ok({
        match: {
          type: "attendance",
          valid: attendance.status === "APPROVED" || attendance.status === "PENDING_APPROVAL",
          record: { ...attendanceWithEntryCode(attendance), branchName: branch?.name ?? null },
          user: user
            ? {
                id: user.id,
                name: user.name,
                privateHandle: privateUserHandle(user.id),
                email: publicUserEmail(user.email) ?? "",
                phone: user.phone,
                profilePhotoUrl: user.profilePhotoUrl,
              }
            : null,
        },
      });
    }
    if (pickupCode) {
      const order = await prisma.shopOrder.findFirst({ where: { id: pickupCode.orderId, orgId } });
      const user = order ? await prisma.user.findUnique({ where: { id: order.userId } }) : null;
      return ok({
        match: {
          type: "pickup",
          valid: pickupCode.status === "READY_FOR_PICKUP",
          pickupCode,
          order,
          user: user
            ? {
                id: user.id,
                name: user.name,
                privateHandle: privateUserHandle(user.id),
                email: publicUserEmail(user.email) ?? "",
                phone: user.phone,
                profilePhotoUrl: user.profilePhotoUrl,
              }
            : null,
        },
      });
    }
    return ok({ match: null });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "attendance", "live"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "ATTENDANCE_APPROVE");
    const branchId = await assertBranchAccessForContext(ctx, orgId, queryBranchId(request));
    const records = await prisma.attendanceRecord.findMany({
      where: {
        orgId,
        status: { in: ["PENDING_APPROVAL", "FLAGGED"] },
        ...(branchId ? { branchId } : {}),
      },
      take: 40,
      orderBy: { checkedInAt: "desc" },
    });
    const [users, profiles, subscriptions, plans, branches] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: records.map((record) => record.userId) } } }),
      prisma.memberProfile.findMany({
        where: { orgId, userId: { in: records.map((record) => record.userId) } },
      }),
      prisma.memberSubscription.findMany({
        where: {
          id: { in: records.map((record) => record.subscriptionId).filter(Boolean) as string[] },
        },
      }),
      prisma.membershipPlan.findMany({
        where: {
          id: {
            in: (
              await prisma.memberSubscription.findMany({
                where: {
                  id: {
                    in: records.map((record) => record.subscriptionId).filter(Boolean) as string[],
                  },
                },
                select: { planId: true },
              })
            ).map((subscription) => subscription.planId),
          },
        },
      }),
      prisma.branch.findMany({
        where: { id: { in: [...new Set(records.map((record) => record.branchId))] } },
        select: { id: true, name: true },
      }),
    ]);
    const branchNamesById = new Map(branches.map((branch) => [branch.id, branch.name]));
    return ok({
      records: records.map((record) => {
        const user = users.find((candidate) => candidate.id === record.userId) ?? null;
        const profile = profiles.find((candidate) => candidate.userId === record.userId) ?? null;
        const subscription =
          subscriptions.find((candidate) => candidate.id === record.subscriptionId) ?? null;
        const plan = subscription
          ? (plans.find((candidate) => candidate.id === subscription.planId) ?? null)
          : null;
        return {
          ...record,
          entryCode: entryCodeForAttendanceId(record.id),
          branchName: branchNamesById.get(record.branchId) ?? null,
          user: user ? serializeUserForClient(user) : null,
          profile,
          subscription,
          plan,
        };
      }),
    });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "attendance", "today"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "ATTENDANCE_APPROVE");
    const branchId = await assertBranchAccessForContext(ctx, orgId, queryBranchId(request));
    return ok({ records: await getOrganizationAttendanceToday(orgId, clean({ branchId })) });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "attendance", "pending"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "ATTENDANCE_APPROVE");
    const branchId = await assertBranchAccessForContext(ctx, orgId, queryBranchId(request));
    return ok({ records: await getOrganizationPendingAttendance(orgId, clean({ branchId })) });
  }
  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "attendance", /.+/, "approve"])
  ) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ATTENDANCE_APPROVE");
    const existingRecord = await prisma.attendanceRecord.findFirst({
      where: { id: path[3]!, orgId },
    });
    if (!existingRecord) {
      throw notFoundError("Attendance record not found");
    }
    await assertBranchAccessForContext(ctx, orgId, existingRecord.branchId);
    if (existingRecord.status === "REJECTED") {
      throw conflictError("Rejected attendance records cannot be approved.");
    }
    const record = await prisma.attendanceRecord.update({
      where: { id: existingRecord.id },
      data: { status: "APPROVED", approvedById: userId, approvedAt: new Date() },
    });
    let newBadges: EngagementBadgePayload[] = [];
    if (record.subscriptionId) {
      const subscription = await prisma.memberSubscription.findUnique({
        where: { id: record.subscriptionId },
      });
      const plan = subscription
        ? await prisma.membershipPlan.findUnique({ where: { id: subscription.planId } })
        : null;
      const org = await prisma.organization.findUnique({ where: { id: orgId } });
      if (subscription && plan && org) {
        await applyAttendanceUsage({
          orgId,
          subscription,
          plan,
          recordId: record.id,
          multiEntryConsumes: org.multiEntryConsumes,
        });
        newBadges = await awardEngagementBadges({ orgId, userId: record.userId });
      }
    }
    await createDirectNotification({
      orgId,
      createdById: userId,
      type: "TRANSACTIONAL",
      title: "Check-in approved",
      body: "Your attendance has been approved.",
      audience: "selected_member",
      userIds: [record.userId],
      metadata: { attendanceRecordId: record.id },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "attendance.approved",
      entityType: "attendance_record",
      entityId: record.id,
    });
    return ok({
      record,
      newBadges,
    });
  }
  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "attendance", /.+/, "reject"])
  ) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ATTENDANCE_APPROVE");
    const body = attendanceRejectSchema.parse(await readJson(request));
    const existingRecord = await prisma.attendanceRecord.findFirst({
      where: { id: path[3]!, orgId },
    });
    if (!existingRecord) {
      throw notFoundError("Attendance record not found");
    }
    await assertBranchAccessForContext(ctx, orgId, existingRecord.branchId);
    const record = await prisma.attendanceRecord.update({
      where: { id: existingRecord.id },
      data: {
        status: "REJECTED",
        rejectedById: userId,
        rejectedAt: new Date(),
        rejectionReason: body.reason,
      },
    });
    await createDirectNotification({
      orgId,
      createdById: userId,
      type: "TRANSACTIONAL",
      title: "Check-in rejected",
      body: body.reason,
      audience: "selected_member",
      userIds: [record.userId],
      metadata: { attendanceRecordId: record.id },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "attendance.rejected",
      entityType: "attendance_record",
      entityId: record.id,
      metadata: { reason: body.reason },
    });
    return ok({ record });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "attendance", "manual"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ATTENDANCE_MANUAL_OVERRIDE");
    const body = manualAttendanceSchema.parse(await readJson(request));
    requireManualOverrideReason(body.reason);
    await assertOrgUser({ orgId, userId: body.memberUserId, role: "MEMBER" });
    const branchId = await assertBranchAccessForContext(ctx, orgId, body.branchId);
    const branch = await resolveOrgBranch(orgId, branchId);
    const memberUser = await prisma.user.findUniqueOrThrow({ where: { id: body.memberUserId } });
    assertMinorConsentGranted({
      isMinor: memberUser.isMinor,
      guardianPending: memberUser.guardianPending,
      action: "manual attendance override",
    });
    const record = await prisma.attendanceRecord.create({
      data: {
        orgId,
        branchId: branch.id,
        userId: body.memberUserId,
        dateKey: operationalDateKey(),
        status: "APPROVED",
        source: "MANUAL",
        approvedById: userId,
        approvedAt: new Date(),
        suspiciousFlags: ["manual_override"],
      },
    });
    await prisma.attendanceOverride.create({
      data: clean({
        orgId,
        attendanceRecordId: record.id,
        userId: body.memberUserId,
        reason: body.reason,
        notes: body.notes,
        createdById: userId,
      }),
    });
    const subscription = await prisma.memberSubscription.findFirst({
      where: { orgId, memberUserId: body.memberUserId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
    const plan = subscription
      ? await prisma.membershipPlan.findUnique({ where: { id: subscription.planId } })
      : null;
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (subscription && plan && org) {
      await applyAttendanceUsage({
        orgId,
        subscription,
        plan,
        recordId: record.id,
        multiEntryConsumes: org.multiEntryConsumes,
      });
    }
    const newBadges = await awardEngagementBadges({ orgId, userId: body.memberUserId });
    await createDirectNotification({
      orgId,
      createdById: userId,
      type: "TRANSACTIONAL",
      title: "Manual attendance recorded",
      body: `Attendance was recorded manually: ${body.reason}.`,
      audience: "selected_member",
      userIds: [body.memberUserId],
      metadata: { attendanceRecordId: record.id },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "attendance.manual_override",
      entityType: "attendance_record",
      entityId: record.id,
      metadata: { memberUserId: body.memberUserId, reason: body.reason },
    });
    return ok({ record, newBadges });
  }
  return undefined;
}

export async function handleStaffPlansGoals(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["staff-invitations", /.+/])) {
    const token = path[1]!;
    const invite = await prisma.staffInvitation.findUnique({ where: { token } });
    if (!invite) {
      throw notFoundError("Staff invitation not found");
    }
    const organization = await prisma.organization.findUnique({ where: { id: invite.orgId } });
    return ok({
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        branchId: invite.branchId,
        acceptedAt: invite.acceptedAt,
        expiresAt: invite.expiresAt,
      },
      organization,
    });
  }
  if (request.method === "POST" && pathMatches(path, ["staff-invitations", /.+/, "accept"])) {
    const token = path[1]!;
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const invite = await prisma.staffInvitation.findUnique({ where: { token } });
    if (!invite) {
      throw notFoundError("Staff invitation not found");
    }
    if (invite.acceptedAt) {
      throw conflictError("Staff invitation has already been accepted.");
    }
    if (invite.expiresAt.getTime() < Date.now()) {
      throw validationError("Staff invitation has expired.");
    }
    const acceptingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!acceptingUser || acceptingUser.email.toLowerCase() !== invite.email.toLowerCase()) {
      throw forbiddenError("Sign in with the invited email address to accept this staff invite.");
    }
    const assignment = await prisma.$transaction(async (tx) => {
      await tx.organizationUser.upsert({
        where: { orgId_userId: { orgId: invite.orgId, userId } },
        update: { leftAt: null },
        create: { orgId: invite.orgId, userId },
      });
      await assertSingleRoleForOrgUser(tx, {
        orgId: invite.orgId,
        userId,
        nextRole: invite.role as OrgRole,
      });
      const roleAssignment = await tx.organizationRoleAssignment.upsert({
        where: { orgId_userId_role: { orgId: invite.orgId, userId, role: invite.role } },
        update: { assignedById: invite.invitedById, branchId: invite.branchId },
        create: {
          orgId: invite.orgId,
          userId,
          role: invite.role,
          branchId: invite.branchId,
          assignedById: invite.invitedById,
        },
      });
      await tx.staffInvitation.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date(), acceptedById: userId },
      });
      return roleAssignment;
    });
    await writeAuditLog({
      request,
      orgId: invite.orgId,
      actorUserId: userId,
      action: "staff.invite_accepted",
      entityType: "staff_invitation",
      entityId: invite.id,
      metadata: { role: invite.role },
    });
    await revokeActiveSessionsForUsers([userId]);
    return ok({ assignment });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "staff"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "ORG_MANAGE_STAFF");
    const staff = await prisma.organizationRoleAssignment.findMany({
      where: { orgId, role: { not: "MEMBER" } },
    });
    const users = await prisma.user.findMany({
      where: { id: { in: staff.map((row) => row.userId) } },
    });
    return ok({ staff, users });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "staff", "invite"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_STAFF");
    await assertRateLimit(
      "staffInviteByActorOrg",
      `${orgId}:${userId}`,
      "Too many staff invites from this account today.",
    );
    const body = staffInviteSchema.parse(await readJson(request));
    if (body.branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: body.branchId, orgId, active: true },
        select: { id: true },
      });
      if (!branch) {
        throw validationError("Choose an active branch for this Reception user.");
      }
    }
    const inviteEmail = body.email.toLowerCase();
    const [{ tier, entitlements }, staffCount, pendingInviteCount, trainerCount, pendingTrainerInviteCount] =
      await Promise.all([
        getOrgSaasEntitlements(orgId),
        prisma.organizationRoleAssignment.count({ where: { orgId, role: { not: "MEMBER" } } }),
        prisma.staffInvitation.count({ where: { orgId, acceptedAt: null, expiresAt: { gt: new Date() } } }),
        prisma.organizationRoleAssignment.count({ where: { orgId, role: "TRAINER" } }),
        prisma.staffInvitation.count({
          where: { orgId, role: "TRAINER", acceptedAt: null, expiresAt: { gt: new Date() } },
        }),
      ]);
    assertLimitAvailable({
      limit: entitlements.staffLimit,
      used: staffCount + pendingInviteCount,
      label: "Staff",
      tier,
    });
    if (body.role === "TRAINER") {
      assertLimitAvailable({
        limit: entitlements.trainerLimit,
        used: trainerCount + pendingTrainerInviteCount,
        label: "Trainer",
        tier,
      });
    }
    const invitedUser = await prisma.user.findFirst({
      where: { email: { equals: inviteEmail, mode: "insensitive" } },
      select: { id: true },
    });
    if (invitedUser) {
      await assertSingleRoleForOrgUser(prisma, {
        orgId,
        userId: invitedUser.id,
        nextRole: body.role,
      });
    }
    const [organization, inviter] = await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId } }),
      prisma.user.findUnique({ where: { id: userId } }),
    ]);
    const invite = await prisma.staffInvitation.create({
      data: {
        orgId,
        email: inviteEmail,
        role: body.role,
        branchId: body.role === "RECEPTIONIST" ? (body.branchId ?? null) : null,
        token: randomBytes(18).toString("base64url"),
        invitedById: userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    const inviteBaseUrl = (
      process.env.NEXT_PUBLIC_WEB_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      ""
    ).replace(/\/$/, "");
    await getEmailProviderOrThrow().sendStaffInviteEmail(
      clean({
        to: invite.email,
        organizationName: organization?.name ?? "Zook",
        role: invite.role,
        inviterName: inviter?.name ?? inviter?.email,
        expiresAt: invite.expiresAt,
        ...(inviteBaseUrl ? { inviteUrl: `${inviteBaseUrl}/staff/invite/${invite.token}` } : {}),
      }),
    );
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "staff.invited",
      entityType: "staff_invitation",
      entityId: invite.id,
      metadata: { email: body.email, role: body.role, branchId: body.branchId ?? null },
    });
    return ok({ invite });
  }
  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "staff", /.+/])) {
    const orgId = path[1]!;
    const assignmentId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_STAFF");
    const body = staffRoleUpdateSchema.parse(await readJson(request));
    const existingAssignment = await prisma.organizationRoleAssignment.findFirst({
      where: { id: assignmentId, orgId },
    });
    if (!existingAssignment) {
      throw notFoundError("Staff assignment not found");
    }
    if (existingAssignment.role === "OWNER") {
      throw conflictError("Owner access cannot be edited from the staff roster.");
    }
    if (body.branchId) {
      await resolveOrgBranch(orgId, body.branchId);
    }
    await assertSingleRoleForOrgUser(prisma, {
      orgId,
      userId: existingAssignment.userId,
      nextRole: body.role,
      allowAssignmentId: existingAssignment.id,
    });
    const duplicateAssignment = await prisma.organizationRoleAssignment.findFirst({
      where: {
        orgId,
        userId: existingAssignment.userId,
        role: body.role,
        id: { not: existingAssignment.id },
      },
    });
    if (duplicateAssignment) {
      throw conflictError("This staff member already has that role.");
    }
    const assignment = await prisma.organizationRoleAssignment.update({
      where: { id: existingAssignment.id },
      data: { role: body.role, branchId: body.branchId ?? null },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "staff.role_updated",
      entityType: "organization_role_assignment",
      entityId: assignment.id,
      metadata: {
        userId: assignment.userId,
        previousRole: existingAssignment.role,
        role: assignment.role,
      },
    });
    await revokeActiveSessionsForUsers([assignment.userId]);
    return ok({ assignment });
  }
  if (request.method === "DELETE" && pathMatches(path, ["orgs", /.+/, "staff", /.+/])) {
    const orgId = path[1]!;
    const assignmentId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_STAFF");
    const existingAssignment = await prisma.organizationRoleAssignment.findFirst({
      where: { id: assignmentId, orgId },
    });
    if (!existingAssignment) {
      throw notFoundError("Staff assignment not found");
    }
    if (existingAssignment.role === "OWNER") {
      throw conflictError("Owner access cannot be revoked from the staff roster.");
    }
    await prisma.organizationRoleAssignment.delete({ where: { id: existingAssignment.id } });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "staff.revoked",
      entityType: "organization_role_assignment",
      entityId: existingAssignment.id,
      metadata: { userId: existingAssignment.userId, role: existingAssignment.role },
    });
    await revokeActiveSessionsForUsers([existingAssignment.userId]);
    return ok({ revoked: true });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "classes"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireAuth(ctx);
    assertActiveContextOrg(ctx, orgId);
    const branchId = queryBranchId(request);
    if (branchId) {
      await resolveOrgBranch(orgId, branchId);
    }
    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");
    const startTime = clean({
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    });
    const classes = await prisma.class.findMany({
      where: clean({
        orgId,
        ...(branchId ? { branchId } : {}),
        ...(Object.keys(startTime).length ? { startTime } : {}),
      }),
      orderBy: { startTime: "asc" },
      take: 100,
    });
    const enrollments = classes.length
      ? await prisma.classEnrollment.findMany({
          where: { classId: { in: classes.map((entry) => entry.id) } },
        })
      : [];
    return ok({
      classes: classes.map((entry) => ({
        ...entry,
        enrollmentCount: enrollments.filter(
          (enrollment) => enrollment.classId === entry.id && enrollment.status === "confirmed",
        ).length,
      })),
    });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "classes"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgAnyPermission(ctx, orgId, ["TRAINERS_MANAGE", "PLANS_CREATE"]);
    const body = classInputSchema.parse(await readJson(request));
    if (!ctx.permissions.includes("TRAINERS_MANAGE") && body.trainerId !== userId) {
      throw forbiddenError("Trainers can only schedule their own classes.");
    }
    const [branch] = await Promise.all([
      resolveOrgBranch(orgId, body.branchId),
      assertOrgUser({ orgId, userId: body.trainerId, role: "TRAINER" }),
    ]);
    const startTime = new Date(body.startTime);
    const endTime = new Date(body.endTime);
    validateClassSchedule({ startTime, endTime, maxCapacity: body.maxCapacity });
    const classRecord = await prisma.class.create({
      data: clean({
        orgId,
        branchId: branch.id,
        trainerId: body.trainerId,
        name: body.name,
        description: body.description,
        classType: body.classType,
        maxCapacity: body.maxCapacity,
        startTime,
        endTime,
        recurrenceRule: body.recurrenceRule,
      }),
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "class.created",
      entityType: "class",
      entityId: classRecord.id,
      metadata: { trainerId: classRecord.trainerId, branchId: classRecord.branchId },
    });
    return ok({ class: classRecord });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "classes", /.+/, "enroll"])) {
    const orgId = path[1]!;
    const classId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireAuth(ctx);
    assertActiveContextOrg(ctx, orgId);
    await assertOrgUser({ orgId, userId, role: "MEMBER" });
    const classRecord = await prisma.class.findFirst({ where: { id: classId, orgId } });
    if (!classRecord) {
      throw notFoundError("Class not found");
    }
    if (classRecord.status !== "scheduled") {
      throw conflictError("Class is not open for enrollment.");
    }
    const confirmedEnrollmentCount = await prisma.classEnrollment.count({
      where: { classId, status: "confirmed" },
    });
    const decision = decideClassEnrollment({
      maxCapacity: classRecord.maxCapacity,
      confirmedEnrollmentCount,
      allowWaitlist: true,
    });
    const enrollment = await prisma.classEnrollment.upsert({
      where: { classId_memberId: { classId, memberId: userId } },
      update: clean({
        status: decision.status,
        cancelledAt: null,
        enrolledAt: new Date(),
      }),
      create: {
        classId,
        memberId: userId,
        status: decision.status,
      },
    });
    return ok({ enrollment, remainingCapacity: decision.remainingCapacity });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "permissions"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "ORG_MANAGE_PERMISSIONS");
    return ok({
      permissions: await prisma.organizationRolePermission.findMany({ where: { orgId } }),
    });
  }
  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "permissions"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_PERMISSIONS");
    const body = permissionOverrideSchema.parse(await readJson(request));
    const permission = await prisma.organizationRolePermission.upsert({
      where: {
        orgId_role_permission: { orgId, role: body.role, permission: body.permission },
      },
      update: { enabled: body.enabled, overriddenByUserId: userId },
      create: {
        orgId,
        role: body.role,
        permission: body.permission,
        enabled: body.enabled,
        overriddenByUserId: userId,
      },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "permissions.updated",
      entityType: "organization_role_permission",
      entityId: permission.id,
      metadata: body,
    });
    const affectedAssignments = await prisma.organizationRoleAssignment.findMany({
      where: { orgId, role: body.role },
      select: { userId: true },
    });
    await revokeActiveSessionsForUsers(affectedAssignments.map((assignment) => assignment.userId));
    return ok({ permission });
  }
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
  if (request.method === "GET" && pathMatches(path, ["me", "plans"])) {
    const userId = requireAuth(await getRequestContext(request));
    return ok({ plans: await listPlanAssignmentsForUser(userId) });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "plans", /.+/, "exercises"])) {
    const userId = requireAuth(await getRequestContext(request));
    const detail = await getPlanExercisesForUser(userId, path[2]!);
    if (!detail) {
      throw notFoundError("Plan assignment not found");
    }
    return ok(detail);
  }
  if (request.method === "GET" && pathMatches(path, ["me", "plans", /.+/])) {
    const userId = requireAuth(await getRequestContext(request));
    const plans = await listPlanAssignmentsForUser(userId, path[2]!);
    const assignment = plans[0];
    if (!assignment) {
      throw notFoundError("Plan assignment not found");
    }
    return ok({ assignment });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "plans", /.+/, "progress"])) {
    const userId = requireAuth(await getRequestContext(request));
    const body = planProgressInputSchema.parse(await readJson(request));
    const assignment = await prisma.planAssignment.findFirst({
      where: { id: path[2]!, assignedToUserId: userId, active: true },
    });
    if (!assignment) {
      throw notFoundError("Plan assignment not found");
    }
    if (body.orgId && body.orgId !== assignment.orgId) {
      throw forbiddenError("Progress organization does not match the plan assignment.");
    }
    const progress = await prisma.planProgress.upsert({
      where: { assignmentId_userId: { assignmentId: path[2]!, userId } },
      update: clean({
        progressJson: body.progressJson as Prisma.InputJsonValue,
        completionPct: body.completionPct,
        feedback: body.feedback,
      }),
      create: clean({
        orgId: assignment.orgId,
        assignmentId: path[2]!,
        userId,
        progressJson: body.progressJson as Prisma.InputJsonValue,
        completionPct: body.completionPct,
        feedback: body.feedback,
      }),
    });
    return ok({ progress });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "plans", /.+/, "complete"])) {
    const userId = requireAuth(await getRequestContext(request));
    const body = planCompletionInputSchema.parse(await readJson(request));
    const detail = await getPlanExercisesForUser(userId, path[2]!);
    if (!detail) {
      throw notFoundError("Plan assignment not found");
    }
    if (planRequiresExercises(detail.plan.type as PlanType) && !detail.exercises.length) {
      throw validationError("Workout plans need at least one exercise before completion.");
    }
    if (body.orgId && body.orgId !== detail.assignment.orgId) {
      throw forbiddenError("Completion organization does not match the plan assignment.");
    }
    const completedExercises = body.exercises.length
      ? body.exercises.filter((exercise) => exercise.completed).map((exercise) => exercise.name)
      : detail.exercises.map((exercise) => exercise.name);
    const progressJson = {
      ...body.progressJson,
      completedExercises,
      exerciseProgress: body.exercises,
      completedAt: new Date().toISOString(),
    };
    const progress = await prisma.planProgress.upsert({
      where: { assignmentId_userId: { assignmentId: path[2]!, userId } },
      update: clean({
        progressJson: progressJson as Prisma.InputJsonValue,
        completionPct: 100,
        feedback: body.feedback,
      }),
      create: clean({
        orgId: detail.assignment.orgId,
        assignmentId: path[2]!,
        userId,
        progressJson: progressJson as Prisma.InputJsonValue,
        completionPct: 100,
        feedback: body.feedback,
      }),
    });
    return ok({ progress, completedExercises });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "goals"])) {
    const userId = requireAuth(await getRequestContext(request));
    return ok({ goals: await prisma.userGoal.findMany({ where: { userId, active: true } }) });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "goals"])) {
    const userId = requireAuth(await getRequestContext(request));
    const body = (await readJson(request)) as {
      orgId?: string;
      type: string;
      title: string;
      targetValue?: number;
      period?: string;
    };
    const goal = await prisma.userGoal.create({
      data: clean({
        orgId: body.orgId,
        userId,
        type: body.type,
        title: body.title,
        targetValue: body.targetValue,
        period: body.period,
      }),
    });
    return ok({ goal });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "badges"])) {
    const requestedOrgId = request.nextUrl.searchParams.get("orgId") ?? undefined;
    const ctx = await getRequestContext(request, requestedOrgId ? { orgId: requestedOrgId } : {});
    const userId = requireAuth(ctx);
    assertActiveContextOrg(ctx, requestedOrgId);
    return ok({ badges: await getBadgePayloads(userId, requestedOrgId ?? ctx.orgId) });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "challenges"])) {
    return ok({
      challenges: await prisma.challenge.findMany({ where: { orgId: path[1]!, active: true } }),
    });
  }
  return undefined;
}

export async function handleAiNotificationsShopPrivacyPlatform(
  request: NextRequest,
  path: string[],
) {
  if (request.method === "POST" && pathMatches(path, ["ai", "chat"])) {
    assertAiLaunchEnabled();
    const body = aiChatSchema.parse(await readJson(request));
    const ctx = await getRequestContext(request, body.orgId ? { orgId: body.orgId } : {});
    if (!(await isFeatureFlagEnabled("ai.assistant", body.orgId ?? ctx.orgId))) {
      throw serviceUnavailableError("AI assistant is disabled by platform controls.");
    }
    const userId = requireAuth(ctx);
    await assertRateLimit(
      "aiRequestByUser",
      userId,
      "Too many assistant requests. Please slow down and try again shortly.",
    );
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (body.orgId) {
      requireOrgPermission(ctx, body.orgId, "AI_USE_TEXT");
      await assertSaasAiAllowance(body.orgId, "CHAT");
    }
    const role = (ctx.roles[0] ?? "MEMBER") as OrgRole;
    const quota = await resolveAIQuotaState({ userId, role });
    let result: Awaited<ReturnType<typeof runAIGuardedRequest>>;
    try {
      result = await runAIGuardedRequest({
        provider: getAIProviderOrThrow(),
        prompt: body.prompt,
        role,
        requestType: "CHAT",
        quota,
        user: {
          isMinor: user.isMinor,
          guardianConsentGranted: !user.guardianPending,
          marketingOptIn: user.marketingOptIn,
          aiConsent: aiConsentAllowed(user),
          hasProfilePhoto: Boolean(user.profilePhotoUrl),
        },
      });
    } catch (error) {
      if (error instanceof AIGuardError) {
        await persistBlockedAiAttempt({
          request,
          ...(body.orgId ? { orgId: body.orgId } : {}),
          userId,
          role,
          requestType: "CHAT",
          prompt: body.prompt,
          error,
        });
        throw validationError(error.message, {
          reason: error.reason,
          flags: error.safetyFlags,
        });
      }
      throw error;
    }
    const conversation = await persistAiConversation({
      userId,
      prompt: body.prompt,
      response: result.response,
      ...(body.conversationId ? { conversationId: body.conversationId } : {}),
      ...(body.orgId ? { orgId: body.orgId } : {}),
      safetyFlags: result.safetyFlags as Prisma.InputJsonValue,
    });
    await prisma.aIUsageLog.create({
      data: clean({
        orgId: body.orgId,
        userId,
        role,
        provider: currentAIProviderType(),
        requestType: "CHAT",
        promptSummary: body.prompt.slice(0, 120),
        responseSummary: summarizeAIResponse(result.response),
        tokenEstimate: result.tokenEstimate,
        quotaConsumed: result.quotaConsumed,
        safetyFlags: result.safetyFlags,
      }),
    });
    await writeAuditLog({
      request,
      ...(body.orgId ? { orgId: body.orgId } : {}),
      actorUserId: userId,
      action: "ai.request.completed",
      entityType: "ai_conversation",
      entityId: conversation.id,
      metadata: {
        requestType: "CHAT",
        prompt: body.prompt,
        completion: result.response,
        safetyFlags: result.safetyFlags,
      },
    });
    return ok({ ...result, conversationId: conversation.id });
  }
  if (
    request.method === "POST" &&
    (pathMatches(path, ["ai", "generate-plan"]) || pathMatches(path, ["ai", "generate-image"]))
  ) {
    assertAiLaunchEnabled();
    const body = aiGenerateSchema.parse(await readJson(request));
    const ctx = await getRequestContext(request, body.orgId ? { orgId: body.orgId } : {});
    const userId = requireAuth(ctx);
    await assertRateLimit(
      "aiRequestByUser",
      userId,
      "Too many assistant requests. Please slow down and try again shortly.",
    );
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const requestType: AIRequestType = path[1] === "generate-image" ? "IMAGE" : "STRUCTURED_PLAN";
    requireOrgPermission(
      ctx,
      body.orgId,
      requestType === "IMAGE" ? "AI_GENERATE_IMAGE" : "AI_GENERATE_PLAN",
    );
    await assertSaasAiAllowance(body.orgId, requestType);
    const role = (ctx.roles[0] ?? "MEMBER") as OrgRole;
    if (requestType === "STRUCTURED_PLAN" && !ctx.roles.includes("TRAINER")) {
      throw forbiddenError("Trainer plan generation requires a trainer role.");
    }
    if (requestType === "STRUCTURED_PLAN" && body.persistDraft && !body.targetUserId) {
      throw validationError("Choose a member before creating a trainer draft.");
    }
    if (requestType === "STRUCTURED_PLAN" && body.targetUserId) {
      const assignment = await prisma.trainerAssignment.findFirst({
        where: {
          orgId: body.orgId,
          trainerUserId: userId,
          memberUserId: body.targetUserId,
          active: true,
        },
      });
      if (!assignment) {
        throw forbiddenError("Trainer drafts can only target assigned clients.");
      }
    }
    const quota = await resolveAIQuotaState({ userId, role });
    let result: Awaited<ReturnType<typeof runAIGuardedRequest>>;
    try {
      result = await runAIGuardedRequest({
        provider: getAIProviderOrThrow(),
        prompt: body.prompt,
        role,
        requestType,
        quota,
        user: {
          isMinor: user.isMinor,
          guardianConsentGranted: !user.guardianPending,
          marketingOptIn: user.marketingOptIn,
          aiConsent: user.aiConsent,
          hasProfilePhoto: Boolean(user.profilePhotoUrl),
        },
      });
    } catch (error) {
      if (error instanceof AIGuardError) {
        await persistBlockedAiAttempt({
          request,
          orgId: body.orgId,
          userId,
          role,
          requestType,
          prompt: body.prompt,
          error,
        });
        throw validationError(error.message, {
          reason: error.reason,
          flags: error.safetyFlags,
        });
      }
      throw error;
    }
    let createdPlan: Prisma.PlanContentGetPayload<object> | undefined;
    if (requestType === "STRUCTURED_PLAN" && body.orgId && body.persistDraft) {
      const planType = body.type ?? "WORKOUT";
      const title = body.title ?? `${planType === "DIET" ? "Nutrition" : "Workout"} draft`;
      const content = aiStructuredPlanContentSchema.parse(
        sanitizeJsonRichText(normalizedStructuredPlanContent(result.response)),
      );
      createdPlan = await prisma.planContent.create({
        data: {
          orgId: body.orgId,
          creatorUserId: userId,
          type: planType as never,
          title,
          description: "Assisted draft. Review before publishing.",
          content: content as Prisma.InputJsonValue,
          aiGenerated: true,
          visibility: "assigned",
        },
      });
      await prisma.planVersion.create({
        data: {
          orgId: body.orgId,
          planId: createdPlan.id,
          versionNo: 1,
          content: createPlanVersionSnapshot({
            title,
            description: "Assisted draft. Review before publishing.",
            aiGenerated: true,
            visibility: "assigned",
            content: content as Record<string, unknown>,
          }) as Prisma.InputJsonValue,
          createdById: userId,
        },
      });
      await writeAuditLog({
        request,
        orgId: body.orgId,
        actorUserId: userId,
        action: "plan.ai_draft_created",
        entityType: "plan_content",
        entityId: createdPlan.id,
        metadata: { type: planType, targetUserId: body.targetUserId },
      });
    }
    await prisma.aIUsageLog.create({
      data: clean({
        orgId: body.orgId,
        userId,
        role,
        provider: currentAIProviderType(),
        requestType,
        promptSummary: body.prompt.slice(0, 120),
        responseSummary: summarizeAIResponse(result.response),
        tokenEstimate: result.tokenEstimate,
        quotaConsumed: result.quotaConsumed,
        imageCount: requestType === "IMAGE" ? 1 : 0,
        createdPlanId: createdPlan?.id,
        safetyFlags: result.safetyFlags,
      }),
    });
    await writeAuditLog({
      request,
      orgId: body.orgId,
      actorUserId: userId,
      action: "ai.request.completed",
      entityType: createdPlan ? "plan_content" : "ai_request",
      ...(createdPlan?.id ? { entityId: createdPlan.id } : {}),
      metadata: {
        requestType,
        prompt: body.prompt,
        completion: result.response,
        safetyFlags: result.safetyFlags,
      },
    });
    return ok({ ...result, ...(createdPlan ? { createdPlan } : {}) });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "ai", "usage"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgAnyPermission(ctx, orgId, ["AI_MANAGE_SETTINGS", "ORG_VIEW_REPORTS"]);
    return ok({
      usage: await prisma.aIUsageLog.findMany({
        where: { orgId },
        take: 50,
        orderBy: { createdAt: "desc" },
      }),
    });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "notifications", "preview"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "NOTIFICATION_CREATE_DRAFT");
    await assertRateLimit(
      "notificationSendByActor",
      `${orgId}:${userId}:preview`,
      "Too many notification previews from this account.",
    );
    const body = notificationComposerSchema.parse(await readJson(request));
    if (body.branchId) {
      await resolveOrgBranch(orgId, body.branchId);
    }
    const permissionAudience =
      body.audience === "selected_members"
        ? "selected"
        : body.audience === "single_member"
          ? "single_member"
          : body.audience === "membership_plan"
            ? "plan"
            : body.audience;
    if (
      !canSendNotification({
        roles: ctx.roles,
        permissions: ctx.permissions,
        type: body.type,
        audience: permissionAudience,
      })
    ) {
      throw forbiddenError("You do not have permission to send this notification.");
    }
    const preview = await resolveNotificationPreview(
      clean({
        orgId,
        senderUserId: userId,
        audience: body.audience,
        type: body.type,
        selectedUserIds: body.selectedUserIds,
        singleUserId: body.singleUserId,
        planId: body.planId,
        branchId: body.branchId,
        daysAhead: body.daysAhead,
        excludeMinors: body.excludeMinors,
      }),
    );
    return ok({
      resolvedRecipients: preview.resolvedRecipients,
      willDeliver: preview.willDeliver,
      blockedByOptOut: preview.blockedByOptOut,
      blockedByMinor: preview.blockedByMinor,
      budget: await getNotificationBudgetSnapshot({ orgId, senderUserId: userId }),
    });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "notifications"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "NOTIFICATION_CREATE_DRAFT");
    await assertRateLimit(
      "notificationSendByActor",
      `${orgId}:${userId}`,
      "Too many notification sends. Please wait before trying again.",
    );
    const body = notificationComposerSchema.parse(await readJson(request));
    if (body.branchId) {
      await resolveOrgBranch(orgId, body.branchId);
    }
    const permissionAudience =
      body.audience === "selected_members"
        ? "selected"
        : body.audience === "single_member"
          ? "single_member"
          : body.audience === "membership_plan"
            ? "plan"
            : body.audience;
    if (
      !canSendNotification({
        roles: ctx.roles,
        permissions: ctx.permissions,
        type: body.type,
        audience: permissionAudience,
      })
    ) {
      throw forbiddenError("You do not have permission to send this notification.");
    }
    const recipientUserIds = await resolveNotificationRecipients(
      clean({
        orgId,
        senderUserId: userId,
        audience: body.audience,
        type: body.type,
        selectedUserIds: body.selectedUserIds,
        singleUserId: body.singleUserId,
        ...(body.planId ? { planId: body.planId } : {}),
        branchId: body.branchId,
        daysAhead: body.daysAhead,
        excludeMinors: body.excludeMinors,
      }),
    );
    const [{ tier, entitlements }, usage] = await Promise.all([
      getOrgSaasEntitlements(orgId),
      getOrgSaasUsage(orgId),
    ]);
    assertLimitAvailable({
      limit: entitlements.notificationMonthlyLimit,
      used: usage.notificationMonthlyCount,
      add: recipientUserIds.length,
      label: "Monthly notification recipient",
      tier,
    });
    const recipientSplit = body.scheduleAt
      ? { sendNowUserIds: recipientUserIds, scheduledUserIds: [] as string[] }
      : await splitRecipientsByDailyCap({ orgId, recipientUserIds });
    await enforceNotificationBudgets({
      orgId,
      senderUserId: userId,
      type: body.type,
      recipientUserIds: recipientSplit.sendNowUserIds,
    });
    const scheduledFor = new Date();
    scheduledFor.setDate(scheduledFor.getDate() + 1);
    scheduledFor.setHours(8, 0, 0, 0);
    const onlyScheduledRecipients =
      !body.scheduleAt &&
      recipientSplit.scheduledUserIds.length > 0 &&
      recipientSplit.sendNowUserIds.length === 0;
    const notification = await prisma.notification.create({
      data: clean({
        orgId,
        branchId: body.branchId,
        createdById: userId,
        type: body.type,
        title: body.title,
        body: body.body,
        audience: body.audience,
        pushEnabled: body.pushEnabled,
        scheduledAt: body.scheduleAt
          ? new Date(body.scheduleAt)
          : onlyScheduledRecipients
            ? scheduledFor
            : undefined,
        status: body.scheduleAt || onlyScheduledRecipients ? "SCHEDULED" : "SENT",
        sentAt: body.scheduleAt || onlyScheduledRecipients ? undefined : new Date(),
        metadata: clean({
          selectedUserIds: body.selectedUserIds.length ? body.selectedUserIds : undefined,
          singleUserId: body.singleUserId,
          planId: body.planId,
          branchId: body.branchId,
          daysAhead: body.daysAhead,
          templateId: body.templateId,
          excludeMinors: body.excludeMinors,
          scheduledRecipientCount: recipientSplit.scheduledUserIds.length || undefined,
          scheduledRecipientUserIds: recipientSplit.scheduledUserIds.length
            ? recipientSplit.scheduledUserIds
            : undefined,
          scheduledRecipientsFor: recipientSplit.scheduledUserIds.length
            ? scheduledFor.toISOString()
            : undefined,
          ...(body.metadata ?? {}),
        }) as Prisma.InputJsonValue,
      }),
    });
    if (recipientUserIds.length) {
      await prisma.notificationRecipient.createMany({
        data: [
          ...recipientSplit.sendNowUserIds.map((recipientUserId) => ({
            notificationId: notification.id,
            userId: recipientUserId,
            deliveryStatus: body.scheduleAt ? "scheduled" : "in_app",
            ...(body.scheduleAt ? {} : { deliveredAt: new Date() }),
          })),
          ...recipientSplit.scheduledUserIds.map((recipientUserId) => ({
            notificationId: notification.id,
            userId: recipientUserId,
            deliveryStatus: "scheduled",
          })),
        ],
        skipDuplicates: true,
      });
    }
    if (!body.scheduleAt) {
      await deliverPushForNotification({
        orgId,
        notification: {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          pushEnabled: notification.pushEnabled,
          metadata: notification.metadata,
        },
        userIds: recipientSplit.sendNowUserIds,
      });
    }
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "notification.sent",
      entityType: "notification",
      entityId: notification.id,
      metadata: {
        type: notification.type,
        audience: notification.audience,
        recipients: recipientSplit.sendNowUserIds.length,
        scheduledRecipients: recipientSplit.scheduledUserIds.length,
      },
    });
    return ok({
      notification,
      recipientCount: recipientSplit.sendNowUserIds.length,
      scheduledRecipientCount: recipientSplit.scheduledUserIds.length,
    });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "notifications", "templates"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "NOTIFICATION_CREATE_DRAFT");
    const templates = await prisma.notificationTemplate.findMany({
      where: { orgId, active: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
    const templateIds = new Set(templates.map((template) => template.id));
    const notifications = templateIds.size
      ? await prisma.notification.findMany({
          where: { orgId },
          select: { metadata: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 500,
        })
      : [];
    const usage = notifications.reduce<
      Map<string, { usageCount: number; lastUsedAt: Date | null }>
    >((map, notification) => {
      const templateId = getObjectMetadata(notification.metadata).templateId;
      if (typeof templateId !== "string" || !templateIds.has(templateId)) {
        return map;
      }
      const current = map.get(templateId) ?? { usageCount: 0, lastUsedAt: null };
      current.usageCount += 1;
      if (!current.lastUsedAt || notification.createdAt > current.lastUsedAt) {
        current.lastUsedAt = notification.createdAt;
      }
      map.set(templateId, current);
      return map;
    }, new Map());
    return ok({
      templates: templates.map((template) => ({
        ...template,
        usageCount: usage.get(template.id)?.usageCount ?? 0,
        lastUsedAt: usage.get(template.id)?.lastUsedAt ?? null,
      })),
    });
  }
  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "notifications", "templates"])
  ) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "NOTIFICATION_MANAGE_TEMPLATES");
    const body = z
      .object({
        name: z.string().trim().min(2).max(80),
        type: z.enum([
          "TRANSACTIONAL",
          "OPERATIONAL",
          "PROMOTIONAL",
          "ENGAGEMENT",
          "PLAN",
          "SECURITY",
        ]),
        title: z.string().trim().min(2).max(120),
        body: z.string().trim().min(2).max(1000),
      })
      .parse(await readJson(request));
    const template = await prisma.notificationTemplate.create({
      data: { orgId, createdById: userId, ...body },
    });
    return ok({ template });
  }
  if (
    request.method === "PATCH" &&
    pathMatches(path, ["orgs", /.+/, "notifications", "templates", /.+/])
  ) {
    const orgId = path[1]!;
    const templateId = path[4]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "NOTIFICATION_MANAGE_TEMPLATES");
    const body = z
      .object({
        name: z.string().trim().min(2).max(80).optional(),
        type: z
          .enum(["TRANSACTIONAL", "OPERATIONAL", "PROMOTIONAL", "ENGAGEMENT", "PLAN", "SECURITY"])
          .optional(),
        title: z.string().trim().min(2).max(120).optional(),
        body: z.string().trim().min(2).max(1000).optional(),
        active: z.boolean().optional(),
      })
      .parse(await readJson(request));
    const existing = await prisma.notificationTemplate.findFirst({
      where: { id: templateId, orgId },
    });
    if (!existing) {
      throw notFoundError("Template not found");
    }
    const template = await prisma.notificationTemplate.update({
      where: { id: existing.id },
      data: clean(body),
    });
    return ok({ template });
  }
  if (
    request.method === "DELETE" &&
    pathMatches(path, ["orgs", /.+/, "notifications", "templates", /.+/])
  ) {
    const orgId = path[1]!;
    const templateId = path[4]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "NOTIFICATION_MANAGE_TEMPLATES");
    const existing = await prisma.notificationTemplate.findFirst({
      where: { id: templateId, orgId },
    });
    if (!existing) {
      throw notFoundError("Template not found");
    }
    const template = await prisma.notificationTemplate.update({
      where: { id: existing.id },
      data: { active: false },
    });
    return ok({ template });
  }
  if (
    request.method === "GET" &&
    pathMatches(path, ["orgs", /.+/, "notifications", /.+/, "recipients"])
  ) {
    const orgId = path[1]!;
    const notificationId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "NOTIFICATION_CREATE_DRAFT");
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, orgId },
    });
    if (!notification) {
      throw notFoundError("Notification not found");
    }
    const recipients = await prisma.notificationRecipient.findMany({
      where: { notificationId },
      orderBy: [{ deliveryStatus: "asc" }, { createdAt: "desc" }],
      take: 500,
    });
    const users = recipients.length
      ? await prisma.user.findMany({
          where: { id: { in: recipients.map((recipient) => recipient.userId) } },
          select: { id: true, name: true, email: true, phone: true },
        })
      : [];
    const usersById = new Map(users.map((user) => [user.id, user]));
    return ok({
      notification,
      recipients: recipients.map((recipient) => {
        const user = usersById.get(recipient.userId);
        return {
          ...recipient,
          user: user
            ? {
                id: user.id,
                name: user.name,
                email: publicUserEmail(user.email) ?? "",
                phone: user.phone,
              }
            : null,
        };
      }),
    });
  }
  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "notifications", /.+/, "resend-undelivered"])
  ) {
    const orgId = path[1]!;
    const notificationId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "NOTIFICATION_CREATE_DRAFT");
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, orgId },
    });
    if (!notification) {
      throw notFoundError("Notification not found");
    }
    const recipients = await prisma.notificationRecipient.findMany({
      where: {
        notificationId,
        OR: [
          { deliveryStatus: "failed" },
          { deliveredAt: null, deliveryStatus: { not: "scheduled" } },
        ],
      },
    });
    if (!recipients.length) {
      return ok({ resent: 0 });
    }
    await enforceNotificationBudgets({
      orgId,
      senderUserId: userId,
      type: notification.type,
      recipientUserIds: recipients.map((recipient) => recipient.userId),
    });
    await deliverPushForNotification({
      orgId,
      notification: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        pushEnabled: notification.pushEnabled,
        metadata: notification.metadata,
      },
      userIds: recipients.map((recipient) => recipient.userId),
    });
    await prisma.notificationRecipient.updateMany({
      where: { id: { in: recipients.map((recipient) => recipient.id) } },
      data: { deliveryStatus: "in_app", deliveredAt: new Date() },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "notification.resend_undelivered",
      entityType: "notification",
      entityId: notification.id,
      metadata: { recipients: recipients.length },
    });
    return ok({ resent: recipients.length });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "notifications"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "NOTIFICATION_CREATE_DRAFT");
    const notifications = await prisma.notification.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const notificationIds = notifications.map((notification) => notification.id);
    const creatorIds = notifications
      .map((notification) => notification.createdById)
      .filter((id): id is string => Boolean(id));
    const [recipients, creators] = await Promise.all([
      notificationIds.length
        ? prisma.notificationRecipient.findMany({
            where: { notificationId: { in: notificationIds } },
            select: {
              notificationId: true,
              deliveryStatus: true,
              deliveredAt: true,
              readAt: true,
            },
          })
        : Promise.resolve([]),
      creatorIds.length
        ? prisma.user.findMany({
            where: { id: { in: creatorIds } },
            select: { id: true, name: true, email: true },
          })
        : Promise.resolve([]),
    ]);
    const creatorById = new Map(creators.map((creator) => [creator.id, creator]));
    const recipientStats = recipients.reduce<
      Map<
        string,
        { total: number; delivered: number; read: number; failed: number; scheduled: number }
      >
    >((map, recipient) => {
      const current = map.get(recipient.notificationId) ?? {
        total: 0,
        delivered: 0,
        read: 0,
        failed: 0,
        scheduled: 0,
      };
      current.total += 1;
      if (recipient.deliveredAt || recipient.deliveryStatus === "in_app") current.delivered += 1;
      if (recipient.readAt) current.read += 1;
      if (recipient.deliveryStatus === "failed") current.failed += 1;
      if (recipient.deliveryStatus === "scheduled") current.scheduled += 1;
      map.set(recipient.notificationId, current);
      return map;
    }, new Map());
    return ok({
      notifications: notifications.map((notification) => {
        const creator = notification.createdById ? creatorById.get(notification.createdById) : null;
        return {
          ...notification,
          createdByName: creator?.name ?? creator?.email ?? null,
          recipientStats: recipientStats.get(notification.id) ?? {
            total: 0,
            delivered: 0,
            read: 0,
            failed: 0,
            scheduled: 0,
          },
        };
      }),
    });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "notifications"])) {
    const userId = requireAuth(await getRequestContext(request));
    const recipients = await prisma.notificationRecipient.findMany({
      where: { userId, deliveryStatus: { not: "scheduled" } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const notifications = await prisma.notification.findMany({
      where: { id: { in: recipients.map((recipient) => recipient.notificationId) } },
    });
    return ok({
      notifications: recipients.map((recipient) => ({
        ...recipient,
        notification:
          notifications.find((notification) => notification.id === recipient.notificationId) ??
          null,
      })),
    });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "notifications", /.+/, "read"])) {
    const userId = requireAuth(await getRequestContext(request));
    const record = await prisma.notificationRecipient.findFirst({
      where: { id: path[2]!, userId },
    });
    if (!record) {
      throw notFoundError("Notification not found");
    }
    return ok({
      recipient: await prisma.notificationRecipient.update({
        where: { id: record.id },
        data: { readAt: record.readAt ?? new Date() },
      }),
    });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "notifications", "read"])) {
    const userId = requireAuth(await getRequestContext(request));
    const body = notificationBulkReadSchema.parse(await readJson(request));
    if (!body.ids.length) {
      return ok({ count: 0 });
    }
    const result = await prisma.notificationRecipient.updateMany({
      where: { id: { in: body.ids }, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return ok({ count: result.count });
  }
  if (request.method === "PATCH" && pathMatches(path, ["me", "notification-preferences"])) {
    const userId = requireAuth(await getRequestContext(request));
    const body = notificationPreferenceSchema.parse(await readJson(request));
    const existingPreference = await prisma.userNotificationPreference.findFirst({
      where: { userId, ...(body.orgId ? { orgId: body.orgId } : { orgId: null }) },
    });
    const preference = existingPreference
      ? await prisma.userNotificationPreference.update({
          where: { id: existingPreference.id },
          data: clean({
            transactional: body.transactional,
            operational: body.operational,
            promotional: body.promotional,
            engagement: body.engagement,
            pushEnabled: body.pushEnabled,
          }),
        })
      : await prisma.userNotificationPreference.create({
          data: clean({
            orgId: body.orgId ?? null,
            userId,
            transactional: body.transactional ?? true,
            operational: body.operational ?? true,
            promotional: body.promotional ?? true,
            engagement: body.engagement ?? true,
            pushEnabled: body.pushEnabled ?? false,
          }),
        });
    return ok({ preference });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "notification-preferences"])) {
    const userId = requireAuth(await getRequestContext(request));
    return ok({
      preferences: await prisma.userNotificationPreference.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      }),
    });
  }
  if (request.method === "POST" && pathMatches(path, ["push", "register-device"])) {
    const body = pushRegisterDeviceSchema.parse(await readJson(request));
    const ctx = await getRequestContext(request, body.orgId ? { orgId: body.orgId } : {});
    const userId = requireAuth(ctx);
    assertActiveContextOrg(ctx, body.orgId);
    await assertRateLimit(
      "pushRegisterByActor",
      `${body.orgId ?? "global"}:${userId}`,
      "Too many push device registrations from this account.",
    );
    const provider = getPushProviderOrThrow();
    const registration = await provider.registerDevice({
      userId,
      token: body.token,
      ...(body.orgId ? { organizationId: body.orgId } : {}),
      platform: body.platform,
      ...(body.deviceId ? { deviceId: body.deviceId } : {}),
      ...(body.deviceName ? { deviceName: body.deviceName } : {}),
      ...(body.appVersion ? { appVersion: body.appVersion } : {}),
      environment: body.environment,
    });
    if (registration.status === "invalid_token" || !registration.normalizedToken) {
      throw validationError("Push alerts are not available for this device.");
    }
    const normalizedPlatform =
      body.platform === "ios"
        ? "IOS"
        : body.platform === "android"
          ? "ANDROID"
          : body.platform === "web"
            ? "WEB"
            : "WEB";
    const device = await prisma.pushDevice.upsert({
      where: {
        provider_token: {
          provider: provider.providerName,
          token: registration.normalizedToken,
        },
      },
      update: clean({
        orgId: null,
        userId,
        platform: normalizedPlatform,
        status: "ACTIVE",
        deviceLabel: body.deviceName,
        deviceFingerprint: body.deviceId,
        appVersion: body.appVersion,
        metadata: clean({
          environment: body.environment,
          activeOrgId: body.orgId,
        }) as Prisma.InputJsonValue,
        revokedAt: null,
        lastSeenAt: new Date(),
        lastRegisteredAt: new Date(),
        failureReason: null,
      }),
      create: clean({
        orgId: null,
        userId,
        provider: provider.providerName,
        token: registration.normalizedToken,
        platform: normalizedPlatform,
        status: "ACTIVE",
        deviceLabel: body.deviceName,
        deviceFingerprint: body.deviceId,
        appVersion: body.appVersion,
        metadata: clean({
          environment: body.environment,
          activeOrgId: body.orgId,
        }) as Prisma.InputJsonValue,
        lastSeenAt: new Date(),
        lastRegisteredAt: new Date(),
      }),
    });
    return ok({ device });
  }
  if (request.method === "POST" && pathMatches(path, ["push", "unregister-device"])) {
    const body = pushUnregisterDeviceSchema.parse(await readJson(request));
    if (!body.token) {
      throw validationError("A push token is required to unregister the device.");
    }
    const userId = requireAuth(await getRequestContext(request));
    const device = await prisma.pushDevice.findFirst({
      where: { userId, token: body.token, revokedAt: null },
    });
    if (!device) {
      throw notFoundError("Push device not found");
    }
    const diagnostics = getPushProviderDiagnostics();
    if (
      diagnostics.status !== "misconfigured" &&
      diagnostics.status !== "unsupported" &&
      diagnostics.status !== "disabled"
    ) {
      await getPushProvider().unregisterDevice({ token: device.token });
    }
    await prisma.pushDevice.update({
      where: { id: device.id },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        failureReason: null,
      },
    });
    return ok({ unregistered: true, deviceId: device.id });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "push-devices"])) {
    const userId = requireAuth(await getRequestContext(request));
    return ok({
      devices: await prisma.pushDevice.findMany({
        where: { userId },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      }),
    });
  }
  if (request.method === "DELETE" && pathMatches(path, ["me", "push-devices", /.+/])) {
    const userId = requireAuth(await getRequestContext(request));
    const device = await prisma.pushDevice.findFirst({
      where: { id: path[2]!, userId },
    });
    if (!device) {
      throw notFoundError("Push device not found");
    }
    const diagnostics = getPushProviderDiagnostics();
    if (
      diagnostics.status !== "misconfigured" &&
      diagnostics.status !== "unsupported" &&
      diagnostics.status !== "disabled"
    ) {
      await getPushProvider().unregisterDevice({ token: device.token });
    }
    const updated = await prisma.pushDevice.update({
      where: { id: device.id },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        failureReason: null,
      },
    });
    return ok({ device: updated });
  }
  if (request.method === "POST" && pathMatches(path, ["push", "whatsapp-register"])) {
    const body = whatsappRegisterDeviceSchema.parse(await readJson(request));
    const ctx = await getRequestContext(request, body.orgId ? { orgId: body.orgId } : {});
    const userId = requireAuth(ctx);
    assertActiveContextOrg(ctx, body.orgId);
    await assertRateLimit(
      "pushRegisterByActor",
      `${body.orgId ?? "global"}:${userId}:whatsapp`,
      "Too many WhatsApp registrations from this account.",
    );
    const provider = getWhatsAppProviderOrThrow();
    const registration = await provider.registerDevice({
      userId,
      phone: body.phone,
      ...(body.orgId ? { organizationId: body.orgId } : {}),
      ...(body.deviceId ? { deviceId: body.deviceId } : {}),
      ...(body.deviceName ? { deviceName: body.deviceName } : {}),
      ...(body.locale ? { locale: body.locale } : {}),
      ...(body.timezone ? { timezone: body.timezone } : {}),
    });
    if (registration.status === "invalid_phone" || !registration.normalizedPhone) {
      throw validationError("WhatsApp alerts are not available for this phone number.");
    }
    const device = await prisma.whatsAppDevice.upsert({
      where: {
        provider_phone_userId: {
          provider: provider.providerName,
          phone: registration.normalizedPhone,
          userId,
        },
      },
      update: clean({
        orgId: body.orgId ?? null,
        status: "ACTIVE",
        deviceLabel: body.deviceName,
        deviceFingerprint: body.deviceId,
        locale: body.locale,
        timezone: body.timezone,
        lastSeenAt: new Date(),
        lastRegisteredAt: new Date(),
        optedInAt: new Date(),
        revokedAt: null,
        failureReason: null,
      }),
      create: clean({
        orgId: body.orgId ?? null,
        userId,
        provider: provider.providerName,
        phone: registration.normalizedPhone,
        status: "ACTIVE",
        deviceLabel: body.deviceName,
        deviceFingerprint: body.deviceId,
        locale: body.locale,
        timezone: body.timezone,
        lastSeenAt: new Date(),
        lastRegisteredAt: new Date(),
      }),
    });
    return ok({ device });
  }
  if (request.method === "POST" && pathMatches(path, ["push", "whatsapp-unregister"])) {
    const body = whatsappUnregisterDeviceSchema.parse(await readJson(request));
    const userId = requireAuth(await getRequestContext(request));
    const normalizedPhone = normalizeWhatsAppPhone(body.phone);
    if (!normalizedPhone) {
      throw validationError("Enter a valid WhatsApp phone number.");
    }
    const device = await prisma.whatsAppDevice.findFirst({
      where: { userId, phone: normalizedPhone, revokedAt: null },
    });
    if (!device) {
      throw notFoundError("WhatsApp device not found");
    }
    const diagnostics = getWhatsAppProviderDiagnostics();
    if (
      diagnostics.status !== "misconfigured" &&
      diagnostics.status !== "unsupported" &&
      diagnostics.status !== "disabled"
    ) {
      await getWhatsAppProvider().unregisterDevice({ phone: device.phone });
    }
    const updated = await prisma.whatsAppDevice.update({
      where: { id: device.id },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        failureReason: null,
      },
    });
    return ok({ unregistered: true, device: updated });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "audit-logs"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "PRIVACY_VIEW_AUDIT");
    return ok(await listOrganizationAuditLogsPage(orgId, request));
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "products"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireAuth(ctx);
    if (ctx.orgId !== orgId || !ctx.roles.length) {
      throw forbiddenError("No organization access");
    }
    const branchId = await assertBranchAccessForContext(ctx, orgId, queryBranchId(request));
    return ok({
      products: await prisma.product.findMany({
        where: {
          orgId,
          ...(branchId ? { branchId } : {}),
        },
        orderBy: [{ active: "desc" }, { stock: "asc" }],
      }),
    });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "products"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = assertOrgServicePermission(ctx, orgId, "SHOP_MANAGE_PRODUCTS");
    const body = productInputSchema.parse(await readJson(request));
    const branch = await resolveOrgBranch(orgId, body.branchId);
    const [{ tier, entitlements }, productCount] = await Promise.all([
      getOrgSaasEntitlements(orgId),
      prisma.product.count({ where: { orgId } }),
    ]);
    assertLimitAvailable({
      limit: entitlements.productLimit,
      used: productCount,
      label: "Product",
      tier,
    });
    const imageUrls = await resolveProductImageUrls(orgId, body);
    const product = await prisma.product.create({
      data: clean({
        orgId,
        branchId: branch.id,
        name: body.name,
        description: body.description,
        pricePaise: body.pricePaise,
        stock: body.stock,
        category: body.category,
        lowStockThreshold: body.lowStockThreshold,
        imageUrl: imageUrls[0],
        imageUrls: imageUrls.length ? (imageUrls as Prisma.InputJsonValue) : undefined,
        active: body.active,
      }),
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "product.created",
      entityType: "product",
      entityId: product.id,
    });
    return ok({ product });
  }
  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "products", /.+/])) {
    const orgId = path[1]!;
    const productId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = assertOrgServicePermission(ctx, orgId, "SHOP_MANAGE_PRODUCTS");
    const body = productInputSchema.partial().parse(await readJson(request));
    const existingProduct = await prisma.product.findFirst({ where: { id: productId, orgId } });
    const branch =
      body.branchId !== undefined ? await resolveOrgBranch(orgId, body.branchId) : null;
    if (!existingProduct) {
      throw notFoundError("Product not found");
    }
    const imageUrls = hasProductImageInput(body)
      ? await resolveProductImageUrls(orgId, body)
      : null;
    const product = await prisma.product.update({
      where: { id: existingProduct.id },
      data: clean({
        branchId: branch?.id,
        name: body.name,
        description: sanitizeRichText(body.description),
        category: body.category,
        pricePaise: body.pricePaise,
        stock: body.stock,
        lowStockThreshold: body.lowStockThreshold,
        imageUrl: imageUrls ? (imageUrls[0] ?? null) : undefined,
        imageUrls: imageUrls
          ? ((imageUrls.length ? imageUrls : Prisma.JsonNull) as Prisma.InputJsonValue)
          : undefined,
        active: body.active,
      }),
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "product.updated",
      entityType: "product",
      entityId: product.id,
    });
    return ok({ product });
  }
  if (request.method === "DELETE" && pathMatches(path, ["orgs", /.+/, "products", /.+/])) {
    const orgId = path[1]!;
    const productId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = assertOrgServicePermission(ctx, orgId, "SHOP_MANAGE_PRODUCTS");
    const existingProduct = await prisma.product.findFirst({ where: { id: productId, orgId } });
    if (!existingProduct) {
      throw notFoundError("Product not found");
    }
    const [orderItemCount, movementCount] = await Promise.all([
      prisma.shopOrderItem.count({ where: { orgId, productId: existingProduct.id } }),
      prisma.inventoryMovement.count({ where: { orgId, productId: existingProduct.id } }),
    ]);
    if (orderItemCount > 0 || movementCount > 0) {
      throw conflictError(
        "This product has order or inventory history. Archive it instead of deleting.",
      );
    }
    await prisma.product.delete({ where: { id: existingProduct.id } });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "product.deleted",
      entityType: "product",
      entityId: existingProduct.id,
      metadata: { name: existingProduct.name },
    });
    return ok({ deleted: true });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "inventory", "adjust"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = assertOrgServicePermission(ctx, orgId, "SHOP_MANAGE_PRODUCTS");
    const body = inventoryAdjustmentSchema.parse(await readJson(request));
    const existingProduct = await prisma.product.findFirst({
      where: { id: body.productId, orgId },
    });
    if (!existingProduct) {
      throw notFoundError("Product not found");
    }
    if (existingProduct.stock + body.delta < 0) {
      throw conflictError("Inventory adjustment would result in negative stock.");
    }
    const [product, movement] = await prisma.$transaction([
      prisma.product.update({
        where: { id: existingProduct.id },
        data: { stock: { increment: body.delta } },
      }),
      prisma.inventoryMovement.create({
        data: {
          orgId,
          branchId: existingProduct.branchId,
          productId: existingProduct.id,
          delta: body.delta,
          reason: body.reason,
          createdById: userId,
        },
      }),
    ]);
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "inventory.adjusted",
      entityType: "inventory_movement",
      entityId: movement.id,
      metadata: { productId: existingProduct.id, delta: body.delta, reason: body.reason },
    });
    return ok({ product, movement });
  }
  if (request.method === "POST" && pathMatches(path, ["shop", "orders"])) {
    const userId = requireAuth(await getRequestContext(request));
    const body = shopOrderSchema.parse(await readJson(request));
    getPaymentProviderOrThrow();
    const [products, user] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: body.items.map((item) => item.productId) }, orgId: body.orgId },
      }),
      prisma.user.findUnique({ where: { id: userId } }),
    ]);
    const inferredBranchId =
      body.branchId ?? products.find((product) => product.branchId)?.branchId;
    const branch = await resolveOrgBranch(body.orgId, inferredBranchId);
    if (products.some((product) => product.branchId && product.branchId !== branch.id)) {
      throw validationError("Shop products must belong to the selected branch.");
    }
    const calculation = calculateShopOrder({
      products: products.map((product) => ({
        id: product.id,
        stock: product.stock,
        pricePaise: product.pricePaise,
        active: product.active,
      })),
      items: body.items,
    });
    const order = await prisma.shopOrder.create({
      data: { orgId: body.orgId, branchId: branch.id, userId, totalPaise: calculation.totalPaise },
    });
    await prisma.shopOrderItem.createMany({
      data: body.items.map((item) => ({
        orgId: body.orgId,
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPaise: products.find((product) => product.id === item.productId)?.pricePaise ?? 0,
      })),
    });
    const session = await prisma.paymentSession.create({
      data: {
        orgId: body.orgId,
        branchId: branch.id,
        userId,
        purpose: "SHOP_ORDER",
        amountPaise: calculation.totalPaise,
        checkoutUrl: "",
        provider: getPaymentProviderDiagnostics().selectedProvider,
        metadata: { shopOrderId: order.id, branchId: branch.id },
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
    let started;
    try {
      started = await startPaymentSessionCheckout({
        session,
        customer: clean({
          name: user?.name ?? undefined,
          email: publicUserEmail(user?.email),
          phone: user?.phone ?? undefined,
        }),
      });
      await prisma.shopOrder.update({
        where: { id: order.id },
        data: { paymentSessionId: session.id },
      });
    } catch (error) {
      await prisma.$transaction([
        prisma.paymentSession.update({
          where: { id: session.id },
          data: { status: "FAILED", completedAt: new Date() },
        }),
        prisma.shopOrder.update({
          where: { id: order.id },
          data: { status: "CANCELLED", paymentSessionId: session.id },
        }),
      ]);
      throw error;
    }
    return ok({
      order,
      checkoutUrl: started.checkoutUrl,
      checkoutData: started.checkout.checkoutData ?? null,
      session: started.session,
    });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "shop", "orders"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "SHOP_FULFILL_ORDER");
    const branchId = await assertBranchAccessForContext(ctx, orgId, queryBranchId(request));
    const orders = await prisma.shopOrder.findMany({
      where: { orgId, ...(branchId ? { branchId } : {}) },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const items = await prisma.shopOrderItem.findMany({
      where: { orderId: { in: orders.map((order) => order.id) } },
    });
    return ok({
      orders: orders.map((order) => ({
        ...order,
        items: items.filter((item) => item.orderId === order.id),
      })),
    });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "shop", "orders", "active"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "SHOP_FULFILL_ORDER");
    const branchId = await assertBranchAccessForContext(ctx, orgId, queryBranchId(request));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [orders, fulfilledToday] = await Promise.all([
      getOrganizationActiveShopOrders(orgId, clean({ branchId })),
      prisma.shopOrder.count({
        where: {
          orgId,
          status: "FULFILLED",
          fulfilledAt: { gte: today },
          ...(branchId ? { branchId } : {}),
        },
      }),
    ]);
    return ok({ orders, summary: { fulfilledToday } });
  }
  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "shop", "orders", /.+/, "fulfill"])
  ) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "SHOP_FULFILL_ORDER");
    const existingOrder = await prisma.shopOrder.findFirst({ where: { id: path[4]!, orgId } });
    if (!existingOrder) {
      throw notFoundError("Shop order not found");
    }
    await assertBranchAccessForContext(ctx, orgId, existingOrder.branchId);
    const fulfillBody = z
      .object({
        pickupCodeSkipped: z.boolean().optional(),
        skipReason: z.string().trim().max(200).optional(),
      })
      .parse(await readJson(request).catch(() => ({})));
    const fulfilled = fulfillShopOrderForContext({
      ctx,
      orgId,
      order: {
        id: existingOrder.id,
        status: existingOrder.status,
        totalPaise: existingOrder.totalPaise,
        ...(existingOrder.pickupCode ? { pickupCode: existingOrder.pickupCode } : {}),
      },
    });
    const order = await prisma.shopOrder.update({
      where: { id: existingOrder.id },
      data: { status: fulfilled.status, fulfilledById: userId, fulfilledAt: new Date() },
    });
    await prisma.pickupCode.updateMany({
      where: { orderId: existingOrder.id },
      data: { status: fulfilled.status, fulfilledAt: new Date() },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "shop_order.fulfilled",
      entityType: "shop_order",
      entityId: order.id,
      metadata: {
        pickupCodeSkipped: Boolean(fulfillBody.pickupCodeSkipped),
        skipReason: fulfillBody.skipReason ?? null,
      },
    });
    await createDirectNotification({
      orgId,
      createdById: userId,
      type: "TRANSACTIONAL",
      title: "Pickup completed",
      body: "Your shop order has been marked as picked up.",
      audience: "single_member",
      metadata: {
        shopOrderId: order.id,
        branchId: order.branchId,
        status: order.status,
      },
      userIds: [order.userId],
    });
    return ok({ order });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "guardian-consent"])) {
    requireAuth(await getRequestContext(request));
    return ok({
      deprecated: true,
      message: "Guardian consent is no longer required for membership, attendance, plans, or PT.",
      consents: [],
      challenges: [],
    });
  }
  if (
    request.method === "POST" &&
    (pathMatches(path, ["me", "guardian-consent", "request"]) ||
      pathMatches(path, ["me", "guardian-consent", "resend"]) ||
      pathMatches(path, ["me", "guardian-consent", "verify"]))
  ) {
    requireAuth(await getRequestContext(request));
    return ok({
      deprecated: true,
      message: "Guardian consent is no longer required for membership, attendance, plans, or PT.",
    });
  }
  if (
    request.method === "GET" &&
    pathMatches(path, ["guardian-consent", /.+/])
  ) {
    return ok({
      deprecated: true,
      message: "Guardian consent links are deprecated because guardian approval is no longer required.",
    });
  }
  if (
    request.method === "POST" &&
    (pathMatches(path, ["guardian-consent", /.+/, "verify"]) ||
      pathMatches(path, ["guardian-consent", /.+/, "resend"]))
  ) {
    return ok({
      deprecated: true,
      message: "Guardian consent links are deprecated because guardian approval is no longer required.",
    });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "consents"])) {
    const userId = requireAuth(await getRequestContext(request));
    const [consents, guardianConsents, exportRequests, exportJobs, deletionRequests, deletionJobs] =
      await Promise.all([
        prisma.consentRecord.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
        prisma.guardianConsent.findMany({
          where: { minorUserId: userId },
          orderBy: { createdAt: "desc" },
        }),
        prisma.dataExportRequest.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
        prisma.dataExportJob.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
        prisma.accountDeletionRequest.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        }),
        prisma.accountDeletionJob.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
      ]);
    return ok({
      consents,
      guardianConsents,
      exportRequests,
      exportJobs,
      deletionRequests,
      deletionJobs,
    });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "data-export-request"])) {
    const ctx = await getRequestContext(request);
    assertNotImpersonating(ctx, "Data export");
    const userId = requireAuth(ctx);
    await assertRateLimit(
      "privacyRequestByActor",
      `${ctx.orgId ?? "global"}:${userId}:export`,
      "Too many data export requests from this account.",
    );
    const existing = await prisma.dataExportRequest.findFirst({
      where: { userId, status: { in: ["requested", "processing", "ready"] } },
      orderBy: { createdAt: "desc" },
    });
    if (existing) {
      throw conflictError("A data export request is already in progress or ready for download.");
    }
    const exportRequest = await prisma.dataExportRequest.create({
      data: clean({
        orgId: ctx.orgId,
        userId,
        requestId: currentRequestId(),
        status: "requested",
      }),
    });
    const exportJob = await prisma.dataExportJob.create({
      data: clean({
        requestId: exportRequest.id,
        orgId: ctx.orgId,
        userId,
        status: "RUNNING",
        format: "JSON",
        requestedById: userId,
        startedAt: new Date(),
      }),
    });
    let completedRequest = exportRequest;
    let completedJob = exportJob;
    try {
      const generated = await generateUserDataExport({
        userId,
        ...(ctx.orgId ? { orgId: ctx.orgId } : {}),
      });
      completedJob = await prisma.dataExportJob.update({
        where: { id: exportJob.id },
        data: {
          status: "SUCCEEDED",
          fileAssetId: generated.fileAssetId,
          exportUrl: generated.exportUrl,
          checksum: generated.checksum,
          recordCount: generated.recordCount,
          completedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      completedRequest = await prisma.dataExportRequest.update({
        where: { id: exportRequest.id },
        data: {
          status: "ready",
          latestJobId: completedJob.id,
          exportUrl: generated.exportUrl,
          processedById: userId,
          processedAt: new Date(),
          completedAt: new Date(),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export generation failed";
      completedJob = await prisma.dataExportJob.update({
        where: { id: exportJob.id },
        data: {
          status: "FAILED",
          errorMessage: message,
          completedAt: new Date(),
        },
      });
      completedRequest = await prisma.dataExportRequest.update({
        where: { id: exportRequest.id },
        data: {
          status: "failed",
          latestJobId: completedJob.id,
          failureReason: message,
          processedById: userId,
          processedAt: new Date(),
        },
      });
    }
    await prisma.consentRecord.create({
      data: clean({
        orgId: ctx.orgId,
        userId,
        type: "DATA_EXPORT",
        status: completedJob.status === "SUCCEEDED" ? "GRANTED" : "PENDING",
        recordedById: userId,
        metadata: { exportRequestId: exportRequest.id } as Prisma.InputJsonValue,
      }),
    });
    await writeAuditLog({
      request,
      actorUserId: userId,
      action: "privacy.data_export_requested",
      entityType: "data_export_request",
      entityId: exportRequest.id,
      ...(ctx.orgId ? { orgId: ctx.orgId } : {}),
    });
    return ok({ request: completedRequest, job: completedJob });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "account-deletion-request"])) {
    const ctx = await getRequestContext(request);
    assertNotImpersonating(ctx, "Account deletion");
    const userId = requireAuth(ctx);
    await assertRateLimit(
      "privacyRequestByActor",
      `${ctx.orgId ?? "global"}:${userId}:deletion`,
      "Too many account deletion requests from this account.",
    );
    const existing = await prisma.accountDeletionRequest.findFirst({
      where: { userId, status: { in: ["requested", "processing", "scheduled"] } },
      orderBy: { createdAt: "desc" },
    });
    if (existing) {
      throw conflictError("An account deletion request is already open for this account.");
    }
    const deletionRequest = await prisma.accountDeletionRequest.create({
      data: clean({
        orgId: ctx.orgId,
        userId,
        requestId: currentRequestId(),
        status: "requested",
      }),
    });
    const retentionDays = Math.max(1, Number(process.env.ACCOUNT_DELETION_RETENTION_DAYS ?? 30));
    const scheduledFor = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);
    const deletionJob = await prisma.accountDeletionJob.create({
      data: clean({
        requestId: deletionRequest.id,
        orgId: ctx.orgId,
        userId,
        status: "QUEUED",
        requestedById: userId,
        scheduledFor,
        retentionUntil: scheduledFor,
      }),
    });
    const updatedRequest = await prisma.accountDeletionRequest.update({
      where: { id: deletionRequest.id },
      data: {
        latestJobId: deletionJob.id,
        scheduledFor: deletionJob.scheduledFor,
      },
    });
    await prisma.consentRecord.create({
      data: clean({
        orgId: ctx.orgId,
        userId,
        type: "ACCOUNT_DELETION",
        status: "PENDING",
        recordedById: userId,
        metadata: { accountDeletionRequestId: deletionRequest.id } as Prisma.InputJsonValue,
      }),
    });
    await writeAuditLog({
      request,
      actorUserId: userId,
      action: "privacy.account_deletion_requested",
      entityType: "account_deletion_request",
      entityId: deletionRequest.id,
      ...(ctx.orgId ? { orgId: ctx.orgId } : {}),
    });
    return ok({ request: updatedRequest, job: deletionJob });
  }
  if (request.method === "GET" && pathMatches(path, ["platform", "users"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    const users = await prisma.user.findMany({
      where:
        query.length >= 2
          ? {
              deletedAt: null,
              OR: [
                { email: { contains: query, mode: "insensitive" } },
                { phone: { contains: query } },
                { name: { contains: query, mode: "insensitive" } },
              ],
            }
          : { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: query.length >= 2 ? 25 : 50,
    });
    return ok({ users: users.map(serializeUserForClient) });
  }
  if (request.method === "GET" && pathMatches(path, ["platform", "users", /.+/])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    const userId = path[2]!;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw notFoundError("User not found");
    }
    const [sessions, memberships, roleAssignments, orgs, payments, auditLogs] = await Promise.all([
      prisma.userSession.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 25,
      }),
      prisma.organizationUser.findMany({ where: { userId }, orderBy: { joinedAt: "desc" } }),
      prisma.organizationRoleAssignment.findMany({ where: { userId } }),
      prisma.organization.findMany({
        where: {
          id: {
            in: (
              await prisma.organizationUser.findMany({ where: { userId }, select: { orgId: true } })
            ).map((item) => item.orgId),
          },
        },
      }),
      prisma.payment.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 25,
      }),
      prisma.auditLog.findMany({
        where: { OR: [{ actorUserId: userId }, { entityId: userId }] },
        orderBy: { createdAt: "desc" },
        take: 25,
      }),
    ]);
    const orgById = new Map(orgs.map((org) => [org.id, org]));
    return ok({
      user: serializeUserForClient(user),
      sessions,
      organizations: memberships.map((membership) => ({
        ...membership,
        organization: orgById.get(membership.orgId) ?? null,
        roles: roleAssignments
          .filter((assignment) => assignment.orgId === membership.orgId)
          .map((assignment) => assignment.role),
      })),
      payments,
      auditLogs,
    });
  }
  if (
    request.method === "POST" &&
    pathMatches(path, ["platform", "users", /.+/, "sessions", "revoke"])
  ) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    assertNotImpersonating(ctx, "Session revocation");
    const targetUserId = path[2]!;
    const body = z.object({ sessionId: z.string().optional() }).parse(await readJson(request).catch(() => ({})));
    const result = await prisma.userSession.updateMany({
      where: { userId: targetUserId, ...(body.sessionId ? { id: body.sessionId } : {}) },
      data: { revokedAt: new Date() },
    });
    await writeAuditLog({
      request,
      actorUserId,
      action: "platform.user_sessions_revoked",
      entityType: "user",
      entityId: targetUserId,
      riskLevel: "HIGH",
      metadata: { count: result.count, sessionId: body.sessionId ?? null },
    });
    return ok({ revoked: result.count });
  }
  if (request.method === "POST" && pathMatches(path, ["platform", "users", /.+/, "impersonate"])) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    assertNotImpersonating(ctx, "Starting impersonation");
    if (!(await isFeatureFlagEnabled("platform.impersonation"))) {
      throw forbiddenError("Platform impersonation is disabled.");
    }
    const targetUserId = path[2]!;
    const body = platformImpersonateSchema.parse(await readJson(request));
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      throw notFoundError("User not found");
    }
    if (targetUser.isPlatformAdmin) {
      throw forbiddenError("Platform admins cannot be impersonated.");
    }
    const expiresAt = new Date(Date.now() + body.ttlMinutes * 60 * 1000);
    const impersonation = await prisma.impersonationSession.create({
      data: {
        platformAdminUserId: actorUserId,
        targetUserId,
        targetOrgId: body.targetOrgId ?? null,
        reason: body.reason,
        expiresAt,
        ipHash: sha256(getClientIp(request)),
        userAgentHash: sha256(request.headers.get("user-agent") ?? "unknown-user-agent"),
      },
    });
    const token = AuthService.createToken();
    const userAgent = request.headers.get("user-agent") ?? undefined;
    const ipAddress = getClientIp(request);
    await prisma.userSession.create({
      data: clean({
        userId: targetUserId,
        originalUserId: actorUserId,
        impersonationSessionId: impersonation.id,
        tokenHash: AuthService.hash(token),
        expiresAt,
        userAgent,
        ipAddress,
        deviceFingerprintHash: AuthService.createDeviceFingerprint(clean({ userAgent, ipAddress })),
        lastSeenAt: new Date(),
      }),
    });
    await writeAuditLog({
      request,
      actorUserId,
      action: "platform.impersonation_started",
      entityType: "impersonation_session",
      entityId: impersonation.id,
      riskLevel: "CRITICAL",
      metadata: { targetUserId, targetOrgId: body.targetOrgId ?? null, ttlMinutes: body.ttlMinutes },
    });
    const response = ok({ impersonation, token, expiresAt });
    response.cookies.set(sessionCookieName, token, {
      ...sharedSessionCookieOptions(request, expiresAt),
    });
    return response;
  }
  if (
    request.method === "POST" &&
    pathMatches(path, ["platform", "impersonations", /.+/, "end"])
  ) {
    const ctx = await getRequestContext(request);
    const actorUserId = requireAuth(ctx);
    const impersonationId = path[2]!;
    const impersonation = await prisma.impersonationSession.findUnique({
      where: { id: impersonationId },
    });
    if (!impersonation) {
      throw notFoundError("Impersonation session not found");
    }
    const canEnd =
      ctx.impersonationSessionId === impersonationId ||
      (ctx.isPlatformAdmin && ctx.userId === impersonation.platformAdminUserId);
    if (!canEnd) {
      throw forbiddenError("Cannot end this impersonation session.");
    }
    const ended = await prisma.impersonationSession.update({
      where: { id: impersonationId },
      data: { endedAt: new Date() },
    });
    await prisma.userSession.updateMany({
      where: { impersonationSessionId: impersonationId },
      data: { revokedAt: new Date() },
    });
    await writeAuditLog({
      request,
      actorUserId: ctx.originalUserId ?? actorUserId,
      action: "platform.impersonation_ended",
      entityType: "impersonation_session",
      entityId: impersonationId,
      riskLevel: "HIGH",
      metadata: { targetUserId: impersonation.targetUserId },
    });
    const response = ok({ impersonation: ended });
    if (ctx.originalUserId) {
      const token = AuthService.createToken();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const userAgent = request.headers.get("user-agent") ?? undefined;
      const ipAddress = getClientIp(request);
      await prisma.userSession.create({
        data: clean({
          userId: ctx.originalUserId,
          tokenHash: AuthService.hash(token),
          expiresAt,
          userAgent,
          ipAddress,
          deviceFingerprintHash: AuthService.createDeviceFingerprint(clean({ userAgent, ipAddress })),
          lastSeenAt: new Date(),
        }),
      });
      response.cookies.set(sessionCookieName, token, {
        ...sharedSessionCookieOptions(request, expiresAt),
      });
    }
    return response;
  }
  if (request.method === "GET" && pathMatches(path, ["platform", "impersonations"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    return ok({
      impersonations: await prisma.impersonationSession.findMany({
        orderBy: { startedAt: "desc" },
        take: 100,
      }),
    });
  }
  if (request.method === "GET" && pathMatches(path, ["platform", "payments"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    const q = request.nextUrl.searchParams.get("q")?.trim();
    const userIds = q
      ? (
          await prisma.user.findMany({
            where: {
              OR: [
                { email: { contains: q, mode: "insensitive" } },
                { phone: { contains: q } },
                { name: { contains: q, mode: "insensitive" } },
              ],
            },
            select: { id: true },
            take: 25,
          })
        ).map((user) => user.id)
      : [];
    const amountPaise = q && /^\d+(\.\d{1,2})?$/.test(q) ? Math.round(Number(q) * 100) : null;
    const payments = await prisma.payment.findMany({
      where: q
        ? {
            OR: [
              { id: { contains: q } },
              { providerRef: { contains: q } },
              { receiptNumber: { contains: q, mode: "insensitive" } },
              ...(userIds.length ? [{ userId: { in: userIds } }] : []),
              ...(amountPaise ? [{ amountPaise }] : []),
            ],
          }
        : {},
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return ok({ payments });
  }
  if (request.method === "GET" && pathMatches(path, ["platform", "payments", /.+/])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    const paymentId = path[2]!;
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      throw notFoundError("Payment not found");
    }
    const [events, refunds, user, org] = await Promise.all([
      prisma.paymentEvent.findMany({
        where: { paymentId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.paymentRefund.findMany({ where: { paymentId }, orderBy: { createdAt: "desc" } }),
      payment.userId ? prisma.user.findUnique({ where: { id: payment.userId } }) : null,
      payment.orgId ? prisma.organization.findUnique({ where: { id: payment.orgId } }) : null,
    ]);
    const attempts = events.length
      ? await prisma.paymentWebhookAttempt.findMany({
          where: { paymentEventId: { in: events.map((event) => event.id) } },
          orderBy: { startedAt: "desc" },
        })
      : [];
    return ok({
      payment,
      user: user ? serializeUserForClient(user) : null,
      organization: org,
      refunds,
      events: events.map((event) => ({
        ...event,
        attempts: attempts.filter((attempt) => attempt.paymentEventId === event.id),
      })),
    });
  }
  if (request.method === "POST" && pathMatches(path, ["platform", "payments", /.+/, "refund"])) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    assertNotImpersonating(ctx, "Platform refund");
    const body = paymentRefundSchema.parse(await readJson(request).catch(() => ({})));
    return ok(
      await refundPaymentForActor({
        request,
        paymentId: path[2]!,
        actorUserId,
        reason: body.reason,
        ...(body.amountPaise ? { amountPaise: body.amountPaise } : {}),
        platformRefund: true,
      }),
    );
  }
  if (request.method === "GET" && pathMatches(path, ["platform", "webhooks"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    const status = request.nextUrl.searchParams.get("status") || undefined;
    const provider = request.nextUrl.searchParams.get("provider") || undefined;
    const orgId = request.nextUrl.searchParams.get("org") || undefined;
    const eventIds =
      provider || orgId
        ? (
            await prisma.paymentEvent.findMany({
              where: clean({ provider, orgId }),
              select: { id: true },
              take: 500,
            })
          ).map((event) => event.id)
        : [];
    const attempts = await prisma.paymentWebhookAttempt.findMany({
      where: clean({
        status: status as Prisma.PaymentWebhookAttemptWhereInput["status"],
        ...(provider || orgId ? { paymentEventId: { in: eventIds } } : {}),
      }),
      orderBy: { startedAt: "desc" },
      take: 100,
    });
    return ok({ attempts });
  }
  if (request.method === "POST" && pathMatches(path, ["platform", "webhooks", /.+/, "replay"])) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    const attempt = await prisma.paymentWebhookAttempt.findUnique({ where: { id: path[2]! } });
    if (!attempt) {
      throw notFoundError("Webhook attempt not found");
    }
    const event = await prisma.paymentEvent.findUnique({ where: { id: attempt.paymentEventId } });
    if (!event) {
      throw notFoundError("Payment event not found");
    }
    const provider = getPaymentProvider();
    let parsed: ParsedPaymentWebhookEvent | null = null;
    if (!event.eventType.startsWith("refund.")) {
      try {
        parsed =
          event.payload && provider.providerName === event.provider
            ? await provider.parseWebhookEvent({
                rawBody: JSON.stringify(event.payload),
                headers: (event.headers ?? {}) as Record<string, string>,
                ...(event.signature ? { signature: event.signature } : {}),
              })
            : null;
      } catch {
        parsed = null;
      }
    }
    if (event.eventType.startsWith("refund.")) {
      const rawPayload = jsonObject(event.payload);
      const payload = jsonObject(rawPayload.payload as Prisma.JsonValue);
      const refundPayload = jsonObject(payload.refund as Prisma.JsonValue);
      const refundEntity = jsonObject(refundPayload.entity as Prisma.JsonValue);
      parsed = {
        provider: event.provider,
        providerEventId: event.providerEventId,
        eventType: event.eventType,
        paymentStatus: event.eventType === "refund.processed" ? "REFUNDED" : "PENDING",
        ...(typeof refundEntity.payment_id === "string"
          ? { providerPaymentId: refundEntity.payment_id }
          : {}),
        ...(typeof refundEntity.amount === "number" ? { amountPaise: refundEntity.amount } : {}),
        ...(typeof refundEntity.currency === "string" ? { currency: refundEntity.currency } : {}),
        rawPayload,
      };
    }
    const nextAttemptNo = event.attemptCount + 1;
    const replay = await prisma.paymentWebhookAttempt.create({
      data: {
        paymentEventId: event.id,
        attemptNo: nextAttemptNo,
        status: "PENDING",
        processor: "platform-replay",
        startedAt: new Date(),
        result: { replayedById: actorUserId, originalAttemptId: attempt.id },
      },
    });
    await prisma.paymentEvent.update({
      where: { id: event.id },
      data: { attemptCount: nextAttemptNo, lastAttemptAt: replay.startedAt },
    });
    await processVerifiedPaymentWebhookEvent({
      event,
      attempt: replay,
      parsed,
      providerEventId: event.providerEventId,
      startedAt: replay.startedAt.getTime(),
    });
    const processedReplay = await prisma.paymentWebhookAttempt.findUniqueOrThrow({
      where: { id: replay.id },
    });
    await writeAuditLog({
      request,
      ...(event.orgId ? { orgId: event.orgId } : {}),
      actorUserId,
      action: "platform.webhook_replayed",
      entityType: "payment_webhook_attempt",
      entityId: attempt.id,
      riskLevel: "HIGH",
      metadata: {
        replayAttemptId: replay.id,
        paymentEventId: event.id,
        status: processedReplay.status,
      },
    });
    return ok({ attempt: processedReplay });
  }
  if (request.method === "GET" && pathMatches(path, ["platform", "audit"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    const { limit, cursor } = parseCursorPagination(request, 100, 200);
    const orgId = request.nextUrl.searchParams.get("org") || undefined;
    const userId = request.nextUrl.searchParams.get("user") || undefined;
    const riskLevel = request.nextUrl.searchParams.get("risk") || undefined;
    const logs = await prisma.auditLog.findMany({
      where: clean({
        orgId,
        actorUserId: userId,
        riskLevel: riskLevel as Prisma.AuditLogWhereInput["riskLevel"],
      }),
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const page = pageResult(logs, limit);
    return ok({ auditLogs: page.items, nextCursor: page.nextCursor, limit });
  }
  if (request.method === "GET" && pathMatches(path, ["platform", "broadcasts"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    return ok({
      broadcasts: await prisma.platformBroadcast.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    });
  }
  if (request.method === "POST" && pathMatches(path, ["platform", "broadcasts"])) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    const body = platformBroadcastSchema.parse(await readJson(request));
    const broadcast = await prisma.platformBroadcast.create({
      data: clean({
        ...body,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        publishedAt: body.status === "LIVE" ? new Date() : undefined,
        createdByUserId: actorUserId,
      }),
    });
    const fanout =
      broadcast.status === "LIVE"
        ? await fanOutPlatformBroadcast({
            broadcast: {
              id: broadcast.id,
              title: broadcast.title,
              body: broadcast.body,
              severity: broadcast.severity,
              targetOrgIds: broadcast.targetOrgIds,
              targetRoles: broadcast.targetRoles as OrgRole[],
              createdByUserId: broadcast.createdByUserId,
            },
          })
        : null;
    await writeAuditLog({
      request,
      actorUserId,
      action: "platform.broadcast_created",
      entityType: "platform_broadcast",
      entityId: broadcast.id,
      metadata: { status: broadcast.status, severity: broadcast.severity, fanout },
    });
    return ok({ broadcast, fanout });
  }
  if (request.method === "PATCH" && pathMatches(path, ["platform", "broadcasts", /.+/])) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    const body = platformBroadcastSchema.partial().parse(await readJson(request));
    const previous = await prisma.platformBroadcast.findUnique({ where: { id: path[2]! } });
    if (!previous) {
      throw notFoundError("Broadcast not found");
    }
    const broadcast = await prisma.platformBroadcast.update({
      where: { id: path[2]! },
      data: clean({
        ...body,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        ...(body.status === "LIVE" ? { publishedAt: new Date() } : {}),
      }),
    });
    const fanout =
      body.status === "LIVE" && previous.status !== "LIVE"
        ? await fanOutPlatformBroadcast({
            broadcast: {
              id: broadcast.id,
              title: broadcast.title,
              body: broadcast.body,
              severity: broadcast.severity,
              targetOrgIds: broadcast.targetOrgIds,
              targetRoles: broadcast.targetRoles as OrgRole[],
              createdByUserId: broadcast.createdByUserId,
            },
          })
        : null;
    await writeAuditLog({
      request,
      actorUserId,
      action: "platform.broadcast_updated",
      entityType: "platform_broadcast",
      entityId: broadcast.id,
      metadata: { status: broadcast.status, fanout },
    });
    return ok({ broadcast, fanout });
  }
  if (request.method === "DELETE" && pathMatches(path, ["platform", "broadcasts", /.+/])) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    const broadcast = await prisma.platformBroadcast.delete({ where: { id: path[2]! } });
    await writeAuditLog({
      request,
      actorUserId,
      action: "platform.broadcast_deleted",
      entityType: "platform_broadcast",
      entityId: broadcast.id,
    });
    return ok({ deleted: true });
  }
  if (request.method === "GET" && pathMatches(path, ["platform", "flags"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    const flags = await prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
    const defaults = [
      {
        key: "ai.assistant",
        enabled: false,
        description: "Allow AI assistant chat requests without redeploying.",
        rolloutPercent: 0,
        overrideOrgIds: [],
        updatedAt: new Date(),
        updatedByUserId: null,
      },
      {
        key: "platform.impersonation",
        enabled: false,
        description: "Allow platform admins to start audited support impersonation sessions.",
        rolloutPercent: 0,
        overrideOrgIds: [],
        updatedAt: new Date(),
        updatedByUserId: null,
      },
    ];
    const existingKeys = new Set(flags.map((flag) => flag.key));
    return ok({
      flags: [...flags, ...defaults.filter((flag) => !existingKeys.has(flag.key))],
    });
  }
  if (request.method === "PATCH" && pathMatches(path, ["platform", "flags"])) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    const body = platformFlagPatchSchema.parse(await readJson(request));
    const flag = await prisma.featureFlag.upsert({
      where: { key: body.key },
      create: clean({
        key: body.key,
        enabled: body.enabled ?? false,
        description: body.description,
        rolloutPercent: body.rolloutPercent ?? 0,
        overrideOrgIds: body.overrideOrgIds ?? [],
        updatedByUserId: actorUserId,
      }),
      update: clean({
        enabled: body.enabled,
        description: body.description,
        rolloutPercent: body.rolloutPercent,
        overrideOrgIds: body.overrideOrgIds,
        updatedByUserId: actorUserId,
      }),
    });
    await writeAuditLog({
      request,
      actorUserId,
      action: "platform.feature_flag_updated",
      entityType: "feature_flag",
      entityId: flag.key,
      riskLevel: flag.key === "platform.impersonation" ? "CRITICAL" : "HIGH",
      metadata: { enabled: flag.enabled, rolloutPercent: flag.rolloutPercent },
    });
    return ok({ flag });
  }
  if (request.method === "GET" && pathMatches(path, ["platform", "saas-pricing"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    const planCatalog = await getSaasPlanCatalog();
    return ok({ pricing: pricingFromPlanCatalog(planCatalog), planCatalog });
  }
  if (request.method === "PATCH" && pathMatches(path, ["platform", "saas-pricing"])) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    const body = platformSaasPricingSchema.parse(await readJson(request));
    const setting = await prisma.platformSetting.upsert({
      where: { key: "saas.pricing" },
      create: {
        key: "saas.pricing",
        value: body as Prisma.InputJsonValue,
        updatedById: actorUserId,
      },
      update: {
        value: body as Prisma.InputJsonValue,
        updatedById: actorUserId,
      },
    });
    await writeAuditLog({
      request,
      actorUserId,
      action: "platform.saas_pricing_updated",
      entityType: "platform_setting",
      entityId: setting.id,
      riskLevel: "HIGH",
      metadata: { key: setting.key },
    });
    const planCatalog = await getSaasPlanCatalog();
    return ok({ pricing: pricingFromPlanCatalog(planCatalog), planCatalog, setting });
  }
  if (request.method === "GET" && pathMatches(path, ["platform", "referral-policy"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    const setting = await prisma.platformSetting.findUnique({ where: { key: "platform.referralPolicy" } });
    return ok({
      policy:
        setting?.value ??
        ({
          enabled: true,
          referrerRewardType: "TRIAL_DAYS",
          referrerRewardValue: 30,
          referredRewardType: "TRIAL_DAYS",
          referredRewardValue: 30,
          maxRedemptionsPerOrg: 25,
          expiresInDays: 180,
        } satisfies z.infer<typeof platformReferralPolicySchema>),
    });
  }
  if (request.method === "PATCH" && pathMatches(path, ["platform", "referral-policy"])) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    const body = platformReferralPolicySchema.parse(await readJson(request));
    const setting = await prisma.platformSetting.upsert({
      where: { key: "platform.referralPolicy" },
      create: {
        key: "platform.referralPolicy",
        value: body as Prisma.InputJsonValue,
        updatedById: actorUserId,
      },
      update: {
        value: body as Prisma.InputJsonValue,
        updatedById: actorUserId,
      },
    });
    await writeAuditLog({
      request,
      actorUserId,
      action: "platform.referral_policy_updated",
      entityType: "platform_setting",
      entityId: setting.id,
      riskLevel: "HIGH",
      metadata: body,
    });
    return ok({ policy: body, setting });
  }
  if (request.method === "POST" && pathMatches(path, ["platform", "orgs", /.+/, "trial", "extend"])) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    const orgId = path[2]!;
    const body = platformOrgTrialExtendSchema.parse(await readJson(request));
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw notFoundError("Organization not found");
    const currentEnd = org.trialEndAt ?? new Date();
    const trialEndAt = new Date(currentEnd.getTime() + body.days * 24 * 60 * 60 * 1000);
    const subscription = await prisma.saaSSubscription.upsert({
      where: { orgId },
      create: {
        orgId,
        trialStartAt: org.trialStartAt ?? new Date(),
        trialEndAt,
        trialExtendedDays: body.days,
        status: org.status,
      },
      update: {
        trialEndAt,
        trialExtendedDays: { increment: body.days },
        noteForPlatform: body.reason,
      },
    });
    const updatedOrg = await prisma.organization.update({ where: { id: orgId }, data: { trialEndAt } });
    await writeAuditLog({
      request,
      orgId,
      actorUserId,
      action: "platform.organization_trial_extended",
      entityType: "organization",
      entityId: orgId,
      before: { trialEndAt: currentEnd.toISOString() },
      after: { trialEndAt: trialEndAt.toISOString() },
      metadata: { days: body.days, reason: body.reason, subscriptionId: subscription.id },
    });
    return ok({ org: updatedOrg, subscription });
  }
  if (request.method === "POST" && pathMatches(path, ["platform", "orgs", /.+/, "credit"])) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    const orgId = path[2]!;
    const body = platformOrgCreditSchema.parse(await readJson(request));
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw notFoundError("Organization not found");
    const subscription = await prisma.saaSSubscription.upsert({
      where: { orgId },
      create: {
        orgId,
        trialStartAt: org.trialStartAt ?? new Date(),
        trialEndAt: org.trialEndAt ?? new Date(),
        status: org.status,
        creditPaise: body.paise,
        noteForPlatform: body.reason,
      },
      update: { creditPaise: { increment: body.paise }, noteForPlatform: body.reason },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId,
      action: "platform.organization_credit_adjusted",
      entityType: "organization",
      entityId: orgId,
      riskLevel: "HIGH",
      metadata: { paise: body.paise, reason: body.reason, subscriptionId: subscription.id },
    });
    return ok({ subscription });
  }
  if (request.method === "POST" && pathMatches(path, ["platform", "orgs", /.+/, "subscription-note"])) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    const orgId = path[2]!;
    const body = platformSubscriptionNoteSchema.parse(await readJson(request));
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw notFoundError("Organization not found");
    const subscription = await prisma.saaSSubscription.upsert({
      where: { orgId },
      create: {
        orgId,
        trialStartAt: org.trialStartAt ?? new Date(),
        trialEndAt: org.trialEndAt ?? new Date(),
        status: org.status,
        noteForPlatform: body.note,
      },
      update: { noteForPlatform: body.note },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId,
      action: "platform.organization_subscription_note_updated",
      entityType: "saas_subscription",
      entityId: subscription.id,
      metadata: { noteLength: body.note.length },
    });
    return ok({ subscription });
  }
  if (request.method === "PATCH" && pathMatches(path, ["platform", "orgs", /.+/, "tier"])) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    const orgId = path[2]!;
    const body = platformOrgTierSchema.parse(await readJson(request));
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw notFoundError("Organization not found");
    const subscription = await prisma.saaSSubscription.upsert({
      where: { orgId },
      create: {
        orgId,
        trialStartAt: org.trialStartAt ?? new Date(),
        trialEndAt: org.trialEndAt ?? new Date(),
        status: org.status,
        tier: body.tier,
      },
      update: { tier: body.tier },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId,
      action: "platform.organization_tier_changed",
      entityType: "organization",
      entityId: orgId,
      riskLevel: "HIGH",
      metadata: { tier: body.tier, effectiveAt: body.effectiveAt ?? null },
    });
    return ok({ subscription });
  }
  if (request.method === "POST" && pathMatches(path, ["platform", "orgs", /.+/, "rename"])) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    const orgId = path[2]!;
    const body = platformOrgRenameSchema.parse(await readJson(request));
    const before = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!before) throw notFoundError("Organization not found");
    const org = await prisma.organization.update({
      where: { id: orgId },
      data: { name: body.name, username: body.username },
    });
    await prisma.organizationUsernameHistory.create({
      data: { orgId, oldUsername: before.username, newUsername: body.username, changedById: actorUserId },
    }).catch(() => undefined);
    await writeAuditLog({
      request,
      orgId,
      actorUserId,
      action: "platform.organization_renamed",
      entityType: "organization",
      entityId: orgId,
      before: { name: before.name, username: before.username },
      after: { name: org.name, username: org.username },
      metadata: { reason: body.reason },
    });
    return ok({ org });
  }
  if (request.method === "POST" && pathMatches(path, ["platform", "orgs", /.+/, "soft-delete"])) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    const orgId = path[2]!;
    const body = platformOrgReasonSchema.parse(await readJson(request));
    const org = await prisma.organization.update({
      where: { id: orgId },
      data: { status: "DELETED", deletedAt: new Date() },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId,
      action: "platform.organization_soft_deleted",
      entityType: "organization",
      entityId: orgId,
      riskLevel: "CRITICAL",
      metadata: { reason: body.reason, purgeAfterDays: 30 },
    });
    return ok({ org });
  }
  if (
    request.method === "POST" &&
    pathMatches(path, ["platform", "orgs", /.+/, "transfer-ownership"])
  ) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    const orgId = path[2]!;
    const body = platformOrgTransferSchema.parse(await readJson(request));
    await ensureOrganizationMembership({
      orgId,
      userId: body.newOwnerUserId,
      marketingOptIn: true,
      skipSaasMemberLimit: true,
    });
    await prisma.organizationRoleAssignment.upsert({
      where: { orgId_userId: { orgId, userId: body.newOwnerUserId } },
      create: { orgId, userId: body.newOwnerUserId, role: "OWNER", assignedById: actorUserId },
      update: { role: "OWNER", assignedById: actorUserId },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId,
      action: "platform.organization_ownership_transferred",
      entityType: "organization",
      entityId: orgId,
      riskLevel: "CRITICAL",
      metadata: { newOwnerUserId: body.newOwnerUserId, reason: body.reason },
    });
    return ok({ transferred: true });
  }
  if (
    request.method === "POST" &&
    pathMatches(path, ["platform", "orgs", /.+/, "bulk-import-members"])
  ) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    const orgId = path[2]!;
    const body = z.object({ csv: z.string().min(1).max(500_000) }).parse(await readJson(request));
    const lines = body.csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) throw validationError("CSV must contain a header row and at least one data row.");
    const headers = lines[0]!.toLowerCase().split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
    const nameIndex = headers.findIndex((h) => ["name", "full name", "member name"].includes(h));
    const emailIndex = headers.findIndex((h) => ["email", "email address"].includes(h));
    if (nameIndex < 0 || emailIndex < 0) throw validationError("CSV must include 'name' and 'email' columns.");
    const results: Array<{ row: number; status: "created" | "existing" | "error"; email?: string; error?: string }> = [];
    for (const [index, line] of lines.slice(1).entries()) {
      const columns = line.split(",").map((col) => col.trim().replace(/^["']|["']$/g, ""));
      const name = columns[nameIndex]?.trim();
      const email = columns[emailIndex]?.trim().toLowerCase();
      if (!name || !email) {
        results.push({ row: index + 2, status: "error", error: "Missing name or email" });
        continue;
      }
      const existing = await prisma.user.findUnique({ where: { email } });
      const user = existing ?? (await prisma.user.create({
        data: { email, name, slug: await createUniqueMemberSlug(), marketingOptIn: true },
      }));
      await ensureOrganizationMembership({ orgId, userId: user.id, marketingOptIn: user.marketingOptIn });
      results.push({ row: index + 2, status: existing ? "existing" : "created", email });
    }
    await writeAuditLog({
      request,
      orgId,
      actorUserId,
      action: "platform.members.bulk_imported",
      entityType: "organization",
      entityId: orgId,
      metadata: { totalRows: results.length },
    });
    return ok({ results, summary: { total: results.length, created: results.filter((r) => r.status === "created").length, existing: results.filter((r) => r.status === "existing").length, errors: results.filter((r) => r.status === "error").length } });
  }
  if (request.method === "GET" && pathMatches(path, ["platform", "moderation"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    return ok({
      flags: await prisma.contentModerationFlag.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    });
  }
  if (request.method === "POST" && pathMatches(path, ["platform", "moderation"])) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    const body = platformModerationDecisionSchema.parse(await readJson(request));
    const flag = await prisma.contentModerationFlag.update({
      where: { id: body.id },
      data: {
        status: body.decision,
        reason: body.reason,
        reviewedByUserId: actorUserId,
        reviewedAt: new Date(),
      },
    });
    await writeAuditLog({
      request,
      orgId: flag.orgId,
      actorUserId,
      action: "platform.moderation_decided",
      entityType: "content_moderation_flag",
      entityId: flag.id,
      riskLevel: body.decision === "REMOVED" ? "HIGH" : "MEDIUM",
      metadata: { decision: body.decision, reason: body.reason },
    });
    return ok({ flag });
  }
  if (request.method === "GET" && pathMatches(path, ["platform", "orgs"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    return ok({ orgs: await prisma.organization.findMany({ orderBy: { createdAt: "desc" } }) });
  }
  if (request.method === "GET" && pathMatches(path, ["platform", "subscriptions"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    const [
      orgs,
      subscriptions,
      mandates,
      referrals,
      planCatalog,
      memberGroups,
      branchGroups,
      staffGroups,
      trainerGroups,
      productGroups,
    ] = await Promise.all([
      prisma.organization.findMany({
        select: {
          id: true,
          name: true,
          username: true,
          status: true,
          trialEndAt: true,
          createdAt: true,
          contactEmail: true,
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
      prisma.saaSSubscription.findMany(),
      prisma.saaSBillingMandate.findMany(),
      prisma.orgReferralPartnership.findMany(),
      getSaasPlanCatalog(),
      prisma.memberProfile.groupBy({ by: ["orgId"], _count: { _all: true } }),
      prisma.branch.groupBy({ by: ["orgId"], where: { active: true }, _count: { _all: true } }),
      prisma.organizationRoleAssignment.groupBy({
        by: ["orgId"],
        where: { role: { not: "MEMBER" } },
        _count: { _all: true },
      }),
      prisma.organizationRoleAssignment.groupBy({
        by: ["orgId"],
        where: { role: "TRAINER" },
        _count: { _all: true },
      }),
      prisma.product.groupBy({ by: ["orgId"], _count: { _all: true } }),
    ]);
    const subByOrg = new Map(subscriptions.map((sub) => [sub.orgId, sub]));
    const mandateByOrg = new Map(mandates.map((mandate) => [mandate.orgId, mandate]));
    const memberCountByOrg = new Map(memberGroups.map((row) => [row.orgId, row._count._all]));
    const branchCountByOrg = new Map(branchGroups.map((row) => [row.orgId, row._count._all]));
    const staffCountByOrg = new Map(staffGroups.map((row) => [row.orgId, row._count._all]));
    const trainerCountByOrg = new Map(trainerGroups.map((row) => [row.orgId, row._count._all]));
    const productCountByOrg = new Map(productGroups.map((row) => [row.orgId, row._count._all]));
    const referralCountBySource = new Map<string, number>();
    for (const partnership of referrals) {
      referralCountBySource.set(
        partnership.sourceOrgId,
        (referralCountBySource.get(partnership.sourceOrgId) ?? 0) + 1,
      );
    }
    return ok({
      summary: {
        totalOrgs: orgs.length,
        onTrial: orgs.filter((o) => o.status === "TRIAL_ACTIVE" || o.status === "TRIAL_EXPIRING")
          .length,
        active: orgs.filter((o) => o.status === "ACTIVE").length,
        suspended: orgs.filter((o) => o.status === "SUSPENDED").length,
        cancelled: orgs.filter((o) => o.status === "CANCELLED").length,
        totalReferrals: referrals.length,
      },
      rows: orgs.map((org) => {
        const subscription = subByOrg.get(org.id);
        const mandate = mandateByOrg.get(org.id);
        const tier = subscription?.tier ?? "FREE";
        const entitlements = planCatalog[tier].entitlements;
        return {
          orgId: org.id,
          orgName: org.name,
          username: org.username,
          orgStatus: org.status,
          trialEndAt: org.trialEndAt,
          createdAt: org.createdAt,
          contactEmail: org.contactEmail,
          subscriptionStatus: subscription?.status ?? null,
          tier,
          billingCycle: subscription?.billingCycle ?? "MONTHLY",
          priceLockedPaise: subscription?.priceLockedPaise ?? null,
          creditPaise: subscription?.creditPaise ?? 0,
          noteForPlatform: subscription?.noteForPlatform ?? null,
          nextBillingAt: subscription?.nextBillingAt ?? null,
          mandateStatus: mandate?.status ?? null,
          mandateNextChargeAt: mandate?.nextChargeAt ?? null,
          mandatePaidCount: mandate?.paidCount ?? 0,
          referredCount: referralCountBySource.get(org.id) ?? 0,
          usage: {
            activeMemberCount: memberCountByOrg.get(org.id) ?? 0,
            branchCount: branchCountByOrg.get(org.id) ?? 0,
            staffCount: staffCountByOrg.get(org.id) ?? 0,
            trainerCount: trainerCountByOrg.get(org.id) ?? 0,
            productCount: productCountByOrg.get(org.id) ?? 0,
          },
          entitlements,
        };
      }),
      planCatalog,
    });
  }
  if (request.method === "PATCH" && pathMatches(path, ["platform", "orgs", /.+/, "status"])) {
    const ctx = await getRequestContext(request);
    const userId = requirePlatformAdmin(ctx);
    const body = (await readJson(request)) as { status: "ACTIVE" | "SUSPENDED" | "CANCELLED" };
    const org = await prisma.organization.update({
      where: { id: path[2]! },
      data: { status: body.status },
    });
    await writeAuditLog({
      request,
      orgId: org.id,
      actorUserId: userId,
      action: "platform.organization_status_updated",
      entityType: "organization",
      entityId: org.id,
      metadata: { status: body.status },
    });
    return ok({ org });
  }
  if (request.method === "GET" && pathMatches(path, ["platform", "ai-usage"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    return ok({
      usage: await prisma.aIUsageLog.findMany({ take: 100, orderBy: { createdAt: "desc" } }),
    });
  }
  if (request.method === "GET" && pathMatches(path, ["platform", "provider-status"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    const registry = getProviderRegistryDiagnostics();
    const normalizeProviderDiagnostics = (name: string, value: unknown) => {
      const record = value as {
        selectedProvider?: unknown;
        activeProvider?: unknown;
        status?: unknown;
        missingEnv?: unknown;
        env?: unknown;
        provider?: unknown;
        mode?: unknown;
        configured?: unknown;
        lastCheckedAt?: unknown;
        notes?: unknown;
        metadata?: unknown;
      };
      const selectedProvider =
        typeof record.selectedProvider === "string" ? record.selectedProvider : name;
      const activeProvider =
        typeof record.activeProvider === "string" ? record.activeProvider : null;
      const missingEnv = Array.isArray(record.missingEnv)
        ? record.missingEnv.filter((item): item is string => typeof item === "string")
        : [];
      return {
        selectedProvider,
        activeProvider,
        status: typeof record.status === "string" ? record.status : "unknown",
        configured: Boolean(record.configured),
        missingEnv,
        env:
          record.env && typeof record.env === "object"
            ? (record.env as Record<string, boolean>)
            : {},
        provider: typeof record.provider === "string" ? record.provider : selectedProvider,
        mode: typeof record.mode === "string" ? record.mode : selectedProvider,
        ...(typeof record.lastCheckedAt === "string"
          ? { lastCheckedAt: record.lastCheckedAt }
          : {}),
        ...(typeof record.notes === "string" ? { notes: record.notes } : {}),
        ...(record.metadata && typeof record.metadata === "object"
          ? { metadata: record.metadata as Record<string, string | number | boolean | null> }
          : {}),
      };
    };
    const coarseProviders = Object.fromEntries(
      Object.entries(registry).map(([name, value]) => [
        name,
        normalizeProviderDiagnostics(name, value),
      ]),
    );
    return ok({
      providers: {
        ...coarseProviders,
        rateLimit: normalizeProviderDiagnostics("rateLimit", getRateLimitDiagnostics()),
        cache: normalizeProviderDiagnostics("cache", getServerCacheDiagnostics()),
      },
    });
  }
  if (request.method === "GET" && pathMatches(path, ["platform", "abuse-flags"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    return ok({
      flags: await prisma.organizationAbuseFlag.findMany({
        take: 100,
        orderBy: { createdAt: "desc" },
      }),
    });
  }
  return undefined;
}

export function redirectTo(url: string) {
  return NextResponse.redirect(url);
}
