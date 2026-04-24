import { createHash, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  bodyProgressEntrySchema,
  attendanceScanSchema,
  checkoutSchema,
  couponSchema,
  createOrganizationSchema,
  memberHabitLogSchema,
  memberHabitSchema,
  membershipPlanSchema,
  notificationSchema,
  requestOtpSchema,
  workoutSessionSchema,
  verifyOtpSchema,
  type AIRequestType,
  type Role
} from "@zook/core";
import {
  LocalStorageProvider,
  buildStorageKey,
  getAIProvider,
  getEmailProvider,
  getMapProvider,
  getProviderRegistryDiagnostics,
  getStorageProvider,
  storageFileCategories,
  verifyLocalStorageSignature,
  type StorageFileCategory
} from "@zook/core/providers";
import {
  AuthService,
  calculateShopOrder,
  buildAIQuotaState,
  canReceiveNotification,
  canAssignPlanToUser,
  canSendNotification,
  computeSubscriptionWindow,
  consumeVisit,
  createPlanVersionSnapshot,
  type OtpChallengeRecord,
  applyCoupon,
  createSignedQrToken,
  createTrialWindow,
  decideAttendanceStatus,
  encodeQrPayload,
  fulfillShopOrder,
  markShopOrderPaid,
  normalizeUsername,
  PersonalTrackingService,
  requireManualOverrideReason,
  runAIGuardedRequest,
  transitionPaymentSession,
  validateAttendanceScan,
  validateReferralRedemption,
  validateSignedQrToken
} from "@zook/core/services";
import { Prisma, prisma } from "@zook/db";
import { extractSessionToken, sessionCookieName } from "./context";
import { getRequestContext, requireAuth, requireOrgPermission, requirePlatformAdmin } from "./access";
import { conflictError, forbiddenError, notFoundError, toErrorResponse, unauthorizedError, validationError } from "./errors";
import { fail, ok, readJson } from "./response";
import { resolveSessionSummaryFromToken } from "./session";
import { writeAuditLog } from "./audit";
import { getDevOtpResponseValue } from "./auth-response";
import { assertRateLimit } from "./rate-limit";
import { createRequestId, currentRequestId, runWithRequestState } from "./request-state";
import { assertSafeMutationRequest, getClientIp } from "./security";
import {
  assertCanAccessFileAsset,
  assertFileAssetBelongsToOrg,
  assertFileAssetOwnedByUser,
  assertFileUploadPermission,
  buildFileAssetUrl,
  resolveFileVisibility
} from "./files";
import {
  getMemberHomeData,
  getMyShopOrders,
  getOrganizationDashboardData,
  getOrganizationMembers
} from "./read-models";

const emailProvider = getEmailProvider();
const mapProvider = getMapProvider();
const aiProvider = getAIProvider();
const storageProvider = getStorageProvider();
const personalTrackingService = new PersonalTrackingService();

const joinRequestSchema = z.object({
  planId: z.string().optional(),
  referralCode: z.string().trim().toUpperCase().optional(),
  message: z.string().max(500).optional()
});

const subscriptionCheckoutSchema = z.object({
  planId: z.string(),
  couponCode: z.string().trim().toUpperCase().optional(),
  referralCode: z.string().trim().toUpperCase().optional()
});

const completeMockPaymentSchema = z.object({
  status: z.enum(["SUCCEEDED", "FAILED", "PENDING"]).optional()
});

const manualMembershipPaymentSchema = z
  .object({
    memberUserId: z.string(),
    planId: z.string().optional(),
    subscriptionId: z.string().optional(),
    amountPaise: z.number().int().positive(),
    mode: z.enum(["CASH", "DIRECT_UPI", "BANK_TRANSFER", "OTHER"]),
    proofAssetId: z.string().optional(),
    receiptNumber: z.string().optional(),
    notes: z.string().max(500).optional()
  })
  .refine((value) => Boolean(value.planId || value.subscriptionId), "A planId or subscriptionId is required");

const attendanceRejectSchema = z.object({
  reason: z.string().trim().min(2).max(200)
});

const manualAttendanceSchema = z.object({
  memberUserId: z.string(),
  branchId: z.string().optional(),
  reason: z.string().trim().min(2).max(200),
  notes: z.string().max(500).optional()
});

const notificationComposerSchema = notificationSchema.extend({
  audience: z.enum(["selected_members", "all_active_members", "expiring_soon", "assigned_clients", "membership_plan"]),
  selectedUserIds: z.array(z.string()).default([]),
  planId: z.string().optional(),
  excludeMinors: z.boolean().default(false)
});

const notificationPreferenceSchema = z.object({
  orgId: z.string().optional(),
  transactional: z.boolean().optional(),
  operational: z.boolean().optional(),
  promotional: z.boolean().optional(),
  engagement: z.boolean().optional(),
  pushEnabled: z.boolean().optional()
});

const productInputSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  category: z
    .enum(["WATER", "PROTEIN_SHAKE", "SHAKER", "TOWEL", "SUPPLEMENT", "OTHER"])
    .default("OTHER"),
  pricePaise: z.number().int().nonnegative(),
  stock: z.number().int().nonnegative(),
  lowStockThreshold: z.number().int().nonnegative().default(8),
  imageAssetId: z.string().optional(),
  imageUrl: z.string().url().optional(),
  active: z.boolean().default(true)
});

const shopOrderSchema = z.object({
  orgId: z.string(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive()
      })
    )
    .min(1)
});

const inventoryAdjustmentSchema = z.object({
  productId: z.string(),
  delta: z.number().int().refine((value) => value !== 0, "Inventory delta must be non-zero"),
  reason: z.string().trim().min(2).max(200)
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
      "RECOVERY"
    ])
    .default("WORKOUT"),
  description: z.string().max(500).optional(),
  content: z.record(z.string(), z.any()).default({ blocks: [] }),
  imageAssetId: z.string().optional(),
  visibility: z.string().default("selected"),
  aiGenerated: z.boolean().default(false)
});

const uploadCategorySchema = z.enum(storageFileCategories);

const profilePhotoAssetSchema = z.object({
  fileAssetId: z.string(),
  orgId: z.string().optional(),
  consentToAttendanceUse: z.boolean().optional()
});

const organizationAssetSchema = z
  .object({
    logoAssetId: z.string().optional(),
    coverAssetId: z.string().optional()
  })
  .refine((value) => Boolean(value.logoAssetId || value.coverAssetId), "Provide at least one file asset.");

const trainerProfileAssetSchema = z.object({
  upiId: z.string().trim().max(120).optional(),
  upiQrAssetId: z.string().optional(),
  bio: z.string().max(500).optional()
});

const ptSubscriptionSchema = z.object({
  memberUserId: z.string(),
  trainerUserId: z.string(),
  ptPlanId: z.string().optional(),
  amountPaise: z.number().int().positive(),
  paymentMode: z.enum(["CASH", "DIRECT_UPI", "OTHER"]),
  totalSessions: z.number().int().positive().optional(),
  notes: z.string().max(500).optional(),
  proofAssetId: z.string().optional()
});

const planAssignSchema = z.object({
  assignedToUserId: z.string().optional(),
  audience: z.string().default("selected_member")
});

const planProgressInputSchema = z.object({
  orgId: z.string().optional(),
  progressJson: z.record(z.string(), z.any()).default({}),
  completionPct: z.number().int().min(0).max(100).default(0),
  feedback: z.string().max(500).optional()
});

const aiChatSchema = z.object({
  prompt: z.string().trim().min(2).max(2_000),
  orgId: z.string().optional(),
  conversationId: z.string().optional()
});

const aiGenerateSchema = z.object({
  prompt: z.string().trim().min(2).max(2_000),
  orgId: z.string().optional(),
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
      "RECOVERY"
    ])
    .optional(),
  persistDraft: z.boolean().default(true)
});

function clean<T extends Record<string, unknown>>(input: T): any {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function dateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
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
  allowedCategories: StorageFileCategory[]
) {
  if (!fileAssetId) {
    return null;
  }
  const asset = await findFileAssetOrThrow(fileAssetId);
  assertFileAssetBelongsToOrg({ asset, orgId, allowedCategories });
  return asset;
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
    ...(input.orgId ? { orgId: input.orgId } : {})
  });
  return asset;
}

async function resolveFileUrl(asset: { storageKey: string; visibility: string | null }, signed = false) {
  if (!signed && asset.visibility === "public") {
    return storageProvider.getPublicUrl({ key: asset.storageKey });
  }
  return storageProvider.getSignedUrl({ key: asset.storageKey, expiresInSeconds: 10 * 60 });
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
  let validated;
  try {
    validated = storageProvider.validateFile({
      category,
      contentType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      originalName: file.name,
      visibility
    });
  } catch (error) {
    throw validationError(error instanceof Error ? error.message : "Invalid upload.");
  }

  return {
    file,
    category,
    visibility,
    orgId: rawOrgId || undefined,
    validated
  };
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

async function listTrackingWorkouts(userId: string) {
  const workouts = await prisma.workoutSession.findMany({
    where: { userId, deletedAt: null },
    orderBy: { startedAt: "desc" },
    take: 100
  });
  const exercises = await prisma.workoutExerciseEntry.findMany({
    where: { workoutSessionId: { in: workouts.map((workout) => workout.id) } },
    orderBy: [{ workoutSessionId: "asc" }, { orderIndex: "asc" }]
  });

  return workouts.map((workout) => ({
    ...workout,
    exercises: exercises.filter((exercise) => exercise.workoutSessionId === workout.id)
  }));
}

async function listPlanAssignmentsForUser(userId: string, assignmentId?: string) {
  const assignments = await prisma.planAssignment.findMany({
    where: clean({
      assignedToUserId: userId,
      active: true,
      ...(assignmentId ? { id: assignmentId } : {})
    }),
    orderBy: { createdAt: "desc" }
  });
  const [plans, progress] = await Promise.all([
    prisma.planContent.findMany({
      where: { id: { in: assignments.map((assignment) => assignment.planId) } }
    }),
    prisma.planProgress.findMany({
      where: { assignmentId: { in: assignments.map((assignment) => assignment.id) }, userId }
    })
  ]);

  return assignments.map((assignment) => ({
    ...assignment,
    plan: plans.find((plan) => plan.id === assignment.planId) ?? null,
    progress: progress.find((entry) => entry.assignmentId === assignment.id) ?? null
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
    visibility: input.visibility
  };
}

async function getUserByEmailOrCreate(email: string) {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: email.split("@")[0] ?? "Zook User",
      emailVerifiedAt: new Date()
    }
  });
}

async function ensureOrganizationMembership(input: {
  orgId: string;
  userId: string;
  joinedAt?: Date;
  profilePhotoUrl?: string | null;
  marketingOptIn?: boolean;
}) {
  await prisma.organizationUser.upsert({
    where: { orgId_userId: { orgId: input.orgId, userId: input.userId } },
    update: { status: "active", leftAt: null },
    create: { orgId: input.orgId, userId: input.userId, joinedAt: input.joinedAt ?? new Date(), status: "active" }
  });
  await prisma.organizationRoleAssignment.upsert({
    where: {
      orgId_userId_role: {
        orgId: input.orgId,
        userId: input.userId,
        role: "MEMBER"
      }
    },
    update: {},
    create: { orgId: input.orgId, userId: input.userId, role: "MEMBER" }
  });
  await prisma.memberProfile.upsert({
    where: { orgId_userId: { orgId: input.orgId, userId: input.userId } },
    update: clean({
      profilePhotoUrl: input.profilePhotoUrl ?? undefined,
      marketingOptIn: input.marketingOptIn
    }),
    create: clean({
      orgId: input.orgId,
      userId: input.userId,
      profilePhotoUrl: input.profilePhotoUrl ?? undefined,
      marketingOptIn: input.marketingOptIn
    })
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
}) {
  const notification = await prisma.notification.create({
    data: clean({
      orgId: input.orgId,
      createdById: input.createdById,
      type: input.type,
      title: input.title,
      body: input.body,
      audience: input.audience,
      metadata: input.metadata,
      status: "SENT",
      sentAt: new Date()
    })
  });
  if (input.userIds.length) {
    await prisma.notificationRecipient.createMany({
      data: input.userIds.map((userId) => ({
        notificationId: notification.id,
        userId,
        deliveryStatus: "in_app",
        deliveredAt: new Date()
      })),
      skipDuplicates: true
    });
  }
  return notification;
}

function currentAIProviderType(): "MOCK" | "OPENAI" {
  return process.env.AI_PROVIDER === "openai" && Boolean(process.env.OPENAI_API_KEY) ? "OPENAI" : "MOCK";
}

function summarizeAIResponse(response: string | Record<string, unknown>) {
  return (typeof response === "string" ? response : JSON.stringify(response)).slice(0, 120);
}

async function resolveAIQuotaState(input: {
  userId: string;
  role: Exclude<Role, "PLATFORM_ADMIN">;
}) {
  const today = startOfDay();
  const monthStart = startOfMonth();
  const [usedTextDaily, usedTextMonth, usedImagesMonth] = await Promise.all([
    prisma.aIUsageLog.count({
      where: {
        userId: input.userId,
        requestType: { in: ["CHAT", "STRUCTURED_PLAN"] },
        createdAt: { gte: today }
      }
    }),
    prisma.aIUsageLog.count({
      where: {
        userId: input.userId,
        requestType: { in: ["CHAT", "STRUCTURED_PLAN"] },
        createdAt: { gte: monthStart }
      }
    }),
    prisma.aIUsageLog.count({
      where: {
        userId: input.userId,
        requestType: "IMAGE",
        createdAt: { gte: monthStart }
      }
    })
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
          where: { id: input.conversationId, userId: input.userId }
        })
      : null) ??
    (await prisma.aIConversation.create({
      data: clean({
        userId: input.userId,
        orgId: input.orgId,
        title: input.prompt.slice(0, 80)
      })
    }));

  await prisma.aIMessage.createMany({
    data: [
      {
        conversationId: conversation.id,
        role: "user",
        content: input.prompt
      },
      clean({
        conversationId: conversation.id,
        role: "assistant",
        content: typeof input.response === "string" ? input.response : JSON.stringify(input.response),
        safetyFlags: input.safetyFlags
      })
    ]
  });

  return conversation;
}

