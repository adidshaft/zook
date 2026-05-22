import { z } from "zod";

const reservedUsernames = new Set([
  "admin",
  "api",
  "app",
  "support",
  "billing",
  "login",
  "signup",
  "www",
  "dashboard",
  "owner",
  "trainer",
  "member",
  "help",
  "legal",
  "privacy",
  "terms",
  "zook",
]);

export const emailSchema = z.string().trim().toLowerCase().email();
export const INTERNAL_PHONE_EMAIL_DOMAIN = "phone.zook.local";

export type LoginIdentifier = { kind: "email"; value: string } | { kind: "phone"; value: string };

export function isInternalPhoneEmail(email: string | null | undefined) {
  return Boolean(email?.toLowerCase().endsWith(`@${INTERNAL_PHONE_EMAIL_DOMAIN}`));
}

export function publicUserEmail(email: string | null | undefined) {
  return email && !isInternalPhoneEmail(email) ? email : undefined;
}

export function normalizePhoneNumber(input: string) {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) {
    throw new Error("Enter a valid email or phone number.");
  }

  const normalized = trimmed.startsWith("+")
    ? `+${digits}`
    : digits.length === 10
      ? `+91${digits}`
      : digits.length === 12 && digits.startsWith("91")
        ? `+${digits}`
        : digits.length >= 8 && digits.length <= 15
          ? `+${digits}`
          : "";

  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new Error("Enter a valid email or phone number.");
  }
  return normalized;
}

export function normalizeLoginIdentifier(input: string): LoginIdentifier {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Enter a valid email or phone number.");
  }
  if (trimmed.includes("@")) {
    return { kind: "email", value: emailSchema.parse(trimmed) };
  }
  return { kind: "phone", value: normalizePhoneNumber(trimmed) };
}

const loginIdentifierPayloadSchema = z
  .object({
    identifier: z.string().trim().optional(),
    email: z.string().trim().optional(),
  })
  .transform((value, ctx) => {
    const raw = value.identifier ?? value.email;
    if (!raw) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid email or phone number.",
      });
      return z.NEVER;
    }
    try {
      return {
        identifier: normalizeLoginIdentifier(raw),
      };
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error instanceof Error ? error.message : "Enter a valid email or phone number.",
      });
      return z.NEVER;
    }
  });

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]{3,32}$/)
  .refine((value) => !reservedUsernames.has(value), "Username is reserved");

export const requestOtpSchema = loginIdentifierPayloadSchema;

export const verifyOtpSchema = loginIdentifierPayloadSchema.and(
  z.object({
    code: z.string().regex(/^\d{6}$/),
  }),
);

export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(120),
  username: usernameSchema,
  contactPhone: z.string().min(8).max(20),
  contactEmail: emailSchema,
  gstNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/)
    .optional(),
  address: z.string().min(3).max(240),
  city: z.string().min(2).max(80),
  state: z.string().min(2).max(80),
  pincode: z.string().regex(/^\d{6}$/),
  originalGoogleMapsUrl: z.string().trim().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  amenities: z.array(z.string()).default([]),
  equipment: z.array(z.string().trim().min(2).max(80)).max(60).default([]),
  joinMode: z.enum(["OPEN_JOIN", "APPROVAL_REQUIRED", "INVITE_ONLY"]).default("OPEN_JOIN"),
  visibility: z.enum(["PUBLIC", "INVITE_ONLY", "HIDDEN"]).default("PUBLIC"),
  platformReferralCode: z
    .string()
    .trim()
    .toUpperCase()
    .min(3)
    .max(60)
    .optional(),
});

export const membershipPlanSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  type: z.enum(["DURATION", "VISIT_PACK", "DATE_RANGE", "HYBRID", "TRIAL"]),
  pricePaise: z.number().int().min(0),
  durationDays: z.number().int().positive().optional(),
  visitLimit: z.number().int().positive().optional(),
  validityDays: z.number().int().positive().optional(),
  publicVisible: z.boolean().default(true),
});

export const couponSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{3,32}$/),
  type: z.enum(["FIXED_AMOUNT", "PERCENTAGE"]),
  valuePaise: z.number().int().min(1).optional(),
  valuePercentBps: z.number().int().min(1).max(10_000).optional(),
  maxRedemptions: z.number().int().positive().optional(),
  perUserLimit: z.number().int().positive().optional(),
  applicablePlanId: z.string().optional(),
  active: z.boolean().default(true),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
});

export const referralPolicySchema = z.object({
  enabled: z.boolean().default(true),
  referrerRewardType: z.enum(["DAYS", "VISITS", "NONE"]).default("DAYS"),
  referrerRewardValue: z.number().int().min(0).max(30).default(7),
  referredDiscountType: z.enum(["PERCENTAGE", "FIXED", "NONE"]).default("PERCENTAGE"),
  referredDiscountValue: z.number().int().min(0).default(1000),
  maxDiscountCapBps: z.number().int().min(0).max(3000).default(3000),
  maxReferralsPerMonth: z.number().int().min(1).max(50).default(5),
  referralCodeExpiryDays: z.number().int().min(0).max(365).default(90),
  trainerReferralEnabled: z.boolean().default(true),
  staffReferralEnabled: z.boolean().default(false),
});

export const referralCodeManageSchema = z.object({
  referrerUserId: z.string().optional(),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{3,32}$/)
    .optional(),
  couponId: z.string().optional(),
  createdByRole: z.enum(["OWNER", "ADMIN", "RECEPTIONIST", "TRAINER", "MEMBER"]).optional(),
  displayName: z.string().trim().max(80).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  maxUses: z.number().int().positive().optional().nullable(),
  status: z.enum(["active", "paused", "expired"]).optional(),
});

