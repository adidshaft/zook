export const platformRole = "PLATFORM_ADMIN" as const;
export const orgRoles = ["OWNER", "ADMIN", "RECEPTIONIST", "TRAINER", "MEMBER"] as const;
export const roles = [platformRole, ...orgRoles] as const;
export type Role = (typeof roles)[number];
export type OrgRole = (typeof orgRoles)[number];

export const permissions = [
  "ORG_MANAGE_BILLING",
  "ORG_MANAGE_STAFF",
  "ORG_MANAGE_PERMISSIONS",
  "ORG_MANAGE_PROFILE",
  "ORG_MANAGE_LOCATION",
  "ORG_VIEW_REPORTS",
  "MEMBERS_VIEW",
  "MEMBERS_MANAGE",
  "MEMBERSHIP_PLAN_MANAGE",
  "MEMBERSHIP_SUBSCRIPTION_MANAGE",
  "PAYMENTS_VIEW",
  "PAYMENTS_RECORD_OFFLINE",
  "PAYMENTS_REFUND",
  "COUPONS_MANAGE",
  "REFERRALS_MANAGE",
  "ATTENDANCE_QR_DISPLAY",
  "ATTENDANCE_APPROVE",
  "ATTENDANCE_MANUAL_OVERRIDE",
  "TRAINERS_MANAGE",
  "PT_RECORD",
  "PLANS_CREATE",
  "PLANS_PUBLISH_ALL",
  "PLANS_PUBLISH_ASSIGNED",
  "AI_USE_TEXT",
  "AI_GENERATE_PLAN",
  "AI_GENERATE_IMAGE",
  "AI_MANAGE_SETTINGS",
  "SHOP_MANAGE_PRODUCTS",
  "SHOP_FULFILL_ORDER",
  "NOTIFICATION_CREATE_DRAFT",
  "NOTIFICATION_SEND_SELECTED",
  "NOTIFICATION_SEND_ASSIGNED",
  "NOTIFICATION_SEND_OPERATIONAL",
  "NOTIFICATION_SEND_PROMOTIONAL",
  "NOTIFICATION_SEND_RENEWAL",
  "NOTIFICATION_SEND_PLAN",
  "NOTIFICATION_APPROVE_BROADCAST",
  "NOTIFICATION_MANAGE_TEMPLATES",
  "NOTIFICATION_VIEW_ANALYTICS",
  "PRIVACY_VIEW_AUDIT",
  "PLATFORM_MANAGE_ORGS",
  "PLATFORM_VIEW_AI_USAGE",
  "PLATFORM_MANAGE_SETTINGS",
] as const;
export type Permission = (typeof permissions)[number];

export type OrganizationStatus =
  | "TRIAL_ACTIVE"
  | "TRIAL_EXPIRING"
  | "TRIAL_EXPIRED"
  | "PAYMENT_PENDING"
  | "ACTIVE"
  | "SUSPENDED"
  | "CANCELLED";

export type GymVisibility = "PUBLIC" | "INVITE_ONLY" | "HIDDEN";
export type GymJoinMode = "OPEN_JOIN" | "APPROVAL_REQUIRED" | "INVITE_ONLY";
export type LocationSource = "MANUAL" | "GOOGLE_PLACE" | "GOOGLE_MAPS_LINK" | "MOCK";
export type MembershipPlanType = "DURATION" | "VISIT_PACK" | "DATE_RANGE" | "HYBRID" | "TRIAL";
export type SubscriptionStatus =
  | "PENDING_PAYMENT"
  | "ACTIVE"
  | "PAUSED"
  | "EXPIRED"
  | "CANCELLED"
  | "REFUNDED";
export type PaymentStatus =
  | "CREATED"
  | "PENDING"
  | "REQUIRES_ACTION"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "DISPUTED";
export type PaymentMode =
  | "MOCK_ONLINE"
  | "CASH"
  | "DIRECT_UPI"
  | "BANK_TRANSFER"
  | "CARD"
  | "OTHER";
export type PaymentPurpose =
  | "SAAS_BILLING"
  | "MEMBERSHIP"
  | "SHOP_ORDER"
  | "PERSONAL_TRAINING"
  | "OTHER"
  | "MANUAL_ADJUSTMENT";
export type PaymentMandateStatus =
  | "CREATED"
  | "AUTHENTICATED"
  | "ACTIVE"
  | "PENDING"
  | "HALTED"
  | "PAUSED"
  | "CANCELLED"
  | "COMPLETED"
  | "EXPIRED"
  | "FAILED";