function notificationPreferenceAllowsType(
  preference: {
    transactional: boolean;
    operational: boolean;
    promotional: boolean;
    engagement: boolean;
  } | null | undefined,
  type: "TRANSACTIONAL" | "OPERATIONAL" | "PROMOTIONAL" | "ENGAGEMENT" | "PLAN" | "SECURITY"
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

async function resolveNotificationRecipients(input: {
  orgId: string;
  senderUserId: string;
  audience: "selected_members" | "all_active_members" | "expiring_soon" | "assigned_clients" | "membership_plan";
  type: "TRANSACTIONAL" | "OPERATIONAL" | "PROMOTIONAL" | "ENGAGEMENT" | "PLAN" | "SECURITY";
  selectedUserIds?: string[];
  planId?: string;
  excludeMinors?: boolean;
}) {
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  let candidateUserIds: string[] = [];
  if (input.audience === "selected_members") {
    candidateUserIds = input.selectedUserIds ?? [];
  } else if (input.audience === "assigned_clients") {
    const assignments = await prisma.trainerAssignment.findMany({
      where: { orgId: input.orgId, trainerUserId: input.senderUserId, active: true },
      select: { memberUserId: true }
    });
    candidateUserIds = assignments.map((assignment) => assignment.memberUserId);
  } else if (input.audience === "membership_plan") {
    if (!input.planId) {
      throw validationError("A planId is required for membership-plan audiences.");
    }
    const subscriptions = await prisma.memberSubscription.findMany({
      where: { orgId: input.orgId, planId: input.planId, status: "ACTIVE" },
      select: { memberUserId: true }
    });
    candidateUserIds = subscriptions.map((subscription) => subscription.memberUserId);
  } else {
    const subscriptions = await prisma.memberSubscription.findMany({
      where: {
        orgId: input.orgId,
        status: "ACTIVE",
        ...(input.audience === "expiring_soon"
          ? { endsAt: { gte: today, lte: nextWeek } }
          : {})
      },
      select: { memberUserId: true }
    });
    candidateUserIds = subscriptions.map((subscription) => subscription.memberUserId);
  }

  const uniqueUserIds = Array.from(new Set(candidateUserIds));
  if (!uniqueUserIds.length) {
    return [];
  }

  const [users, preferences] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: uniqueUserIds } } }),
    prisma.userNotificationPreference.findMany({
      where: { userId: { in: uniqueUserIds }, OR: [{ orgId: input.orgId }, { orgId: null }] }
    })
  ]);
  const preferenceByUserId = new Map<string, (typeof preferences)[number]>();
  for (const preference of preferences) {
    if (!preferenceByUserId.has(preference.userId) || preference.orgId === input.orgId) {
      preferenceByUserId.set(preference.userId, preference);
    }
  }

  return users
    .filter((user) => {
      if (input.excludeMinors && user.isMinor) {
        return false;
      }
      const preference = preferenceByUserId.get(user.id);
      if (!notificationPreferenceAllowsType(preference, input.type)) {
        return false;
      }
      return canReceiveNotification(input.type, {
        isMinor: user.isMinor,
        guardianConsentGranted: !user.guardianPending,
        marketingOptIn: preference ? preference.promotional && user.marketingOptIn : user.marketingOptIn,
        aiConsent: user.aiConsent,
        hasProfilePhoto: Boolean(user.profilePhotoUrl)
      });
    })
    .map((user) => user.id);
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
    applicablePlanId: coupon.applicablePlanId ?? undefined
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
    publicVisible: plan.publicVisible
  });
}

async function resolveValidatedReferral(input: {
  orgId: string;
  userId: string;
  referralCode?: string;
}) {
  if (!input.referralCode) {
    return null;
  }
  const [referral, user] = await Promise.all([
    prisma.referralCode.findUnique({ where: { code: input.referralCode } }),
    prisma.user.findUniqueOrThrow({ where: { id: input.userId } })
  ]);
  if (!referral || referral.orgId !== input.orgId) {
    throw validationError("Referral code is invalid for this gym");
  }
  const referrer = await prisma.user.findUnique({ where: { id: referral.referrerUserId } });
  const existingRedemption = await prisma.referralRedemption.findFirst({
    where: { orgId: input.orgId, referralCodeId: referral.id, referredUserId: input.userId }
  });
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
      redemptionCount: referral.redemptionCount
    }),
    clean({
      referredUserId: input.userId,
      referredEmail: user.email,
      referrerEmail: referrer?.email,
      existingRedemption: Boolean(existingRedemption)
    })
  );
  return referral;
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
          where: { orgId_code: { orgId: input.orgId, code: input.couponCode } }
        })
      : couponId
        ? await prisma.coupon.findUnique({ where: { id: couponId } })
        : null) ?? null;

  if (!coupon) {
    return { coupon: null, finalAmountPaise: input.amountPaise, discountPaise: 0 };
  }

  const [totalRedemptions, userRedemptions] = await Promise.all([
    prisma.couponRedemption.count({ where: { orgId: input.orgId, couponId: coupon.id } }),
    prisma.couponRedemption.count({
      where: { orgId: input.orgId, couponId: coupon.id, userId: input.userId }
    })
  ]);

  const result = applyCoupon(toCouponInput(coupon), {
    amountPaise: input.amountPaise,
    planId: input.planId,
    redemptionCount: { total: totalRedemptions, byUser: userRedemptions }
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
    where: { orgId: input.orgId, attendanceId: input.recordId }
  });
  if (existingUsage) {
    return input.subscription;
  }
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
      remainingVisits: input.subscription.remainingVisits ?? undefined
    }),
    toMembershipPlanInput(input.plan),
    clean({
      alreadyCheckedInToday: input.alreadyCheckedInToday ?? false,
      multiEntryConsumes: input.multiEntryConsumes
    })
  );
  if (updated.remainingVisits !== input.subscription.remainingVisits) {
    await prisma.memberSubscription.update({
      where: { id: input.subscription.id },
      data: clean({ remainingVisits: updated.remainingVisits })
    });
    await prisma.membershipUsage.create({
      data: {
        orgId: input.orgId,
        subscriptionId: input.subscription.id,
        attendanceId: input.recordId,
        usedVisits: Math.max((input.subscription.remainingVisits ?? 0) - (updated.remainingVisits ?? 0), 0)
      }
    });
  }
  return updated;
}

class PrismaAuthRepo {
  private toOtpRecord(row: {
    id: string;
    email: string;
    codeHash: string;
    attempts: number;
    maxAttempts: number;
    resendCount: number;
    ipAddress: string | null;
    consumedAt: Date | null;
    expiresAt: Date;
    createdAt: Date;
  }): OtpChallengeRecord {
    return clean({
      id: row.id,
      email: row.email,
      codeHash: row.codeHash,
      attempts: row.attempts,
      maxAttempts: row.maxAttempts,
      resendCount: row.resendCount,
      ipAddress: row.ipAddress ?? undefined,
      consumedAt: row.consumedAt ?? undefined,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt
    }) as OtpChallengeRecord;
  }

  async createOtp(input: {
    email: string;
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
        codeHash: input.codeHash,
        maxAttempts: input.maxAttempts,
        expiresAt: input.expiresAt,
        createdAt: input.createdAt,
        ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
        ...(input.consumedAt ? { consumedAt: input.consumedAt } : {})
      }
    });
    return this.toOtpRecord(row);
  }

  async findLatestOtp(email: string): Promise<OtpChallengeRecord | undefined> {
    const row = await prisma.otpChallenge.findFirst({ where: { email }, orderBy: { createdAt: "desc" } });
    return row ? this.toOtpRecord(row) : undefined;
  }

  async incrementOtpAttempt(id: string) {
    await prisma.otpChallenge.update({ where: { id }, data: { attempts: { increment: 1 } } });
  }

  async refreshOtp(input: { id: string; codeHash: string; expiresAt: Date; ipAddress?: string }) {
    const row = await prisma.otpChallenge.update({
      where: { id: input.id },
      data: {
        codeHash: input.codeHash,
        expiresAt: input.expiresAt,
        attempts: 0,
        resendCount: { increment: 1 },
        createdAt: new Date(),
        ...(input.ipAddress ? { ipAddress: input.ipAddress } : {})
      }
    });
    return this.toOtpRecord(row);
  }

  async consumeOtp(id: string) {
    await prisma.otpChallenge.update({ where: { id }, data: { consumedAt: new Date() } });
  }

  async createSession(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }) {
    await prisma.userSession.create({ data: input });
  }

  async revokeSession(tokenHash: string) {
    await prisma.userSession.updateMany({ where: { tokenHash }, data: { revokedAt: new Date() } });
  }
}

async function handleAuth(request: NextRequest, path: string[]) {
  const auth = new AuthService(new PrismaAuthRepo(), emailProvider);
  if (request.method === "POST" && pathMatches(path, ["auth", "request-otp"])) {
    const body = requestOtpSchema.parse(await readJson(request));
    const ipAddress = getClientIp(request);
    assertRateLimit("otpRequestByEmail", body.email, "Too many OTP requests for this email.");
    assertRateLimit("otpRequestByIp", ipAddress, "Too many OTP requests from this IP.");
    await getUserByEmailOrCreate(body.email);
    const challenge = await auth.requestOtp(body.email, ipAddress !== "unknown" ? { ipAddress } : {});
    return ok({
      challengeId: challenge.id,
      expiresAt: challenge.expiresAt,
      devOtp: getDevOtpResponseValue()
    });
  }
  if (request.method === "POST" && pathMatches(path, ["auth", "verify-otp"])) {
    const body = verifyOtpSchema.parse(await readJson(request));
    const ipAddress = getClientIp(request);
    assertRateLimit("otpVerifyByEmail", body.email, "Too many OTP verification attempts for this email.");
    assertRateLimit("otpVerifyByIp", ipAddress, "Too many OTP verification attempts from this IP.");
    const user = await getUserByEmailOrCreate(body.email);
    const session = await auth.verifyOtp(clean({
      email: body.email,
      code: body.code,
      userId: user.id,
      userAgent: request.headers.get("user-agent") ?? undefined,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined
    }));
    const sessionSummary = await resolveSessionSummaryFromToken(session.token);
    const response = ok({
      user,
      token: session.token,
      expiresAt: session.expiresAt,
      ...(sessionSummary ? { session: sessionSummary } : {})
    });
    response.cookies.set(sessionCookieName, session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      expires: session.expiresAt,
      path: "/"
    });
    return response;
  }
  if (request.method === "POST" && pathMatches(path, ["auth", "logout"])) {
    const token = extractSessionToken(request);
    if (token) {
      await auth.logout(token);
    }
    const response = ok({ loggedOut: true });
    response.cookies.delete(sessionCookieName);
    return response;
  }
  if (
    request.method === "GET" &&
    (pathMatches(path, ["auth", "me"]) || pathMatches(path, ["auth", "session"]))
  ) {
    const token = extractSessionToken(request);
    const summary = await resolveSessionSummaryFromToken(
      token,
      request.headers.get("x-zook-org-id") ?? request.nextUrl.searchParams.get("orgId") ?? undefined
    );
    if (!summary) {
      return fail("UNAUTHORIZED", "Authentication required", 401);
    }
    return ok(summary);
  }
  return undefined;
}

async function handleMeData(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["me", "orgs"])) {
    const token = extractSessionToken(request);
    const summary = await resolveSessionSummaryFromToken(
      token,
      request.headers.get("x-zook-org-id") ?? request.nextUrl.searchParams.get("orgId") ?? undefined
    );
    if (!summary) {
      throw unauthorizedError();
    }
    return ok({ organizations: summary.organizations, activeOrgId: summary.activeOrgId });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "home"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    return ok(await getMemberHomeData(userId, ctx.orgId));
  }
  if (request.method === "PATCH" && pathMatches(path, ["me", "profile-photo"])) {
    const body = profilePhotoAssetSchema.parse(await readJson(request));
    const ctx = await getRequestContext(request, body.orgId ? { orgId: body.orgId } : {});
    const userId = requireAuth(ctx);
    const asset = await getUserScopedFileAsset({
      fileAssetId: body.fileAssetId,
      userId,
      allowedCategories: ["profile_photo"],
      ...(body.orgId ? { orgId: body.orgId } : {})
    });
    if (!asset) {
      throw validationError("Profile photo asset is required.");
    }
    const [user, profile] = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { profilePhotoUrl: asset.url }
      });
      const updatedProfile = body.orgId
        ? await tx.memberProfile.upsert({
            where: { orgId_userId: { orgId: body.orgId, userId } },
            update: clean({
              profilePhotoUrl: asset.url,
              profilePhotoConsentAt: body.consentToAttendanceUse ? new Date() : undefined
            }),
            create: clean({
              orgId: body.orgId,
              userId,
              profilePhotoUrl: asset.url,
              marketingOptIn: updatedUser.isMinor ? false : updatedUser.marketingOptIn,
              profilePhotoConsentAt: body.consentToAttendanceUse ? new Date() : undefined
            })
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
            recordedById: userId
          })
        });
      }
      return [updatedUser, updatedProfile] as const;
    });
    return ok({ user, profile, file: asset });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "attendance"])) {
    const userId = requireAuth(await getRequestContext(request));
    return ok({
      attendance: await prisma.attendanceRecord.findMany({
        where: { userId },
        orderBy: { checkedInAt: "desc" },
        take: 50
      })
    });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "shop-orders"])) {
    const userId = requireAuth(await getRequestContext(request));
    return ok({ orders: await getMyShopOrders(userId) });
  }
  return undefined;
}