export const offerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  discountType: z.enum(["FIXED_AMOUNT", "PERCENTAGE"]),
  discountValue: z.number().int().min(1),
  applicablePlanIds: z.array(z.string()).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  maxRedemptions: z.number().int().positive().optional().nullable(),
  active: z.boolean().default(true),
  stackable: z.boolean().default(false),
});

export const checkoutSchema = z.object({
  orgId: z.string().optional(),
  userId: z.string().optional(),
  purpose: z.enum(["SAAS_BILLING", "MEMBERSHIP", "SHOP_ORDER", "PERSONAL_TRAINING"]),
  amountPaise: z.number().int().min(0),
  currency: z.literal("INR").default("INR"),
  metadata: z.record(z.unknown()).optional(),
});

export const attendanceScanSchema = z.object({
  qrPayload: z.string().min(20).optional(),
  checkInCode: z.string().trim().min(6).max(12).optional(),
  deviceId: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
}).refine((value) => Boolean(value.qrPayload || value.checkInCode), {
  message: "Scan the QR or enter the check-in code.",
});

export const manualPaymentSchema = z.object({
  amountPaise: z.number().int().positive(),
  mode: z.enum(["CASH", "DIRECT_UPI", "BANK_TRANSFER", "OTHER"]),
  receiptNumber: z.string().optional(),
  proofAssetId: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export const notificationSchema = z.object({
  title: z.string().min(2).max(120),
  body: z.string().min(2).max(600),
  type: z.enum(["TRANSACTIONAL", "OPERATIONAL", "PROMOTIONAL", "ENGAGEMENT", "PLAN", "SECURITY"]),
  audience: z.string().min(2),
  pushEnabled: z.boolean().default(false),
  scheduleAt: z.string().datetime().optional(),
});

export const aiChatSchema = z.object({
  orgId: z.string().optional(),
  prompt: z.string().min(2).max(2000),
  role: z.enum(["OWNER", "ADMIN", "RECEPTIONIST", "TRAINER", "MEMBER"]),
  requestType: z.enum(["CHAT", "STRUCTURED_PLAN", "IMAGE"]).default("CHAT"),
});

export const privacyConsentSchema = z.object({
  type: z.enum([
    "MARKETING",
    "AI_PERSONALIZATION",
    "PROFILE_PHOTO_ATTENDANCE",
    "GUARDIAN",
    "NOTIFICATION_PUSH",
    "DATA_EXPORT",
    "ACCOUNT_DELETION",
  ]),
  status: z.enum(["PENDING", "GRANTED", "REVOKED", "DENIED"]),
});

export const workoutExerciseEntrySchema = z.object({
  exerciseName: z.string().min(2).max(120),
  muscleGroup: z.string().max(80).optional(),
  equipment: z.string().max(80).optional(),
  orderIndex: z.number().int().min(0),
  setsPlanned: z.number().int().positive().optional(),
  setsCompleted: z.number().int().nonnegative().optional(),
  reps: z.number().int().nonnegative().optional(),
  weightKg: z.number().nonnegative().optional(),
  durationSeconds: z.number().int().nonnegative().optional(),
  distanceMeters: z.number().int().nonnegative().optional(),
  notes: z.string().max(500).optional(),
  completed: z.boolean().default(true),
});

export const workoutSessionSchema = z.object({
  organizationId: z.string().optional(),
  planAssignmentId: z.string().optional(),
  attendanceRecordId: z.string().optional(),
  title: z.string().min(2).max(120),
  workoutType: z.string().min(2).max(80),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  intensity: z.string().max(50).optional(),
  notes: z.string().max(1000).optional(),
  mood: z.string().max(80).optional(),
  visibility: z.enum(["PRIVATE", "TRAINER_VISIBLE"]).default("PRIVATE"),
  exercises: z.array(workoutExerciseEntrySchema).default([]),
});

export const bodyProgressEntrySchema = z.object({
  organizationId: z.string().optional(),
  measuredAt: z.string().datetime(),
  weightKg: z.number().nonnegative().optional(),
  waistCm: z.number().nonnegative().optional(),
  chestCm: z.number().nonnegative().optional(),
  armCm: z.number().nonnegative().optional(),
  bodyFatPercent: z.number().nonnegative().max(100).optional(),
  photoAssetId: z.string().optional(),
  notes: z.string().max(500).optional(),
  visibility: z.enum(["PRIVATE", "TRAINER_VISIBLE"]).default("PRIVATE"),
});

export const memberHabitSchema = z.object({
  organizationId: z.string().optional(),
  title: z.string().min(2).max(120),
  category: z.enum(["HYDRATION", "SLEEP", "STEPS", "PROTEIN", "STRETCHING", "CUSTOM"]),
  targetValue: z.number().int().positive().optional(),
  unit: z.string().max(30).optional(),
  frequency: z.enum(["DAILY", "WEEKLY"]).default("DAILY"),
  visibility: z.enum(["PRIVATE", "TRAINER_VISIBLE"]).default("PRIVATE"),
});

export const memberHabitLogSchema = z.object({
  loggedAt: z.string().datetime().optional(),
  value: z.number().int().nonnegative().optional(),
  completed: z.boolean().default(true),
  notes: z.string().max(500).optional(),
});