export type CouponType = "FIXED_AMOUNT" | "PERCENTAGE";
export type AttendanceMode = "AUTOMATIC" | "EXCEPTION_APPROVAL" | "MANUAL_APPROVAL";
export type AttendanceStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "FLAGGED";
export type AttendanceSource = "QR_SCAN" | "MANUAL" | "IMPORT";
export type NotificationType =
  | "TRANSACTIONAL"
  | "OPERATIONAL"
  | "PROMOTIONAL"
  | "ENGAGEMENT"
  | "PLAN"
  | "SECURITY";
export type NotificationStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "SENT"
  | "CANCELLED"
  | "FAILED"
  | "NEEDS_APPROVAL";
export type PlanType =
  | "WORKOUT"
  | "DIET"
  | "EXERCISE_ROUTINE"
  | "TRANSFORMATION_PROGRAM"
  | "TRAINER_NOTE"
  | "GYM_ADVISORY"
  | "MACHINE_GUIDE"
  | "RECOVERY";
export type PlanStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type AIProviderType = "MOCK" | "OPENAI";
export type ProviderCategory =
  | "ai"
  | "email"
  | "map"
  | "payment"
  | "push"
  | "sms"
  | "storage"
  | "whatsapp";
export type ProviderMode = "mock" | "test" | "live" | "local" | "disabled";
export type ProviderDiagnosticStatus =
  | "default"
  | "ready"
  | "misconfigured"
  | "unsupported"
  | "disabled";
export type ProviderDiagnosticValue = string | number | boolean | null;
export type ProviderDiagnosticMetadata = Record<string, ProviderDiagnosticValue>;

export interface ProviderInstanceDiagnostics {
  provider: string;
  mode: ProviderMode;
  configured: boolean;
  metadata?: ProviderDiagnosticMetadata;
}

export interface ProviderDiagnostics extends ProviderInstanceDiagnostics {
  category: ProviderCategory;
  selectedProvider: string;
  activeProvider: string | null;
  status: ProviderDiagnosticStatus;
  missingEnv: string[];
  env: Record<string, boolean>;
}

export interface DiagnosticProvider {
  getDiagnostics(): ProviderInstanceDiagnostics;
}

export type AIRequestType =
  | "CHAT"
  | "STRUCTURED_PLAN"
  | "IMAGE"
  | "SCOPE_CLASSIFICATION"
  | "SAFETY_CLASSIFICATION";
export type ProductCategory =
  | "WATER"
  | "PROTEIN_SHAKE"
  | "SHAKER"
  | "TOWEL"
  | "SUPPLEMENT"
  | "OTHER";
export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "READY_FOR_PICKUP"
  | "FULFILLED"
  | "CANCELLED"
  | "REFUNDED";
export type ConsentType =
  | "TERMS"
  | "PRIVACY_POLICY"
  | "MARKETING"
  | "AI_PERSONALIZATION"
  | "PROFILE_PHOTO_ATTENDANCE"
  | "GUARDIAN"
  | "GUARDIAN_CONSENT"
  | "NOTIFICATION_PUSH"
  | "PUSH_NOTIFICATIONS"
  | "TRAINER_VISIBLE_TRACKING"
  | "PLAN_ASSIGNMENT"
  | "DATA_EXPORT"
  | "ACCOUNT_DELETION";
export type ConsentStatus = "PENDING" | "GRANTED" | "REVOKED" | "DENIED";