async function handleTracking(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["me", "tracking", "summary"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const [workouts, bodyProgress, habits] = await Promise.all([
      listTrackingWorkouts(userId),
      prisma.bodyProgressEntry.findMany({ where: { userId }, orderBy: { measuredAt: "desc" }, take: 10 }),
      prisma.memberHabit.findMany({ where: { userId, active: true }, orderBy: { createdAt: "desc" }, take: 20 })
    ]);

    return ok({
      summary: personalTrackingService.getTrackingSummary(
        workouts.map((workout) => toTrackingWorkoutRecord(workout))
      ),
      recentWorkouts: workouts.slice(0, 5),
      latestBodyProgress: bodyProgress[0] ?? null,
      habits
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
    const visibility = personalTrackingService.normalizeVisibility({
      isMinor: user.isMinor,
      guardianConsentGranted: !user.guardianPending,
      ...(body.visibility ? { requestedVisibility: body.visibility } : {})
    });
    const baseWorkout = personalTrackingService.createWorkoutSession({
      title: body.title,
      workoutType: body.workoutType,
      startedAt: new Date(body.startedAt),
      ...(body.endedAt ? { endedAt: new Date(body.endedAt) } : {}),
      ...(body.intensity ? { intensity: body.intensity } : {}),
      ...(body.notes ? { notes: body.notes } : {}),
      ...(body.mood ? { mood: body.mood } : {}),
      visibility
    });

    const workout = await prisma.workoutSession.create({
      data: {
        userId,
        ...(body.organizationId ? { organizationId: body.organizationId } : {}),
        ...(body.planAssignmentId ? { planAssignmentId: body.planAssignmentId } : {}),
        ...(body.attendanceRecordId ? { attendanceRecordId: body.attendanceRecordId } : {}),
        title: baseWorkout.title,
        workoutType: baseWorkout.workoutType,
        startedAt: baseWorkout.startedAt,
        ...(baseWorkout.endedAt ? { endedAt: baseWorkout.endedAt } : {}),
        ...(baseWorkout.durationMinutes !== undefined ? { durationMinutes: baseWorkout.durationMinutes } : {}),
        ...(baseWorkout.intensity ? { intensity: baseWorkout.intensity } : {}),
        ...(baseWorkout.notes ? { notes: baseWorkout.notes } : {}),
        ...(baseWorkout.mood ? { mood: baseWorkout.mood } : {}),
        visibility
      }
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
          ...(exercise.setsCompleted !== undefined ? { setsCompleted: exercise.setsCompleted } : {}),
          ...(exercise.reps !== undefined ? { reps: exercise.reps } : {}),
          ...(exercise.weightKg !== undefined ? { weightKg: new Prisma.Decimal(exercise.weightKg) } : {}),
          ...(exercise.durationSeconds !== undefined ? { durationSeconds: exercise.durationSeconds } : {}),
          ...(exercise.distanceMeters !== undefined ? { distanceMeters: exercise.distanceMeters } : {}),
          ...(exercise.notes ? { notes: exercise.notes } : {}),
          completed: exercise.completed
        }))
      });
    }

    return ok({ workout });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "tracking", "workouts", /.+/])) {
    const userId = requireAuth(await getRequestContext(request));
    const workout = await prisma.workoutSession.findFirst({
      where: { id: path[3]!, userId, deletedAt: null }
    });
    if (!workout) {
      throw notFoundError("Workout not found");
    }
    const exercises = await prisma.workoutExerciseEntry.findMany({
      where: { workoutSessionId: workout.id },
      orderBy: { orderIndex: "asc" }
    });
    return ok({ workout: { ...workout, exercises } });
  }
  if (request.method === "PATCH" && pathMatches(path, ["me", "tracking", "workouts", /.+/])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const existingWorkout = await prisma.workoutSession.findFirst({
      where: { id: path[3]!, userId, deletedAt: null }
    });
    if (!existingWorkout) {
      throw notFoundError("Workout not found");
    }
    const body = workoutSessionSchema.partial().parse(await readJson(request));
    const visibility = personalTrackingService.normalizeVisibility({
      isMinor: user.isMinor,
      guardianConsentGranted: !user.guardianPending,
      ...(body.visibility ? { requestedVisibility: body.visibility } : {})
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
        visibility
      }
    );

    const workout = await prisma.workoutSession.update({
      where: { id: existingWorkout.id },
      data: {
        title: updated.title,
        workoutType: updated.workoutType,
        startedAt: updated.startedAt,
        ...(updated.endedAt ? { endedAt: updated.endedAt } : {}),
        ...(updated.durationMinutes !== undefined ? { durationMinutes: updated.durationMinutes } : {}),
        ...(updated.intensity ? { intensity: updated.intensity } : {}),
        ...(updated.notes ? { notes: updated.notes } : {}),
        ...(updated.mood ? { mood: updated.mood } : {}),
        visibility
      }
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
            ...(exercise.setsCompleted !== undefined ? { setsCompleted: exercise.setsCompleted } : {}),
            ...(exercise.reps !== undefined ? { reps: exercise.reps } : {}),
            ...(exercise.weightKg !== undefined ? { weightKg: new Prisma.Decimal(exercise.weightKg) } : {}),
            ...(exercise.durationSeconds !== undefined ? { durationSeconds: exercise.durationSeconds } : {}),
            ...(exercise.distanceMeters !== undefined ? { distanceMeters: exercise.distanceMeters } : {}),
            ...(exercise.notes ? { notes: exercise.notes } : {}),
            completed: exercise.completed
          }))
        });
      }
    }

    return ok({ workout });
  }
  if (request.method === "DELETE" && pathMatches(path, ["me", "tracking", "workouts", /.+/])) {
    const userId = requireAuth(await getRequestContext(request));
    const workout = await prisma.workoutSession.findFirst({
      where: { id: path[3]!, userId, deletedAt: null }
    });
    if (!workout) {
      throw notFoundError("Workout not found");
    }
    await prisma.workoutSession.update({
      where: { id: workout.id },
      data: { deletedAt: new Date() }
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
      ...(body.organizationId ? { orgId: body.organizationId } : {})
    });
    const visibility = personalTrackingService.normalizeVisibility({
      isMinor: user.isMinor,
      guardianConsentGranted: !user.guardianPending,
      ...(body.visibility ? { requestedVisibility: body.visibility } : {})
    });
    const entry = await prisma.bodyProgressEntry.create({
      data: {
        userId,
        ...(body.organizationId ? { organizationId: body.organizationId } : {}),
        measuredAt: new Date(body.measuredAt),
        ...(body.weightKg !== undefined ? { weightKg: new Prisma.Decimal(body.weightKg) } : {}),
        ...(body.waistCm !== undefined ? { waistCm: new Prisma.Decimal(body.waistCm) } : {}),
        ...(body.chestCm !== undefined ? { chestCm: new Prisma.Decimal(body.chestCm) } : {}),
        ...(body.armCm !== undefined ? { armCm: new Prisma.Decimal(body.armCm) } : {}),
        ...(body.bodyFatPercent !== undefined ? { bodyFatPercent: new Prisma.Decimal(body.bodyFatPercent) } : {}),
        ...(photoAsset ? { photoAssetId: photoAsset.id } : {}),
        ...(body.notes ? { notes: body.notes } : {}),
        visibility
      }
    });
    return ok({ entry });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "tracking", "body-progress"])) {
    const userId = requireAuth(await getRequestContext(request));
    return ok({
      entries: await prisma.bodyProgressEntry.findMany({
        where: { userId },
        orderBy: { measuredAt: "desc" },
        take: 50
      })
    });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "tracking", "habits"])) {
    const userId = requireAuth(await getRequestContext(request));
    const habits = await prisma.memberHabit.findMany({
      where: { userId, active: true },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    const logs = await prisma.memberHabitLog.findMany({
      where: { habitId: { in: habits.map((habit) => habit.id) } },
      orderBy: { loggedAt: "desc" },
      take: 100
    });
    return ok({
      habits: habits.map((habit) => ({
        ...habit,
        logs: logs.filter((log) => log.habitId === habit.id)
      }))
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
      ...(body.visibility ? { requestedVisibility: body.visibility } : {})
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
        visibility
      }
    });
    return ok({ habit });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "tracking", "habits", /.+/, "log"])) {
    const userId = requireAuth(await getRequestContext(request));
    const habit = await prisma.memberHabit.findFirst({
      where: { id: path[3]!, userId, active: true }
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
        completed: body.completed
      }
    });
    return ok({ log });
  }
  return undefined;
}

async function handleFiles(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["files", "local"])) {
    if (!(storageProvider instanceof LocalStorageProvider)) {
      throw notFoundError("Local storage route is unavailable for the active provider.");
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
        "cache-control": "private, max-age=0, no-store"
      }
    });
  }
  if (request.method === "GET" && pathMatches(path, ["files", "local", "public"])) {
    if (!(storageProvider instanceof LocalStorageProvider)) {
      throw notFoundError("Local storage route is unavailable for the active provider.");
    }
    const key = request.nextUrl.searchParams.get("key") ?? "";
    if (!key) {
      throw validationError("Missing file key.");
    }
    const file = await storageProvider.readObject({ key });
    return new NextResponse(new Uint8Array(file.body), {
      headers: {
        "content-type": file.contentType,
        "content-length": String(file.sizeBytes),
        "cache-control": "public, max-age=3600, immutable"
      }
    });
  }
  if (request.method === "POST" && pathMatches(path, ["files", "upload"])) {
    const upload = await parseFileUploadRequest(request);
    const ctx = await getRequestContext(request, upload.orgId ? { orgId: upload.orgId } : {});
    const userId = requireAuth(ctx);
    assertRateLimit("fileUploadByActor", `${upload.orgId ?? "global"}:${userId}`, "Too many file uploads requested.");
    assertFileUploadPermission({
      category: upload.category,
      ctx,
      actorUserId: userId,
      ...(upload.orgId ? { orgId: upload.orgId } : {})
    });

    const fileBytes = new Uint8Array(await upload.file.arrayBuffer());
    const checksum = createHash("sha256").update(fileBytes).digest("hex");
    const storageKey = buildStorageKey({
      category: upload.category,
      ...(upload.orgId ? { orgId: upload.orgId } : {}),
      ownerUserId: userId,
      ...(upload.validated.originalName ? { originalName: upload.validated.originalName } : {})
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
          upload.visibility === "public" ? "public, max-age=31536000, immutable" : "private, max-age=0, no-store"
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
            extension: upload.validated.extension
          } as Prisma.InputJsonValue
        }
      });
      const asset = await prisma.fileAsset.update({
        where: { id: created.id },
        data: { url: buildFileAssetUrl(created.id) }
      });
      await writeAuditLog({
        request,
        ...(upload.orgId ? { orgId: upload.orgId } : {}),
        actorUserId: userId,
        action: "file.uploaded",
        entityType: "file_asset",
        entityId: asset.id,
        metadata: { category: upload.category, visibility: upload.visibility, sizeBytes: upload.validated.sizeBytes }
      });
      return ok({
        file: asset,
        deliveryUrl: asset.url,
        signedUrl: await resolveFileUrl(asset, true)
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
    return ok({
      file: asset,
      url: await resolveFileUrl(asset, true)
    });
  }
  if (request.method === "GET" && pathMatches(path, ["files", /.+/, "content"])) {
    const asset = await findFileAssetOrThrow(path[1]!);
    const ctx = await getRequestContext(request, asset.orgId ? { orgId: asset.orgId } : {});
    assertCanAccessFileAsset(asset, ctx);
    return redirectTo(await resolveFileUrl(asset));
  }
  if (request.method === "DELETE" && pathMatches(path, ["files", /.+/])) {
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
      org_cover: ["ORG_MANAGE_PROFILE"]
    };

    const canDeleteOwn = asset.ownerUserId === userId;
    const canDeleteOrg =
      Boolean(asset.orgId) &&
      ctx.orgId === asset.orgId &&
      (orgDeletePermissions[category] ?? []).some((permission) => ctx.permissions.includes(permission as never));

    if (!canDeleteOwn && !canDeleteOrg) {
      throw forbiddenError("You do not have permission to delete this file.");
    }

    await storageProvider.deleteFile({ key: asset.storageKey });
    const deleted = await prisma.fileAsset.update({
      where: { id: asset.id },
      data: { deletedAt: new Date() }
    });
    await writeAuditLog({
      request,
      ...(asset.orgId ? { orgId: asset.orgId } : {}),
      actorUserId: userId,
      action: "file.deleted",
      entityType: "file_asset",
      entityId: asset.id,
      metadata: { category }
    });
    return ok({ file: deleted, deleted: true });
  }
  return undefined;
}

