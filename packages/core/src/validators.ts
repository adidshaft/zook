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
  "zook"
]);

export const emailSchema = z.string().trim().toLowerCase().email();
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]{3,32}$/)
  .refine((value) => !reservedUsernames.has(value), "Username is reserved");

export const requestOtpSchema = z.object({
  email: emailSchema
});

export const verifyOtpSchema = z.object({
  email: emailSchema,
  code: z.string().regex(/^\d{6}$/)
});

export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(120),
  username: usernameSchema,
  contactPhone: z.string().min(8).max(20),
  contactEmail: emailSchema,
  address: z.string().min(3).max(240),
  city: z.string().min(2).max(80),
  state: z.string().min(2).max(80),
  pincode: z.string().regex(/^\d{6}$/),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  amenities: z.array(z.string()).default([]),
  joinMode: z.enum(["OPEN_JOIN", "APPROVAL_REQUIRED", "INVITE_ONLY"]).default("OPEN_JOIN"),
  visibility: z.enum(["PUBLIC", "INVITE_ONLY", "HIDDEN"]).default("PUBLIC")
});

export const membershipPlanSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  type: z.enum(["DURATION", "VISIT_PACK", "DATE_RANGE", "HYBRID", "TRIAL"]),
  pricePaise: z.number().int().min(0),
  durationDays: z.number().int().positive().optional(),
  visitLimit: z.number().int().positive().optional(),
  validityDays: z.number().int().positive().optional(),
  publicVisible: z.boolean().default(true)
});

export const couponSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,32}$/),
  type: z.enum(["FIXED_AMOUNT", "PERCENTAGE"]),
  valuePaise: z.number().int().min(1).optional(),
  valuePercentBps: z.number().int().min(1).max(10_000).optional(),
  maxRedemptions: z.number().int().positive().optional(),
  perUserLimit: z.number().int().positive().optional(),
  applicablePlanId: z.string().optional()
});

export const checkoutSchema = z.object({
  orgId: z.string().optional(),
  userId: z.string().optional(),
  purpose: z.enum(["SAAS_BILLING", "MEMBERSHIP", "SHOP_ORDER", "PERSONAL_TRAINING"]),
  amountPaise: z.number().int().min(0),
  currency: z.literal("INR").default("INR"),
  metadata: z.record(z.unknown()).optional()
});

export const attendanceScanSchema = z.object({
  qrPayload: z.string().min(20),
  deviceId: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional()
});

export const manualPaymentSchema = z.object({
  amountPaise: z.number().int().positive(),
  mode: z.enum(["CASH", "DIRECT_UPI", "BANK_TRANSFER", "OTHER"]),
  receiptNumber: z.string().optional(),
  proofAssetId: z.string().optional(),
  notes: z.string().max(500).optional()
});

export const notificationSchema = z.object({
  title: z.string().min(2).max(120),
  body: z.string().min(2).max(600),
  type: z.enum(["TRANSACTIONAL", "OPERATIONAL", "PROMOTIONAL", "ENGAGEMENT", "PLAN", "SECURITY"]),
  audience: z.string().min(2),
  pushEnabled: z.boolean().default(false),
  scheduleAt: z.string().datetime().optional()
});

export const aiChatSchema = z.object({
  orgId: z.string().optional(),
  prompt: z.string().min(2).max(2000),
  role: z.enum(["OWNER", "ADMIN", "RECEPTIONIST", "TRAINER", "MEMBER"]),
  requestType: z.enum(["CHAT", "STRUCTURED_PLAN", "IMAGE"]).default("CHAT")
});

export const privacyConsentSchema = z.object({
  type: z.enum([
    "MARKETING",
    "AI_PERSONALIZATION",
    "PROFILE_PHOTO_ATTENDANCE",
    "GUARDIAN",
    "NOTIFICATION_PUSH",
    "DATA_EXPORT",
    "ACCOUNT_DELETION"
  ]),
  status: z.enum(["PENDING", "GRANTED", "REVOKED", "DENIED"])
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
  completed: z.boolean().default(true)
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
  exercises: z.array(workoutExerciseEntrySchema).default([])
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
  visibility: z.enum(["PRIVATE", "TRAINER_VISIBLE"]).default("PRIVATE")
});

export const memberHabitSchema = z.object({
  organizationId: z.string().optional(),
  title: z.string().min(2).max(120),
  category: z.enum(["HYDRATION", "SLEEP", "STEPS", "PROTEIN", "STRETCHING", "CUSTOM"]),
  targetValue: z.number().int().positive().optional(),
  unit: z.string().max(30).optional(),
  frequency: z.enum(["DAILY", "WEEKLY"]).default("DAILY"),
  visibility: z.enum(["PRIVATE", "TRAINER_VISIBLE"]).default("PRIVATE")
});

export const memberHabitLogSchema = z.object({
  loggedAt: z.string().datetime().optional(),
  value: z.number().int().nonnegative().optional(),
  completed: z.boolean().default(true),
  notes: z.string().max(500).optional()
});