export interface RequestContext {
  userId?: string;
  orgId?: string;
  orgStatus?: OrganizationStatus;
  branchId?: string;
  roles: OrgRole[];
  permissions: Permission[];
  isPlatformAdmin?: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthOrganizationSummary {
  orgId: string;
  name: string;
  username: string;
  status: OrganizationStatus;
  city: string;
  state: string;
  roles: OrgRole[];
  permissions: Permission[];
  joinedAt: Date;
}

export interface AuthSessionUser {
  id: string;
  email: string;
  name: string;
  slug?: string | null;
  privateHandle?: string;
  phone?: string;
  dateOfBirth?: string | Date | null;
  profilePhotoUrl?: string;
  isMinor: boolean;
  guardianPending: boolean;
  isPlatformAdmin: boolean;
  marketingOptIn: boolean;
  aiConsent: boolean;
  preferredLocale?: string;
  weeklyWorkoutGoal?: number;
}

export interface AuthSessionSummary {
  user: AuthSessionUser;
  organizations: AuthOrganizationSummary[];
  activeOrgId?: string;
  activeOrganization?: AuthOrganizationSummary;
}

export interface GymPublicProfile {
  id: string;
  name: string;
  username: string;
  city: string;
  state: string;
  visibility: GymVisibility;
  joinMode: GymJoinMode;
  latitude?: number;
  longitude?: number;
  amenities: string[];
  coverImageUrl?: string;
}

export interface MembershipPlan {
  id: string;
  orgId: string;
  branchId?: string;
  name: string;
  type: MembershipPlanType;
  pricePaise: number;
  durationDays?: number;
  visitLimit?: number;
  validityDays?: number;
  startDate?: Date;
  endDate?: Date;
  active: boolean;
  publicVisible: boolean;
}

export interface MemberSubscription {
  id: string;
  orgId: string;
  branchId: string;
  memberUserId: string;
  planId: string;
  status: SubscriptionStatus;
  startsAt?: Date;
  endsAt?: Date;
  remainingVisits?: number;
}

export interface Coupon {
  id: string;
  orgId: string;
  code: string;
  type: CouponType;
  valuePaise?: number;
  valuePercentBps?: number;
  active: boolean;
  validFrom?: Date;
  validUntil?: Date;
  maxRedemptions?: number;
  perUserLimit?: number;
  applicablePlanId?: string;
}

export interface ReferralCode {
  id: string;
  orgId: string;
  referrerUserId: string;
  code: string;
  couponId?: string;
  autoGenerated?: boolean;
  displayName?: string;
  expiresAt?: Date;
  maxUses?: number;
  monthlyUseCount?: number;
  lastResetAt?: Date;
  status: "active" | "paused" | "expired";
  redemptionCount: number;
}

export interface ReferralPolicy {
  id: string;
  orgId: string;
  enabled: boolean;
  referrerRewardType: "DAYS" | "VISITS" | "NONE";
  referrerRewardValue: number;
  referredDiscountType: "PERCENTAGE" | "FIXED" | "NONE";
  referredDiscountValue: number;
  maxDiscountCapBps: number;
  maxReferralsPerMonth: number;
  referralCodeExpiryDays: number;
  trainerReferralEnabled: boolean;
  staffReferralEnabled: boolean;
}

export interface ReferralReward {
  id: string;
  orgId: string;
  referralCodeId: string;
  redemptionId: string;
  referrerUserId: string;
  rewardType: "DAYS" | "VISITS";
  rewardValue: number;
  appliedToSubId?: string;
  status: "pending" | "applied" | "expired";
  appliedAt?: Date;
  expiresAt?: Date;
}

export interface Offer {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  discountType: CouponType;
  discountValue: number;
  applicablePlanIds?: string[];
  startsAt: Date;
  endsAt: Date;
  maxRedemptions?: number;
  redemptionCount: number;
  active: boolean;
  stackable: boolean;
}

export interface AIQuotaState {
  textDailyLimit: number;
  textMonthLimit: number;
  imageMonthLimit: number;
  usedTextDaily: number;
  usedTextMonth: number;
  usedImagesMonth: number;
}

export interface UserSafetyState {
  isMinor: boolean;
  guardianConsentGranted: boolean;
  marketingOptIn: boolean;
  aiConsent: boolean;
  hasProfilePhoto: boolean;
}

export type TrackingWindow = "TODAY" | "WEEKLY" | "MONTHLY" | "YEARLY";
export type TrackingTone = "lime" | "amber" | "blue" | "violet";

export interface TrackingSummaryMetric {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: TrackingTone;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  setsLabel: string;
  repsLabel: string;
  loadLabel?: string;
  status: "DONE" | "OPTIONAL" | "SKIPPED";
}

export interface WorkoutLogEntry {
  id: string;
  dateLabel: string;
  workoutName: string;
  startTimeLabel: string;
  endTimeLabel: string;
  durationLabel: string;
  focusLabel: string;
  effortLabel: string;
  notes: string;
  exercises: WorkoutExercise[];
}

export interface WorkoutHistorySeries {
  key: TrackingWindow;
  label: string;
  totalDurationLabel: string;
  sessionCountLabel: string;
  completionLabel: string;
  entries: WorkoutLogEntry[];
}

export interface PersonalTrackingDashboard {
  headline: string;
  subheadline: string;
  weekDurationLabel: string;
  weekSessionsLabel: string;
  streakLabel: string;
  summaryMetrics: TrackingSummaryMetric[];
  todayLog: WorkoutLogEntry;
  recentLogs: WorkoutLogEntry[];
  history: WorkoutHistorySeries[];
}