async function handleOrganizations(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["orgs", "public", "search"])) {
    const query = request.nextUrl.searchParams.get("q") ?? "";
    const city = request.nextUrl.searchParams.get("city") ?? undefined;
    const gyms = await prisma.organization.findMany({
      where: {
        visibility: "PUBLIC",
        ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { username: { contains: query, mode: "insensitive" } }
              ]
            }
          : {})
      },
      take: 25
    });
    return ok({ gyms });
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
    const [plans, activeMembership, pendingJoinRequest, approvedJoinRequest, referral] = await Promise.all([
      prisma.membershipPlan.findMany({
        where: { orgId: org.id, active: true, publicVisible: true },
        take: 10
      }),
      viewerUserId
        ? prisma.memberSubscription.findFirst({
            where: { orgId: org.id, memberUserId: viewerUserId, status: "ACTIVE" },
            orderBy: { createdAt: "desc" }
          })
        : Promise.resolve(null),
      viewerUserId
        ? prisma.membershipJoinRequest.findFirst({
            where: { orgId: org.id, userId: viewerUserId, status: "pending" },
            orderBy: { createdAt: "desc" }
          })
        : Promise.resolve(null),
      viewerUserId
        ? prisma.membershipJoinRequest.findFirst({
            where: { orgId: org.id, userId: viewerUserId, status: "approved" },
            orderBy: { reviewedAt: "desc" }
          })
        : Promise.resolve(null),
      referralCode ? prisma.referralCode.findUnique({ where: { code: referralCode } }) : Promise.resolve(null)
    ]);
    return ok({
      org,
      plans,
      viewerState: viewerUserId
        ? {
            activeMembership,
            pendingJoinRequest,
            approvedJoinRequest
          }
        : null,
      referral:
        referral && referral.orgId === org.id
          ? {
              code: referral.code,
              couponId: referral.couponId,
              status: referral.status,
              maxUses: referral.maxUses,
              redemptionCount: referral.redemptionCount
            }
          : null
    });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const body = createOrganizationSchema.parse(await readJson(request));
    const username = normalizeUsername(body.username);
    const trial = createTrialWindow();
    const org = await prisma.$transaction(async (tx) => {
      const created = await tx.organization.create({
        data: clean({
          name: body.name,
          username,
          contactPhone: body.contactPhone,
          contactEmail: body.contactEmail,
          address: body.address,
          city: body.city,
          state: body.state,
          pincode: body.pincode,
          latitude: body.latitude ? new Prisma.Decimal(body.latitude) : undefined,
          longitude: body.longitude ? new Prisma.Decimal(body.longitude) : undefined,
          locationSource: "MANUAL",
          amenities: body.amenities,
          visibility: body.visibility,
          joinMode: body.joinMode,
          trialStartAt: trial.trialStartAt,
          trialEndAt: trial.trialEndAt,
          createdByUserId: userId
        })
      });
      const branch = await tx.branch.create({
        data: {
          orgId: created.id,
          name: `${created.name} Main`,
          address: created.address,
          city: created.city,
          state: created.state,
          pincode: created.pincode,
          latitude: created.latitude,
          longitude: created.longitude,
          isDefault: true
        }
      });
      await tx.organizationUser.create({ data: { orgId: created.id, userId } });
      await tx.organizationRoleAssignment.create({
        data: { orgId: created.id, userId, role: "OWNER", assignedById: userId }
      });
      await tx.saaSSubscription.create({
        data: { orgId: created.id, trialStartAt: trial.trialStartAt, trialEndAt: trial.trialEndAt }
      });
      await tx.organizationSetting.create({
        data: { orgId: created.id, keyValues: { defaultBranchId: branch.id, attendanceMode: "EXCEPTION_APPROVAL" } }
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
      metadata: { username: org.username }
    });
    return ok({ org });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", "current"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const membership = await prisma.organizationUser.findFirst({ where: { userId, status: "active" } });
    if (!membership) {
      return ok({ org: null });
    }
    return ok({ org: await prisma.organization.findUnique({ where: { id: membership.orgId } }) });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "dashboard"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "MEMBERS_VIEW");
    return ok(await getOrganizationDashboardData(orgId));
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "members"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "MEMBERS_VIEW");
    return ok({ members: await getOrganizationMembers(orgId) });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "reports", "summary"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "ORG_VIEW_REPORTS");
    return ok(await getOrganizationDashboardData(orgId));
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "location", "resolve"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_LOCATION");
    const body = (await readJson(request)) as { googleMapsUrl?: string; address?: string; city?: string; state?: string; pincode?: string };
    const result = body.googleMapsUrl
      ? await mapProvider.resolveGoogleMapsLink(body.googleMapsUrl)
      : await mapProvider.geocodeAddress({
          address: body.address ?? "Manual address",
          city: body.city ?? "Pune",
          state: body.state ?? "Maharashtra",
          pincode: body.pincode ?? "411001"
        });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "organization.location_resolved",
      entityType: "organization",
      entityId: orgId,
      metadata: body
    });
    return ok({ location: result });
  }
  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "assets"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_PROFILE");
    const body = organizationAssetSchema.parse(await readJson(request));
    const [logoAsset, coverAsset] = await Promise.all([
      getOrganizationScopedFileAsset(body.logoAssetId, orgId, ["org_logo"]),
      getOrganizationScopedFileAsset(body.coverAssetId, orgId, ["org_cover"])
    ]);
    const org = await prisma.organization.update({
      where: { id: orgId },
      data: clean({
        ...(logoAsset ? { logoUrl: logoAsset.url } : {}),
        ...(coverAsset ? { coverImageUrl: coverAsset.url } : {})
      })
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
        coverAssetId: coverAsset?.id
      })
    });
    return ok({ org, assets: clean({ logoAsset, coverAsset }) });
  }
  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "join-mode"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_PROFILE");
    const body = (await readJson(request)) as { joinMode: "OPEN_JOIN" | "APPROVAL_REQUIRED" | "INVITE_ONLY" };
    const org = await prisma.organization.update({ where: { id: orgId }, data: { joinMode: body.joinMode } });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "organization.join_mode_updated",
      entityType: "organization",
      entityId: org.id,
      metadata: { joinMode: body.joinMode }
    });
    return ok({ org });
  }
  return undefined;
}

async function handleMembershipPayments(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "membership-plans"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "MEMBERSHIP_PLAN_MANAGE");
    return ok({ plans: await prisma.membershipPlan.findMany({ where: { orgId }, orderBy: { createdAt: "desc" } }) });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "membership-plans"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "MEMBERSHIP_PLAN_MANAGE");
    const body = membershipPlanSchema.parse(await readJson(request));
    const branch = await prisma.branch.findFirst({ where: { orgId, isDefault: true } });
    const plan = await prisma.membershipPlan.create({
      data: clean({
        orgId,
        branchId: branch?.id,
        name: body.name,
        description: body.description,
        type: body.type,
        pricePaise: body.pricePaise,
        durationDays: body.durationDays,
        visitLimit: body.visitLimit,
        validityDays: body.validityDays,
        publicVisible: body.publicVisible,
        createdById: userId
      })
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "membership_plan.created",
      entityType: "membership_plan",
      entityId: plan.id,
      metadata: { name: plan.name, type: plan.type }
    });
    return ok({ plan });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "join-requests"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const orgId = path[1]!;
    const body = joinRequestSchema.parse(await readJson(request));
    const organization = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!organization || organization.visibility === "HIDDEN") {
      throw notFoundError("Gym not found");
    }
    if (organization.joinMode === "OPEN_JOIN") {
      throw conflictError("This gym supports direct join. Start checkout instead of requesting approval.");
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
    await resolveValidatedReferral({ orgId, userId, ...(body.referralCode ? { referralCode: body.referralCode } : {}) });
    const [existingPending, existingSubscription] = await Promise.all([
      prisma.membershipJoinRequest.findFirst({
        where: { orgId, userId, status: { in: ["pending", "approved"] } },
        orderBy: { createdAt: "desc" }
      }),
      prisma.memberSubscription.findFirst({
        where: { orgId, memberUserId: userId, status: { in: ["PENDING_PAYMENT", "ACTIVE"] } },
        orderBy: { createdAt: "desc" }
      })
    ]);
    if (existingPending) {
      throw conflictError("You already have a join request in progress for this gym.");
    }
    if (existingSubscription) {
      throw conflictError("You already have a membership in progress for this gym.");
    }
    const requestRow = await prisma.membershipJoinRequest.create({
      data: clean({ orgId, userId, planId: body.planId, referralCode: body.referralCode, message: body.message })
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
        take: 100
      })
    });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "join-requests", /.+/, "approve"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "MEMBERS_MANAGE");
    const existingJoinRequest = await prisma.membershipJoinRequest.findFirst({
      where: { id: path[3]!, orgId }
    });
    if (!existingJoinRequest) {
      throw notFoundError("Join request not found");
    }
    const joinRequest = await prisma.membershipJoinRequest.update({
      where: { id: existingJoinRequest.id },
      data: { status: "approved", reviewedById: userId, reviewedAt: new Date() }
    });
    await createDirectNotification({
      orgId,
      createdById: userId,
      type: "TRANSACTIONAL",
      title: "Membership request approved",
      body: "You can now continue to checkout and activate your membership in Zook.",
      audience: "selected_member",
      userIds: [joinRequest.userId],
      metadata: { joinRequestId: joinRequest.id, orgId }
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "membership_join_request.approved",
      entityType: "membership_join_request",
      entityId: joinRequest.id
    });
    return ok({ joinRequest });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "join-requests", /.+/, "reject"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "MEMBERS_MANAGE");
    const existingJoinRequest = await prisma.membershipJoinRequest.findFirst({
      where: { id: path[3]!, orgId }
    });
    if (!existingJoinRequest) {
      throw notFoundError("Join request not found");
    }
    const joinRequest = await prisma.membershipJoinRequest.update({
      where: { id: existingJoinRequest.id },
      data: { status: "rejected", reviewedById: userId, reviewedAt: new Date() }
    });
    await createDirectNotification({
      orgId,
      createdById: userId,
      type: "TRANSACTIONAL",
      title: "Membership request rejected",
      body: "Your join request was not approved. Contact the gym for the next step.",
      audience: "selected_member",
      userIds: [joinRequest.userId],
      metadata: { joinRequestId: joinRequest.id, orgId }
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "membership_join_request.rejected",
      entityType: "membership_join_request",
      entityId: joinRequest.id
    });
    return ok({ joinRequest });
  }
  if (request.method === "POST" && pathMatches(path, ["payments", "checkout"])) {
    const ctx = await getRequestContext(request);
    const userId = ctx.userId;
    assertRateLimit("paymentSessionByActor", userId ?? getClientIp(request), "Too many payment sessions requested.");
    const body = checkoutSchema.parse(await readJson(request));
    const session = await prisma.paymentSession.create({
      data: clean({
        orgId: body.orgId,
        userId: body.userId ?? userId,
        purpose: body.purpose,
        amountPaise: body.amountPaise,
        currency: body.currency,
        status: "CREATED",
        checkoutUrl: "",
        metadata: (body.metadata ?? {}) as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      })
    });
    const checkoutUrl = `/checkout/mock/${session.id}`;
    const updated = await prisma.paymentSession.update({ where: { id: session.id }, data: { checkoutUrl } });
    return ok({ session: updated, checkoutUrl });
  }
  if (request.method === "GET" && pathMatches(path, ["payments", "session", /.+/])) {
    const session = await prisma.paymentSession.findUnique({ where: { id: path[2]! } });
    return session ? ok({ session }) : fail("NOT_FOUND", "Payment session not found", 404);
  }
  if (request.method === "POST" && pathMatches(path, ["payments", "mock", /.+/, "complete"])) {
    const sessionId = path[2]!;
    const body = completeMockPaymentSchema.parse(await readJson(request));
    const status = body.status ?? "SUCCEEDED";
    const currentSession = await prisma.paymentSession.findUnique({ where: { id: sessionId } });
    if (!currentSession) {
      throw notFoundError("Payment session not found");
    }
    const providerEventId = `mock:${sessionId}:${status}`;
    const existingEvent = await prisma.paymentEvent.findUnique({
      where: {
        provider_providerEventId: {
          provider: "mock",
          providerEventId
        }
      }
    });
    if (existingEvent?.processedAt) {
      const existingPayment = await prisma.payment.findFirst({
        where: { sessionId: currentSession.id, status: "SUCCEEDED" },
        orderBy: { createdAt: "desc" }
      });
      return ok({ session: currentSession, payment: existingPayment, duplicateEvent: true });
    }
    if (!existingEvent) {
      await prisma.paymentEvent.create({
        data: {
          paymentId: null,
          provider: "mock",
          providerEventId,
          eventType: `payment.${status.toLowerCase()}`,
          payload: body as Prisma.InputJsonValue,
          signatureVerified: true
        }
      });
    }
    const nextState = transitionPaymentSession(
      {
        id: currentSession.id,
        purpose: currentSession.purpose,
        amountPaise: currentSession.amountPaise,
        status: currentSession.status
      },
      status
    );
    const session = await prisma.paymentSession.update({
      where: { id: sessionId },
      data: clean({
        status: nextState.status,
        completedAt: nextState.status === "SUCCEEDED" ? new Date() : undefined
      })
    });
    let payment =
      session.status === "SUCCEEDED"
        ? await prisma.payment.findFirst({
            where: { sessionId: session.id, status: "SUCCEEDED" },
            orderBy: { createdAt: "desc" }
          })
        : null;
    const metadata = (session.metadata ?? {}) as {
      subscriptionId?: string;
      shopOrderId?: string;
      couponId?: string;
      referralCodeId?: string;
      joinRequestId?: string;
    };
    if (session.status === "SUCCEEDED") {
      if (!payment) {
        payment = await prisma.payment.create({
          data: {
            orgId: session.orgId,
            userId: session.userId,
            sessionId: session.id,
            purpose: session.purpose,
            amountPaise: session.amountPaise,
            status: "SUCCEEDED",
            mode: "MOCK_ONLINE",
            provider: "mock",
            providerRef: `mock_${session.id}`,
            recordedAt: new Date()
          }
        });
      }
      if (metadata.subscriptionId) {
        const [planSub, user] = await Promise.all([
          prisma.memberSubscription.findUnique({ where: { id: metadata.subscriptionId } }),
          session.userId ? prisma.user.findUnique({ where: { id: session.userId } }) : Promise.resolve(null)
        ]);
        const plan = planSub ? await prisma.membershipPlan.findUnique({ where: { id: planSub.planId } }) : null;
        if (planSub && plan && session.userId && user) {
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
              publicVisible: plan.publicVisible
            })
          );
          await prisma.memberSubscription.update({
            where: { id: metadata.subscriptionId },
            data: clean({
              status: "ACTIVE",
              startsAt: window.startsAt,
              endsAt: window.endsAt,
              remainingVisits: window.remainingVisits,
              paymentId: payment.id,
              activatedById: session.userId
            })
          });
          await ensureOrganizationMembership({
            orgId: planSub.orgId,
            userId: session.userId,
            profilePhotoUrl: user.profilePhotoUrl,
            marketingOptIn: user.isMinor ? false : user.marketingOptIn
          });
          if (metadata.couponId) {
            const existingCouponRedemption = await prisma.couponRedemption.findFirst({
              where: { paymentSessionId: session.id, couponId: metadata.couponId, userId: session.userId }
            });
            if (!existingCouponRedemption) {
              await prisma.couponRedemption.create({
                data: {
                  orgId: planSub.orgId,
                  couponId: metadata.couponId,
                  userId: session.userId,
                  subscriptionId: planSub.id,
                  paymentSessionId: session.id,
                  discountPaise: Math.max(plan.pricePaise - session.amountPaise, 0)
                }
              });
            }
          }
          if (metadata.referralCodeId) {
            const existingReferralRedemption = await prisma.referralRedemption.findFirst({
              where: {
                orgId: planSub.orgId,
                referralCodeId: metadata.referralCodeId,
                referredUserId: session.userId
              }
            });
            if (!existingReferralRedemption) {
              await prisma.referralRedemption.create({
                data: {
                  orgId: planSub.orgId,
                  referralCodeId: metadata.referralCodeId,
                  referredUserId: session.userId,
                  subscriptionId: planSub.id
                }
              });
              await prisma.referralCode.update({
                where: { id: metadata.referralCodeId },
                data: { redemptionCount: { increment: 1 } }
              });
            }
          }
          await createDirectNotification({
            orgId: planSub.orgId,
            createdById: session.userId,
            type: "TRANSACTIONAL",
            title: "Membership activated",
            body: `Your ${plan.name} membership is now active.`,
            audience: "selected_member",
            userIds: [session.userId],
            metadata: { subscriptionId: planSub.id, paymentId: payment.id }
          });
        }
      }
      if (metadata.shopOrderId) {
        const existingOrder = await prisma.shopOrder.findUnique({ where: { id: metadata.shopOrderId } });
        if (existingOrder && payment && existingOrder.status === "PENDING_PAYMENT") {
          const paymentId = payment.id;
          const items = await prisma.shopOrderItem.findMany({ where: { orderId: existingOrder.id } });
          const orderProducts = await prisma.product.findMany({
            where: { id: { in: items.map((item) => item.productId) } }
          });
          const calculation = calculateShopOrder({
            products: orderProducts.map((product) => ({
              id: product.id,
              stock: product.stock,
              pricePaise: product.pricePaise,
              active: product.active
            })),
            items: items.map((item) => ({ productId: item.productId, quantity: item.quantity }))
          });
          const readyOrder = markShopOrderPaid(
            { id: existingOrder.id, status: existingOrder.status, totalPaise: existingOrder.totalPaise },
            `ZK-${session.id.slice(-6).toUpperCase()}`
          );
          await prisma.$transaction(async (tx) => {
            await Promise.all(
              calculation.stockDeltas.map(async (delta) => {
                await tx.product.update({
                  where: { id: delta.productId },
                  data: { stock: { increment: delta.delta } }
                });
                await tx.inventoryMovement.create({
                  data: clean({
                    orgId: existingOrder.orgId,
                    productId: delta.productId,
                    delta: delta.delta,
                    reason: "shop_order_paid",
                    orderId: existingOrder.id,
                    createdById: session.userId ?? undefined
                  })
                });
              })
            );
            await tx.shopOrder.update({
              where: { id: existingOrder.id },
              data: clean({
                status: readyOrder.status,
                paymentId,
                pickupCode: readyOrder.pickupCode,
                paymentSessionId: session.id
              })
            });
            await tx.pickupCode.upsert({
              where: { orderId: existingOrder.id },
              update: { code: readyOrder.pickupCode ?? `ZK-${session.id.slice(-6).toUpperCase()}`, status: readyOrder.status },
              create: {
                orgId: existingOrder.orgId,
                orderId: existingOrder.id,
                code: readyOrder.pickupCode ?? `ZK-${session.id.slice(-6).toUpperCase()}`,
                status: readyOrder.status
              }
            });
          });
          await createDirectNotification({
            orgId: existingOrder.orgId,
            type: "TRANSACTIONAL",
            title: "Order ready for pickup",
            body: `Your pickup code is ${readyOrder.pickupCode}. Show it at reception to collect the order.`,
            audience: "selected_member",
            userIds: [existingOrder.userId],
            ...(session.userId ? { createdById: session.userId } : {}),
            metadata: clean({ orderId: existingOrder.id, pickupCode: readyOrder.pickupCode })
          });
        }
      }
    }
    await prisma.paymentEvent.update({
      where: {
        provider_providerEventId: {
          provider: "mock",
          providerEventId
        }
      },
      data: clean({
        paymentId: payment?.id,
        processedAt: new Date(),
        processingError: null
      })
    });
    return ok({ session, payment });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "subscriptions"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    assertRateLimit("paymentSessionByActor", `${path[1]!}:${userId}`, "Too many membership checkout attempts.");
    const orgId = path[1]!;
    const body = subscriptionCheckoutSchema.parse(await readJson(request));
    const [organization, plan, branch, existingSubscription, approvedJoinRequest, user] = await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId } }),
      prisma.membershipPlan.findFirst({ where: { id: body.planId, orgId, active: true } }),
      prisma.branch.findFirst({ where: { orgId, isDefault: true } }),
      prisma.memberSubscription.findFirst({
        where: { orgId, memberUserId: userId, status: { in: ["PENDING_PAYMENT", "ACTIVE"] } },
        orderBy: { createdAt: "desc" }
      }),
      prisma.membershipJoinRequest.findFirst({
        where: { orgId, userId, status: "approved" },
        orderBy: { reviewedAt: "desc" }
      }),
      prisma.user.findUniqueOrThrow({ where: { id: userId } })
    ]);
    if (!organization || !plan || !branch) {
      return fail("NOT_FOUND", "Plan or branch not found", 404);
    }
    if (organization.status === "SUSPENDED" || organization.status === "CANCELLED" || organization.status === "TRIAL_EXPIRED") {
      throw forbiddenError("This gym is not accepting new membership purchases right now.");
    }
    if (user.isMinor && user.guardianPending) {
      throw forbiddenError("Guardian consent is required before purchasing a membership.");
    }
    if (existingSubscription) {
      throw conflictError("You already have a membership in progress for this gym.");
    }
    const referral = await resolveValidatedReferral({
      orgId,
      userId,
      ...(body.referralCode ? { referralCode: body.referralCode } : {})
    });
    if (organization.joinMode === "APPROVAL_REQUIRED" && !approvedJoinRequest) {
      throw forbiddenError("This gym requires approval before checkout.");
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
      ...(referral?.couponId ? { fallbackCouponId: referral.couponId } : {})
    });
    const subscription = await prisma.memberSubscription.create({
      data: {
        orgId,
        branchId: branch.id,
        memberUserId: userId,
        planId: plan.id,
        status: "PENDING_PAYMENT"
      }
    });
    const session = await prisma.paymentSession.create({
      data: {
        orgId,
        userId,
        purpose: "MEMBERSHIP",
        amountPaise: pricing.finalAmountPaise,
        status: "CREATED",
        checkoutUrl: `/checkout/mock/pending`,
        metadata: clean({
          subscriptionId: subscription.id,
          couponId: pricing.coupon?.id,
          referralCodeId: referral?.id,
          joinRequestId: approvedJoinRequest?.id
        }) as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      }
    });
    const updated = await prisma.paymentSession.update({
      where: { id: session.id },
      data: { checkoutUrl: `/checkout/mock/${session.id}` }
    });
    return ok({ subscription, checkoutUrl: updated.checkoutUrl, session: updated });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "memberships"])) {
    const userId = requireAuth(await getRequestContext(request));
    const subscriptions = await prisma.memberSubscription.findMany({
      where: { memberUserId: userId },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    const [plans, organizations] = await Promise.all([
      prisma.membershipPlan.findMany({ where: { id: { in: subscriptions.map((subscription) => subscription.planId) } } }),
      prisma.organization.findMany({ where: { id: { in: subscriptions.map((subscription) => subscription.orgId) } } })
    ]);
    return ok({
      subscriptions: subscriptions.map((subscription) => ({
        ...subscription,
        plan: plans.find((plan) => plan.id === subscription.planId) ?? null,
        organization: organizations.find((organization) => organization.id === subscription.orgId) ?? null
      }))
    });
  }
  return undefined;
}

async function handleCouponsReferrals(request: NextRequest, path: string[]) {
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
        createdById: userId
      })
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "coupon.created",
      entityType: "coupon",
      entityId: coupon.id,
      metadata: { code: coupon.code }
    });
    return ok({ coupon });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "referrals"])) {
    const userId = requireAuth(await getRequestContext(request));
    const orgId = path[1]!;
    const code = `ZK${randomBytes(4).toString("hex").toUpperCase()}`;
    const referral = await prisma.referralCode.create({
      data: { orgId, referrerUserId: userId, code, createdByRole: "MEMBER", maxUses: 20 }
    });
    return ok({ referral, links: { web: `/join/${orgId}?ref=${code}`, short: `/r/${code}` } });
  }
  if (request.method === "GET" && pathMatches(path, ["r", /.+/])) {
    const referral = await prisma.referralCode.findUnique({ where: { code: path[1]! } });
    if (!referral) return fail("NOT_FOUND", "Referral not found", 404);
    const org = await prisma.organization.findUnique({ where: { id: referral.orgId } });
    return ok({ referral, org });
  }
  return undefined;
}

async function handleAttendance(request: NextRequest, path: string[]) {
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "attendance", "qr-token"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ATTENDANCE_QR_DISPLAY");
    const branch = await prisma.branch.findFirst({ where: { orgId, isDefault: true } });
    if (!branch) return fail("NOT_FOUND", "Default branch not found", 404);
    const payload = createSignedQrToken({
      orgId,
      branchId: branch.id,
      secret: process.env.ZOOK_QR_SECRET ?? "dev-secret"
    });
    await prisma.attendanceQrToken.create({
      data: {
        orgId,
        branchId: branch.id,
        nonce: payload.nonce,
        issuedAt: new Date(payload.timestamp),
        expiresAt: new Date(payload.expiry),
        signature: payload.signature,
        createdById: userId
      }
    });
    return ok({ qrPayload: encodeQrPayload(payload), expiresAt: new Date(payload.expiry) });
  }
  if (request.method === "POST" && pathMatches(path, ["attendance", "scan"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const body = attendanceScanSchema.parse(await readJson(request));
    assertRateLimit(
      "qrScanByActor",
      `${userId}:${body.deviceId ?? "unknown-device"}`,
      "Too many attendance scans. Please wait before trying again."
    );
    const now = new Date();
    const decoded = validateSignedQrToken({
      encoded: body.qrPayload,
      secret: process.env.ZOOK_QR_SECRET ?? "dev-secret",
      now
    });
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
    const [org, memberProfile, subscription, duplicate] = await Promise.all([
      prisma.organization.findUnique({ where: { id: decoded.orgId } }),
      prisma.memberProfile.findUnique({ where: { orgId_userId: { orgId: decoded.orgId, userId } } }),
      prisma.memberSubscription.findFirst({
        where: { orgId: decoded.orgId, memberUserId: userId, status: "ACTIVE" },
        orderBy: { createdAt: "desc" }
      }),
      prisma.attendanceRecord.findUnique({
        where: {
          orgId_branchId_userId_dateKey: {
            orgId: decoded.orgId,
            branchId: decoded.branchId,
            userId,
            dateKey: dateKey()
          }
        }
      })
    ]);
    if (duplicate) {
      return ok({
        attendance: duplicate,
        status: duplicate.status,
        duplicate: true,
        suspiciousFlags: Array.isArray(duplicate.suspiciousFlags) ? duplicate.suspiciousFlags : ["duplicate_same_day"]
      });
    }
    if (!org || !subscription) {
      return fail("NO_ACTIVE_MEMBERSHIP", "No active membership", 400);
    }
    const plan = await prisma.membershipPlan.findUnique({ where: { id: subscription.planId } });
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
        remainingVisits: subscription.remainingVisits ?? undefined
      }),
      plan: toMembershipPlanInput(plan),
      orgStatus: org.status,
      hasProfilePhoto: Boolean(memberProfile?.profilePhotoUrl),
      alreadyCheckedInToday: false,
      wrongBranch: subscription.branchId !== decoded.branchId,
      now
    });
    if (!validation.allowed) {
      return fail(validation.reason?.toUpperCase() ?? "ATTENDANCE_BLOCKED", validation.reason ?? "Attendance blocked", 400);
    }
    const status = decideAttendanceStatus({ mode: org.attendanceMode, suspiciousFlags: validation.suspiciousFlags });
    const record = await prisma.attendanceRecord.create({
      data: clean({
        orgId: decoded.orgId,
        branchId: decoded.branchId,
        userId,
        subscriptionId: subscription.id,
        dateKey: dateKey(),
        status,
        source: "QR_SCAN",
        qrTokenId: decoded.nonce,
        suspiciousFlags: validation.suspiciousFlags,
        deviceId: body.deviceId
      })
    });
    if (status === "APPROVED") {
      await applyAttendanceUsage({
        orgId: decoded.orgId,
        subscription,
        plan,
        recordId: record.id,
        multiEntryConsumes: org.multiEntryConsumes
      });
    }
    return ok({ attendance: record, status, duplicate: false, suspiciousFlags: validation.suspiciousFlags });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "attendance", "live"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "ATTENDANCE_APPROVE");
    const records = await prisma.attendanceRecord.findMany({
      where: { orgId, status: { in: ["PENDING_APPROVAL", "FLAGGED"] } },
      take: 40,
      orderBy: { checkedInAt: "desc" }
    });
    const [users, profiles, subscriptions, plans] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: records.map((record) => record.userId) } } }),
      prisma.memberProfile.findMany({
        where: { orgId, userId: { in: records.map((record) => record.userId) } }
      }),
      prisma.memberSubscription.findMany({
        where: { id: { in: records.map((record) => record.subscriptionId).filter(Boolean) as string[] } }
      }),
      prisma.membershipPlan.findMany({
        where: {
          id: {
            in: (
              await prisma.memberSubscription.findMany({
                where: { id: { in: records.map((record) => record.subscriptionId).filter(Boolean) as string[] } },
                select: { planId: true }
              })
            ).map((subscription) => subscription.planId)
          }
        }
      })
    ]);
    return ok({
      records: records.map((record) => {
        const user = users.find((candidate) => candidate.id === record.userId) ?? null;
        const profile = profiles.find((candidate) => candidate.userId === record.userId) ?? null;
        const subscription = subscriptions.find((candidate) => candidate.id === record.subscriptionId) ?? null;
        const plan = subscription ? plans.find((candidate) => candidate.id === subscription.planId) ?? null : null;
        return { ...record, user, profile, subscription, plan };
      })
    });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "attendance", /.+/, "approve"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ATTENDANCE_APPROVE");
    const existingRecord = await prisma.attendanceRecord.findFirst({ where: { id: path[3]!, orgId } });
    if (!existingRecord) {
      throw notFoundError("Attendance record not found");
    }
    if (existingRecord.status === "REJECTED") {
      throw conflictError("Rejected attendance records cannot be approved.");
    }
    const record = await prisma.attendanceRecord.update({
      where: { id: existingRecord.id },
      data: { status: "APPROVED", approvedById: userId, approvedAt: new Date() }
    });
    if (record.subscriptionId) {
      const subscription = await prisma.memberSubscription.findUnique({ where: { id: record.subscriptionId } });
      const plan = subscription ? await prisma.membershipPlan.findUnique({ where: { id: subscription.planId } }) : null;
      const org = await prisma.organization.findUnique({ where: { id: orgId } });
      if (subscription && plan && org) {
        await applyAttendanceUsage({
          orgId,
          subscription,
          plan,
          recordId: record.id,
          multiEntryConsumes: org.multiEntryConsumes
        });
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
      metadata: { attendanceRecordId: record.id }
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "attendance.approved",
      entityType: "attendance_record",
      entityId: record.id
    });
    return ok({
      record
    });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "attendance", /.+/, "reject"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ATTENDANCE_APPROVE");
    const body = attendanceRejectSchema.parse(await readJson(request));
    const existingRecord = await prisma.attendanceRecord.findFirst({ where: { id: path[3]!, orgId } });
    if (!existingRecord) {
      throw notFoundError("Attendance record not found");
    }
    const record = await prisma.attendanceRecord.update({
      where: { id: existingRecord.id },
      data: {
        status: "REJECTED",
        rejectedById: userId,
        rejectedAt: new Date(),
        rejectionReason: body.reason
      }
    });
    await createDirectNotification({
      orgId,
      createdById: userId,
      type: "TRANSACTIONAL",
      title: "Check-in rejected",
      body: body.reason,
      audience: "selected_member",
      userIds: [record.userId],
      metadata: { attendanceRecordId: record.id }
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "attendance.rejected",
      entityType: "attendance_record",
      entityId: record.id,
      metadata: { reason: body.reason }
    });
    return ok({ record });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "attendance", "manual"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ATTENDANCE_MANUAL_OVERRIDE");
    const body = manualAttendanceSchema.parse(await readJson(request));
    requireManualOverrideReason(body.reason);
    const branch = body.branchId
      ? await prisma.branch.findFirst({ where: { id: body.branchId, orgId } })
      : await prisma.branch.findFirst({ where: { orgId, isDefault: true } });
    if (!branch) return fail("NOT_FOUND", "Branch not found", 404);
    const duplicate = await prisma.attendanceRecord.findUnique({
      where: {
        orgId_branchId_userId_dateKey: {
          orgId,
          branchId: branch.id,
          userId: body.memberUserId,
          dateKey: dateKey()
        }
      }
    });
    if (duplicate) {
      throw conflictError("Member already has an attendance record for today.");
    }
    const record = await prisma.attendanceRecord.create({
      data: {
        orgId,
        branchId: branch.id,
        userId: body.memberUserId,
        dateKey: dateKey(),
        status: "APPROVED",
        source: "MANUAL",
        approvedById: userId,
        approvedAt: new Date(),
        suspiciousFlags: ["manual_override"]
      }
    });
    await prisma.attendanceOverride.create({
      data: clean({
        orgId,
        attendanceRecordId: record.id,
        userId: body.memberUserId,
        reason: body.reason,
        notes: body.notes,
        createdById: userId
      })
    });
    const subscription = await prisma.memberSubscription.findFirst({
      where: { orgId, branchId: branch.id, memberUserId: body.memberUserId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" }
    });
    const plan = subscription ? await prisma.membershipPlan.findUnique({ where: { id: subscription.planId } }) : null;
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (subscription && plan && org) {
      await applyAttendanceUsage({
        orgId,
        subscription,
        plan,
        recordId: record.id,
        multiEntryConsumes: org.multiEntryConsumes
      });
    }
    await createDirectNotification({
      orgId,
      createdById: userId,
      type: "TRANSACTIONAL",
      title: "Manual attendance recorded",
      body: `Attendance was recorded manually: ${body.reason}.`,
      audience: "selected_member",
      userIds: [body.memberUserId],
      metadata: { attendanceRecordId: record.id }
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "attendance.manual_override",
      entityType: "attendance_record",
      entityId: record.id,
      metadata: { memberUserId: body.memberUserId, reason: body.reason }
    });
    return ok({ record });
  }
  return undefined;
}

async function handleStaffPlansGoals(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "staff"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "ORG_MANAGE_STAFF");
    const staff = await prisma.organizationRoleAssignment.findMany({ where: { orgId, role: { not: "MEMBER" } } });
    const users = await prisma.user.findMany({ where: { id: { in: staff.map((row) => row.userId) } } });
    return ok({ staff, users });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "staff", "invite"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_STAFF");
    const body = (await readJson(request)) as { email: string; role: Role };
    const invite = await prisma.staffInvitation.create({
      data: {
        orgId,
        email: body.email,
        role: body.role,
        token: randomBytes(18).toString("base64url"),
        invitedById: userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "staff.invited",
      entityType: "staff_invitation",
      entityId: invite.id,
      metadata: { email: body.email, role: body.role }
    });
    return ok({ invite });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "permissions"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "ORG_MANAGE_PERMISSIONS");
    return ok({ permissions: await prisma.organizationRolePermission.findMany({ where: { orgId } }) });
  }
  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "permissions"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_PERMISSIONS");
    const body = (await readJson(request)) as { role: Role; permission: string; enabled: boolean };
    const permission = await prisma.organizationRolePermission.upsert({
      where: { orgId_role_permission: { orgId, role: body.role, permission: body.permission as never } },
      update: { enabled: body.enabled, overriddenByUserId: userId },
      create: { orgId, role: body.role, permission: body.permission as never, enabled: body.enabled, overriddenByUserId: userId }
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "permissions.updated",
      entityType: "organization_role_permission",
      entityId: permission.id,
      metadata: body
    });
    return ok({ permission });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "manual-payments"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "PAYMENTS_RECORD_OFFLINE");
    const body = manualMembershipPaymentSchema.parse(await readJson(request));
    const memberUser = await prisma.user.findUnique({ where: { id: body.memberUserId } });
    const proofAsset = await getOrganizationScopedFileAsset(body.proofAssetId, orgId, ["payment_proof"]);
    if (!memberUser) {
      throw notFoundError("Member not found");
    }
    const payment = await prisma.payment.create({
      data: clean({
        orgId,
        userId: body.memberUserId,
        purpose: "MEMBERSHIP",
        amountPaise: body.amountPaise,
        status: "SUCCEEDED",
        mode: body.mode,
        proofAssetId: proofAsset?.id,
        receiptNumber: body.receiptNumber,
        notes: body.notes,
        recordedById: userId,
        recordedAt: new Date()
      })
    });
    let subscription = null;
    if (body.subscriptionId) {
      const existingSubscription = await prisma.memberSubscription.findFirst({
        where: { id: body.subscriptionId, orgId, memberUserId: body.memberUserId }
      });
      if (!existingSubscription) {
        throw notFoundError("Subscription not found");
      }
      if (existingSubscription.status === "ACTIVE") {
        throw conflictError("Subscription is already active");
      }
      const plan = await prisma.membershipPlan.findFirst({
        where: { id: existingSubscription.planId, orgId }
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
          publicVisible: plan.publicVisible
        })
      );
      subscription = await prisma.memberSubscription.update({
        where: { id: existingSubscription.id },
        data: clean({
          status: "ACTIVE",
          startsAt: window.startsAt,
          endsAt: window.endsAt,
          remainingVisits: window.remainingVisits,
          paymentId: payment.id,
          activatedById: userId
        })
      });
    } else {
      const planId = body.planId;
      if (!planId) {
        throw validationError("A plan is required for manual membership activation.");
      }
      const [plan, branch] = await Promise.all([
        prisma.membershipPlan.findFirst({ where: { id: planId, orgId, active: true } }),
        prisma.branch.findFirst({ where: { orgId, isDefault: true } })
      ]);
      if (!plan || !branch) {
        throw notFoundError("Plan or branch not found");
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
          publicVisible: plan.publicVisible
        })
      );
      subscription = await prisma.memberSubscription.create({
        data: clean({
          orgId,
          branchId: branch.id,
          memberUserId: body.memberUserId,
          planId: plan.id,
          status: "ACTIVE",
          startsAt: window.startsAt,
          endsAt: window.endsAt,
          remainingVisits: window.remainingVisits,
          paymentId: payment.id,
          activatedById: userId
        })
      });
    }
    await ensureOrganizationMembership({
      orgId,
      userId: body.memberUserId,
      profilePhotoUrl: memberUser.profilePhotoUrl,
      marketingOptIn: memberUser.isMinor ? false : memberUser.marketingOptIn
    });
    await createDirectNotification({
      orgId,
      createdById: userId,
      type: "TRANSACTIONAL",
      title: "Membership activated",
      body: "Your membership has been activated with an offline payment record.",
      audience: "selected_member",
      userIds: [body.memberUserId],
      metadata: clean({ paymentId: payment.id, subscriptionId: subscription?.id })
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "payment.manual_recorded",
      entityType: "payment",
      entityId: payment.id,
        metadata: { amountPaise: payment.amountPaise, mode: payment.mode }
    });
    return ok({ payment, subscription });
  }
  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "trainers", /.+/, "profile"])) {
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
    const upiQrAsset = await getOrganizationScopedFileAsset(body.upiQrAssetId, orgId, ["trainer_upi_qr"]);
    const profile = await prisma.trainerProfile.upsert({
      where: { orgId_userId: { orgId, userId: trainerUserId } },
      update: clean({
        ...(body.bio !== undefined ? { bio: body.bio } : {}),
        ...(body.upiId !== undefined ? { upiId: body.upiId } : {}),
        ...(upiQrAsset ? { upiQrAssetId: upiQrAsset.id } : {})
      }),
      create: clean({
        orgId,
        userId: trainerUserId,
        ...(body.bio ? { bio: body.bio } : {}),
        ...(body.upiId ? { upiId: body.upiId } : {}),
        ...(upiQrAsset ? { upiQrAssetId: upiQrAsset.id } : {})
      })
    });
    return ok({ profile, upiQrFile: upiQrAsset });
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
      orderBy: { createdAt: "desc" }
    });
    const [users, profiles] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: assignments.map((assignment) => assignment.memberUserId) } } }),
      prisma.memberProfile.findMany({
        where: { orgId, userId: { in: assignments.map((assignment) => assignment.memberUserId) } }
      })
    ]);
    return ok({
      clients: assignments.map((assignment) => ({
        ...assignment,
        user: users.find((user) => user.id === assignment.memberUserId) ?? null,
        profile: profiles.find((profile) => profile.userId === assignment.memberUserId) ?? null
      }))
    });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "trainers", /.+/, "pt-plans"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "PT_RECORD");
    const body = (await readJson(request)) as { name: string; description?: string; sessionCount?: number; durationDays?: number; pricePaise: number };
    const plan = await prisma.personalTrainingPlan.create({
      data: clean({
        orgId,
        trainerUserId: path[3]!,
        name: body.name,
        description: body.description,
        sessionCount: body.sessionCount,
        durationDays: body.durationDays,
        pricePaise: body.pricePaise
      })
    });
    return ok({ plan });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "pt-subscriptions"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "PT_RECORD");
    const body = ptSubscriptionSchema.parse(await readJson(request));
    const proofAsset = await getOrganizationScopedFileAsset(body.proofAssetId, orgId, ["payment_proof"]);
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
        notes: body.notes,
        recordedById: userId
      })
    });
    return ok({ subscription: sub });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "plans"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "PLANS_CREATE");
    const plans = await prisma.planContent.findMany({
      where: { orgId },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: 100
    });
    const assignments = await prisma.planAssignment.findMany({
      where: { orgId, planId: { in: plans.map((plan) => plan.id) } }
    });
    return ok({
      plans: plans.map((plan) => ({
        ...plan,
        assignmentCount: assignments.filter((assignment) => assignment.planId === plan.id).length
      }))
    });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "plans"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "PLANS_CREATE");
    const body = planContentInputSchema.parse(await readJson(request));
    const imageAsset = await getOrganizationScopedFileAsset(body.imageAssetId, orgId, ["plan_image", "ai_generated_image"]);
    const attachments = imageAsset
      ? ({
          coverImage: {
            fileAssetId: imageAsset.id,
            url: imageAsset.url
          }
        } as Prisma.InputJsonValue)
      : undefined;
    const plan = await prisma.planContent.create({
      data: clean({
        orgId,
        creatorUserId: userId,
        type: body.type as never,
        title: body.title,
        description: body.description,
        content: body.content as Prisma.InputJsonValue,
        attachments,
        aiGenerated: body.aiGenerated,
        visibility: body.visibility
      })
    });
    await prisma.planVersion.create({
      data: {
        orgId,
        planId: plan.id,
        versionNo: 1,
        content: createPlanVersionSnapshot({
          title: body.title,
          ...clean({
            description: body.description,
            aiGenerated: body.aiGenerated,
            visibility: body.visibility,
            attachments
          }),
          content: body.content
        }) as Prisma.InputJsonValue,
        createdById: userId
      }
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "plan.created",
      entityType: "plan_content",
      entityId: plan.id,
      metadata: { title: plan.title, type: plan.type }
    });
    return ok({ plan });
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
      data: { status: "PUBLISHED", reviewed: true, reviewedById: userId }
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "plan.published",
      entityType: "plan_content",
      entityId: plan.id
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
    const body = planAssignSchema.parse(await readJson(request));
    const assignedClientUserIds = ctx.roles.includes("TRAINER")
      ? (
          await prisma.trainerAssignment.findMany({
            where: { orgId, trainerUserId: userId, active: true },
            select: { memberUserId: true }
          })
        ).map((assignment) => assignment.memberUserId)
      : [];
    if (
      !canAssignPlanToUser({
        actorRoles: ctx.roles,
        actorPermissions: ctx.permissions,
        audience: body.audience,
        assignedClientUserIds,
        ...(body.assignedToUserId ? { targetUserId: body.assignedToUserId } : {})
      })
    ) {
      throw forbiddenError("You can only assign plans to your own clients or within your granted scope.");
    }
    const assignment = await prisma.planAssignment.create({
      data: clean({
        orgId,
        planId: existingPlan.id,
        assignedById: userId,
        assignedToUserId: body.assignedToUserId,
        audience: body.audience
      })
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
        metadata: { assignmentId: assignment.id, planId: existingPlan.id }
      });
    }
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "plan.assigned",
      entityType: "plan_assignment",
      entityId: assignment.id,
      metadata: { assignedToUserId: body.assignedToUserId, audience: body.audience ?? "selected_member" }
    });
    return ok({ assignment });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "plans"])) {
    const userId = requireAuth(await getRequestContext(request));
    return ok({ plans: await listPlanAssignmentsForUser(userId) });
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
      where: { id: path[2]!, assignedToUserId: userId, active: true }
    });
    if (!assignment) {
      throw notFoundError("Plan assignment not found");
    }
    const progress = await prisma.planProgress.upsert({
      where: { assignmentId_userId: { assignmentId: path[2]!, userId } },
      update: clean({
        progressJson: body.progressJson as Prisma.InputJsonValue,
        completionPct: body.completionPct,
        feedback: body.feedback
      }),
      create: clean({
        orgId: body.orgId ?? assignment.orgId,
        assignmentId: path[2]!,
        userId,
        progressJson: body.progressJson as Prisma.InputJsonValue,
        completionPct: body.completionPct,
        feedback: body.feedback
      })
    });
    return ok({ progress });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "goals"])) {
    const userId = requireAuth(await getRequestContext(request));
    return ok({ goals: await prisma.userGoal.findMany({ where: { userId, active: true } }) });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "goals"])) {
    const userId = requireAuth(await getRequestContext(request));
    const body = (await readJson(request)) as { orgId?: string; type: string; title: string; targetValue?: number; period?: string };
    const goal = await prisma.userGoal.create({
      data: clean({ orgId: body.orgId, userId, type: body.type, title: body.title, targetValue: body.targetValue, period: body.period })
    });
    return ok({ goal });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "badges"])) {
    const userId = requireAuth(await getRequestContext(request));
    return ok({ badges: await prisma.userBadge.findMany({ where: { userId } }) });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "challenges"])) {
    return ok({ challenges: await prisma.challenge.findMany({ where: { orgId: path[1]!, active: true } }) });
  }
  return undefined;
}

async function handleAiNotificationsShopPrivacyPlatform(request: NextRequest, path: string[]) {
  if (request.method === "POST" && pathMatches(path, ["ai", "chat"])) {
    const body = aiChatSchema.parse(await readJson(request));
    const ctx = await getRequestContext(request, body.orgId ? { orgId: body.orgId } : {});
    const userId = requireAuth(ctx);
    assertRateLimit("aiRequestByUser", userId, "Too many AI requests. Please slow down and try again shortly.");
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (body.orgId) {
      requireOrgPermission(ctx, body.orgId, "AI_USE_TEXT");
    }
    const role = (ctx.roles.find((candidate) => candidate !== "PLATFORM_ADMIN") ?? "MEMBER") as Exclude<Role, "PLATFORM_ADMIN">;
    const quota = await resolveAIQuotaState({ userId, role });
    const result = await runAIGuardedRequest({
      provider: aiProvider,
      prompt: body.prompt,
      role,
      requestType: "CHAT",
      quota,
      user: {
        isMinor: user.isMinor,
        guardianConsentGranted: !user.guardianPending,
        marketingOptIn: user.marketingOptIn,
        aiConsent: user.aiConsent || process.env.NODE_ENV === "development",
        hasProfilePhoto: Boolean(user.profilePhotoUrl)
      }
    });
    const conversation = await persistAiConversation({
      userId,
      prompt: body.prompt,
      response: result.response,
      ...(body.conversationId ? { conversationId: body.conversationId } : {}),
      ...(body.orgId ? { orgId: body.orgId } : {}),
      safetyFlags: result.safetyFlags as Prisma.InputJsonValue
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
        safetyFlags: result.safetyFlags
      })
    });
    return ok({ ...result, conversationId: conversation.id });
  }
  if (request.method === "POST" && (pathMatches(path, ["ai", "generate-plan"]) || pathMatches(path, ["ai", "generate-image"]))) {
    const body = aiGenerateSchema.parse(await readJson(request));
    const ctx = await getRequestContext(request, body.orgId ? { orgId: body.orgId } : {});
    const userId = requireAuth(ctx);
    assertRateLimit("aiRequestByUser", userId, "Too many AI requests. Please slow down and try again shortly.");
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const requestType: AIRequestType = path[1] === "generate-image" ? "IMAGE" : "STRUCTURED_PLAN";
    if (body.orgId) {
      requireOrgPermission(ctx, body.orgId, requestType === "IMAGE" ? "AI_GENERATE_IMAGE" : "AI_GENERATE_PLAN");
    }
    const role = (ctx.roles.find((candidate) => candidate !== "PLATFORM_ADMIN") ?? "TRAINER") as Exclude<Role, "PLATFORM_ADMIN">;
    const quota = await resolveAIQuotaState({ userId, role });
    const result = await runAIGuardedRequest({
      provider: aiProvider,
      prompt: body.prompt,
      role,
      requestType,
      quota,
      user: {
        isMinor: user.isMinor,
        guardianConsentGranted: !user.guardianPending,
        marketingOptIn: user.marketingOptIn,
        aiConsent: true,
        hasProfilePhoto: Boolean(user.profilePhotoUrl)
      }
    });
    let createdPlan: Prisma.PlanContentGetPayload<object> | undefined;
    if (requestType === "STRUCTURED_PLAN" && body.orgId && body.persistDraft) {
      const planType = body.type ?? "WORKOUT";
      const title = body.title ?? `${planType === "DIET" ? "Nutrition" : "Workout"} AI draft`;
      createdPlan = await prisma.planContent.create({
        data: {
          orgId: body.orgId,
          creatorUserId: userId,
          type: planType as never,
          title,
          description: "AI-generated draft. Review before publishing.",
          content: result.response as Prisma.InputJsonValue,
          aiGenerated: true,
          visibility: "assigned"
        }
      });
      await prisma.planVersion.create({
        data: {
          orgId: body.orgId,
          planId: createdPlan.id,
          versionNo: 1,
          content: createPlanVersionSnapshot({
            title,
            description: "AI-generated draft. Review before publishing.",
            aiGenerated: true,
            visibility: "assigned",
            content: result.response as Record<string, unknown>
          }) as Prisma.InputJsonValue,
          createdById: userId
        }
      });
      await writeAuditLog({
        request,
        orgId: body.orgId,
        actorUserId: userId,
        action: "plan.ai_draft_created",
        entityType: "plan_content",
        entityId: createdPlan.id,
        metadata: { type: planType }
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
        safetyFlags: result.safetyFlags
      })
    });
    return ok({ ...result, ...(createdPlan ? { createdPlan } : {}) });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "ai", "usage"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "AI_MANAGE_SETTINGS");
    return ok({ usage: await prisma.aIUsageLog.findMany({ where: { orgId }, take: 50, orderBy: { createdAt: "desc" } }) });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "notifications"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "NOTIFICATION_CREATE_DRAFT");
    assertRateLimit("notificationSendByActor", `${orgId}:${userId}`, "Too many notification sends from this account.");
    const body = notificationComposerSchema.parse(await readJson(request));
    const permissionAudience =
      body.audience === "selected_members"
        ? "selected"
        : body.audience === "membership_plan"
          ? "plan"
          : body.audience;
    if (
      !canSendNotification({
        roles: ctx.roles,
        permissions: ctx.permissions,
        type: body.type,
        audience: permissionAudience
      })
    ) {
      throw forbiddenError("You do not have permission to send this notification.");
    }
    const recipientUserIds = await resolveNotificationRecipients({
      orgId,
      senderUserId: userId,
      audience: body.audience,
      type: body.type,
      selectedUserIds: body.selectedUserIds,
      ...(body.planId ? { planId: body.planId } : {}),
      excludeMinors: body.excludeMinors
    });
    const notification = await prisma.notification.create({
      data: clean({
        orgId,
        createdById: userId,
        type: body.type,
        title: body.title,
        body: body.body,
        audience: body.audience,
        pushEnabled: body.pushEnabled,
        scheduledAt: body.scheduleAt ? new Date(body.scheduleAt) : undefined,
        status: body.scheduleAt ? "SCHEDULED" : "SENT",
        sentAt: body.scheduleAt ? undefined : new Date(),
        metadata: clean({
          selectedUserIds: body.selectedUserIds.length ? body.selectedUserIds : undefined,
          planId: body.planId,
          excludeMinors: body.excludeMinors
        }) as Prisma.InputJsonValue
      })
    });
    if (recipientUserIds.length) {
      await prisma.notificationRecipient.createMany({
        data: recipientUserIds.map((recipientUserId) => ({
          notificationId: notification.id,
          userId: recipientUserId,
          deliveryStatus: body.scheduleAt ? "scheduled" : "in_app",
          ...(body.scheduleAt ? {} : { deliveredAt: new Date() })
        })),
        skipDuplicates: true
      });
    }
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "notification.sent",
      entityType: "notification",
      entityId: notification.id,
      metadata: { type: notification.type, audience: notification.audience, recipients: recipientUserIds.length }
    });
    return ok({ notification, recipientCount: recipientUserIds.length });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "notifications"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "NOTIFICATION_CREATE_DRAFT");
    return ok({
      notifications: await prisma.notification.findMany({
        where: { orgId },
        orderBy: { createdAt: "desc" },
        take: 100
      })
    });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "notifications"])) {
    const userId = requireAuth(await getRequestContext(request));
    const recipients = await prisma.notificationRecipient.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    const notifications = await prisma.notification.findMany({
      where: { id: { in: recipients.map((recipient) => recipient.notificationId) } }
    });
    return ok({
      notifications: recipients.map((recipient) => ({
        ...recipient,
        notification: notifications.find((notification) => notification.id === recipient.notificationId) ?? null
      }))
    });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "notifications", /.+/, "read"])) {
    const userId = requireAuth(await getRequestContext(request));
    const record = await prisma.notificationRecipient.findFirst({
      where: { id: path[2]!, userId }
    });
    if (!record) {
      throw notFoundError("Notification not found");
    }
    return ok({
      recipient: await prisma.notificationRecipient.update({
        where: { id: record.id },
        data: { readAt: record.readAt ?? new Date() }
      })
    });
  }
  if (request.method === "PATCH" && pathMatches(path, ["me", "notification-preferences"])) {
    const userId = requireAuth(await getRequestContext(request));
    const body = notificationPreferenceSchema.parse(await readJson(request));
    const existingPreference = await prisma.userNotificationPreference.findFirst({
      where: { userId, ...(body.orgId ? { orgId: body.orgId } : { orgId: null }) }
    });
    const preference = existingPreference
      ? await prisma.userNotificationPreference.update({
          where: { id: existingPreference.id },
          data: clean({
            transactional: body.transactional,
            operational: body.operational,
            promotional: body.promotional,
            engagement: body.engagement,
            pushEnabled: body.pushEnabled
          })
        })
      : await prisma.userNotificationPreference.create({
          data: clean({
            orgId: body.orgId ?? null,
            userId,
            transactional: body.transactional ?? true,
            operational: body.operational ?? true,
            promotional: body.promotional ?? true,
            engagement: body.engagement ?? true,
            pushEnabled: body.pushEnabled ?? false
          })
        });
    return ok({ preference });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "notification-preferences"])) {
    const userId = requireAuth(await getRequestContext(request));
    return ok({
      preferences: await prisma.userNotificationPreference.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" }
      })
    });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "audit-logs"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "PRIVACY_VIEW_AUDIT");
    return ok({
      auditLogs: await prisma.auditLog.findMany({ where: { orgId }, orderBy: { createdAt: "desc" }, take: 100 })
    });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "products"])) {
    const orgId = path[1]!;
    return ok({
      products: await prisma.product.findMany({
        where: { orgId },
        orderBy: [{ active: "desc" }, { stock: "asc" }]
      })
    });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "products"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "SHOP_MANAGE_PRODUCTS");
    const body = productInputSchema.parse(await readJson(request));
    const imageAsset = await getOrganizationScopedFileAsset(body.imageAssetId, orgId, ["product_image"]);
    const product = await prisma.product.create({
      data: clean({
        orgId,
        name: body.name,
        description: body.description,
        pricePaise: body.pricePaise,
        stock: body.stock,
        category: body.category,
        lowStockThreshold: body.lowStockThreshold,
        imageUrl: imageAsset?.url ?? body.imageUrl,
        active: body.active
      })
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "product.created",
      entityType: "product",
      entityId: product.id
    });
    return ok({ product });
  }
  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "products", /.+/])) {
    const orgId = path[1]!;
    const productId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "SHOP_MANAGE_PRODUCTS");
    const body = productInputSchema.partial().parse(await readJson(request));
    const existingProduct = await prisma.product.findFirst({ where: { id: productId, orgId } });
    const imageAsset = await getOrganizationScopedFileAsset(body.imageAssetId, orgId, ["product_image"]);
    if (!existingProduct) {
      throw notFoundError("Product not found");
    }
    const product = await prisma.product.update({
      where: { id: existingProduct.id },
      data: clean({
        name: body.name,
        description: body.description,
        category: body.category,
        pricePaise: body.pricePaise,
        stock: body.stock,
        lowStockThreshold: body.lowStockThreshold,
        imageUrl: imageAsset?.url ?? body.imageUrl,
        active: body.active
      })
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "product.updated",
      entityType: "product",
      entityId: product.id
    });
    return ok({ product });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "inventory", "adjust"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "SHOP_MANAGE_PRODUCTS");
    const body = inventoryAdjustmentSchema.parse(await readJson(request));
    const existingProduct = await prisma.product.findFirst({ where: { id: body.productId, orgId } });
    if (!existingProduct) {
      throw notFoundError("Product not found");
    }
    if (existingProduct.stock + body.delta < 0) {
      throw conflictError("Inventory adjustment would result in negative stock.");
    }
    const [product, movement] = await prisma.$transaction([
      prisma.product.update({
        where: { id: existingProduct.id },
        data: { stock: { increment: body.delta } }
      }),
      prisma.inventoryMovement.create({
        data: {
          orgId,
          productId: existingProduct.id,
          delta: body.delta,
          reason: body.reason,
          createdById: userId
        }
      })
    ]);
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "inventory.adjusted",
      entityType: "inventory_movement",
      entityId: movement.id,
      metadata: { productId: existingProduct.id, delta: body.delta, reason: body.reason }
    });
    return ok({ product, movement });
  }
  if (request.method === "POST" && pathMatches(path, ["shop", "orders"])) {
    const userId = requireAuth(await getRequestContext(request));
    const body = shopOrderSchema.parse(await readJson(request));
    const products = await prisma.product.findMany({
      where: { id: { in: body.items.map((item) => item.productId) }, orgId: body.orgId }
    });
    const calculation = calculateShopOrder({
      products: products.map((product) => ({
        id: product.id,
        stock: product.stock,
        pricePaise: product.pricePaise,
        active: product.active
      })),
      items: body.items
    });
    const order = await prisma.shopOrder.create({
      data: { orgId: body.orgId, userId, totalPaise: calculation.totalPaise }
    });
    await prisma.shopOrderItem.createMany({
      data: body.items.map((item) => ({
        orgId: body.orgId,
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPaise: products.find((product) => product.id === item.productId)?.pricePaise ?? 0
      }))
    });
    const session = await prisma.paymentSession.create({
      data: {
        orgId: body.orgId,
        userId,
        purpose: "SHOP_ORDER",
        amountPaise: calculation.totalPaise,
        checkoutUrl: "/checkout/mock/pending",
        metadata: { shopOrderId: order.id },
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      }
    });
    const updated = await prisma.paymentSession.update({
      where: { id: session.id },
      data: { checkoutUrl: `/checkout/mock/${session.id}` }
    });
    await prisma.shopOrder.update({
      where: { id: order.id },
      data: { paymentSessionId: session.id }
    });
    return ok({ order, checkoutUrl: updated.checkoutUrl });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "shop", "orders"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "SHOP_FULFILL_ORDER");
    const orders = await prisma.shopOrder.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    const items = await prisma.shopOrderItem.findMany({
      where: { orderId: { in: orders.map((order) => order.id) } }
    });
    return ok({
      orders: orders.map((order) => ({
        ...order,
        items: items.filter((item) => item.orderId === order.id)
      }))
    });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "shop", "orders", /.+/, "fulfill"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "SHOP_FULFILL_ORDER");
    const existingOrder = await prisma.shopOrder.findFirst({ where: { id: path[4]!, orgId } });
    if (!existingOrder) {
      throw notFoundError("Shop order not found");
    }
    const fulfilled = fulfillShopOrder({
      id: existingOrder.id,
      status: existingOrder.status,
      totalPaise: existingOrder.totalPaise,
      ...(existingOrder.pickupCode ? { pickupCode: existingOrder.pickupCode } : {})
    });
    const order = await prisma.shopOrder.update({
      where: { id: existingOrder.id },
      data: { status: fulfilled.status, fulfilledById: userId, fulfilledAt: new Date() }
    });
    await prisma.pickupCode.updateMany({
      where: { orderId: existingOrder.id },
      data: { status: fulfilled.status, fulfilledAt: new Date() }
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "shop_order.fulfilled",
      entityType: "shop_order",
      entityId: order.id
    });
    return ok({ order });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "consents"])) {
    const userId = requireAuth(await getRequestContext(request));
    const [consents, exportRequests, deletionRequests] = await Promise.all([
      prisma.consentRecord.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
      prisma.dataExportRequest.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
      prisma.accountDeletionRequest.findMany({ where: { userId }, orderBy: { createdAt: "desc" } })
    ]);
    return ok({ consents, exportRequests, deletionRequests });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "data-export-request"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const exportRequest = await prisma.dataExportRequest.create({
      data: clean({
        orgId: ctx.orgId,
        userId,
        requestId: currentRequestId()
      })
    });
    await prisma.consentRecord.create({
      data: clean({
        orgId: ctx.orgId,
        userId,
        type: "DATA_EXPORT",
        status: "PENDING",
        recordedById: userId,
        metadata: { exportRequestId: exportRequest.id } as Prisma.InputJsonValue
      })
    });
    await writeAuditLog({
      request,
      actorUserId: userId,
      action: "privacy.data_export_requested",
      entityType: "data_export_request",
      entityId: exportRequest.id,
      ...(ctx.orgId ? { orgId: ctx.orgId } : {})
    });
    return ok({ request: exportRequest });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "account-deletion-request"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const deletionRequest = await prisma.accountDeletionRequest.create({
      data: clean({
        orgId: ctx.orgId,
        userId,
        requestId: currentRequestId()
      })
    });
    await prisma.consentRecord.create({
      data: clean({
        orgId: ctx.orgId,
        userId,
        type: "ACCOUNT_DELETION",
        status: "PENDING",
        recordedById: userId,
        metadata: { accountDeletionRequestId: deletionRequest.id } as Prisma.InputJsonValue
      })
    });
    await writeAuditLog({
      request,
      actorUserId: userId,
      action: "privacy.account_deletion_requested",
      entityType: "account_deletion_request",
      entityId: deletionRequest.id,
      ...(ctx.orgId ? { orgId: ctx.orgId } : {})
    });
    return ok({ request: deletionRequest });
  }
  if (request.method === "GET" && pathMatches(path, ["platform", "orgs"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    return ok({ orgs: await prisma.organization.findMany({ orderBy: { createdAt: "desc" } }) });
  }
  if (request.method === "PATCH" && pathMatches(path, ["platform", "orgs", /.+/, "status"])) {
    const ctx = await getRequestContext(request);
    const userId = requirePlatformAdmin(ctx);
    const body = (await readJson(request)) as { status: "ACTIVE" | "SUSPENDED" | "CANCELLED" };
    const org = await prisma.organization.update({ where: { id: path[2]! }, data: { status: body.status } });
    await writeAuditLog({
      request,
      orgId: org.id,
      actorUserId: userId,
      action: "platform.organization_status_updated",
      entityType: "organization",
      entityId: org.id,
      metadata: { status: body.status }
    });
    return ok({ org });
  }
  if (request.method === "GET" && pathMatches(path, ["platform", "ai-usage"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    return ok({ usage: await prisma.aIUsageLog.findMany({ take: 100, orderBy: { createdAt: "desc" } }) });
  }
  if (request.method === "GET" && pathMatches(path, ["platform", "provider-status"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    return ok({ providers: getProviderRegistryDiagnostics() });
  }
  if (request.method === "GET" && pathMatches(path, ["platform", "abuse-flags"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    return ok({ flags: await prisma.organizationAbuseFlag.findMany({ take: 100, orderBy: { createdAt: "desc" } }) });
  }
  return undefined;
}

export async function handleApi(request: NextRequest, rawPath: string[] = []) {
  const requestId = request.headers.get("x-request-id") ?? createRequestId();

  return runWithRequestState({ requestId }, async () => {
    try {
      assertSafeMutationRequest(request);
      const path = rawPath.filter(Boolean);
      for (const handler of [
        handleAuth,
        handleMeData,
        handleTracking,
        handleFiles,
        handleOrganizations,
        handleMembershipPayments,
        handleCouponsReferrals,
        handleAttendance,
        handleStaffPlansGoals,
        handleAiNotificationsShopPrivacyPlatform
      ]) {
        const response = await handler(request, path);
        if (response) {
          response.headers.set("x-request-id", requestId);
          return response;
        }
      }
      const response = fail("not_found", `No API route matched /api/${path.join("/")}`, 404);
      response.headers.set("x-request-id", requestId);
      return response;
    } catch (error) {
      console.error("zook.api.error", {
        requestId,
        method: request.method,
        path: rawPath.join("/"),
        message: error instanceof Error ? error.message : "Unexpected error",
        ...(process.env.NODE_ENV === "development" && error instanceof Error && error.stack
          ? { stack: error.stack }
          : {})
      });
      const response = toErrorResponse(error);
      response.headers.set("x-request-id", requestId);
      return response;
    }
  });
}

export function redirectTo(url: string) {
  return NextResponse.redirect(url);
}
