export type DashboardMode =
  | "overview"
  | "members"
  | "join-requests"
  | "attendance"
  | "notifications"
  | "reports"
  | "shop"
  | "staff"
  | "plans"
  | "payments"
  | "audit"
  | "ai"
  | "public-profile";

export type MembershipPlanType = "DURATION" | "VISIT_PACK" | "DATE_RANGE" | "HYBRID" | "TRIAL";
export type ProductCategory =
  | "WATER"
  | "PROTEIN_SHAKE"
  | "SHAKER"
  | "TOWEL"
  | "SUPPLEMENT"
  | "OTHER";
export type StaffRole = "ADMIN" | "RECEPTIONIST" | "TRAINER";
export type CouponKind = "FIXED_AMOUNT" | "PERCENTAGE";
export type RewardType = "DAYS" | "VISITS" | "NONE";
export type DiscountType = "PERCENTAGE" | "FIXED" | "NONE";

export type OrganizationSummary = {
  activeMembers: number;
  joinRequests: number;
  expiringMemberships: number;
  todayAttendance: number;
  pendingAttendanceApprovals: number;
  cashCollectedPaise: number;
  revenuePaise: number;
  lowStockProducts: number;
  notificationQueueCount: number;
  aiUsageThisMonth: number;
  trialDaysRemaining: number;
};

export type OrganizationSnapshot = {
  id: string;
  name: string;
  city: string;
  state?: string | null;
  status: string;
  joinMode: string;
  attendanceMode: string;
  trialEndAt?: string | Date | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
};

export type BranchScopeSnapshot = {
  branches: Array<{ id: string; name: string; isDefault: boolean; active: boolean }>;
  defaultBranch: { id: string; name: string; isDefault: boolean; active: boolean } | null;
  selectedBranch: { id: string; name: string; isDefault: boolean; active: boolean } | null;
  mode: string;
  inventoryScope: string;
};

export type JoinRequestRow = {
  id: string;
  userId: string;
  planId?: string | null;
  status: string;
  referralCode?: string | null;
  message?: string | null;
  createdAt: string | Date;
  reviewedAt?: string | Date | null;
};

export type MemberRow = {
  profile: {
    id: string;
    createdAt: string;
    marketingOptIn?: boolean | null;
    publicVisibility?: boolean | null;
    profilePhotoUrl?: string | null;
    notes?: string | null;
  };
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    fitnessGoal?: string | null;
    marketingOptIn?: boolean | null;
    createdAt: string;
  } | null;
  lastCheckIn?: {
    id: string;
    status: string;
    checkedInAt: string | Date;
  } | null;
  activeSubscription?: {
    id: string;
    status: string;
    endsAt?: string | Date | null;
    remainingVisits?: number | null;
  } | null;
};

export type PaymentRow = {
  id: string;
  purpose: string;
  amountPaise: number;
  currency?: string | null;
  status: string;
  mode: string;
  provider?: string | null;
  providerRef?: string | null;
  receiptNumber?: string | null;
  recordedAt?: string | Date | null;
  createdAt: string | Date;
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  } | null;
};

export type AttendanceRecordRow = {
  id: string;
  status: string;
  checkedInAt: string | Date;
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
  } | null;
  plan?: { name?: string | null } | null;
  subscription?: {
    endsAt?: string | Date | null;
    remainingVisits?: number | null;
  } | null;
  suspiciousFlags?: string[] | null;
};

export type MembershipPlanRow = {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  pricePaise: number;
  active: boolean;
  publicVisible: boolean;
  durationDays?: number | null;
  visitLimit?: number | null;
  validityDays?: number | null;
  createdAt: string;
};

export type StaffAssignmentRow = {
  id: string;
  userId: string;
  role: string;
  branchId?: string | null;
  createdAt: string;
};

export type StaffUserRow = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  createdAt: string;
};

export type CoachPlanRow = {
  id: string;
  title: string;
  type: string;
  status: string;
  aiGenerated: boolean;
  reviewed: boolean;
  assignmentCount: number;
  updatedAt: string;
};

export type ProductRow = {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  pricePaise: number;
  stock: number;
  lowStockThreshold: number;
  active: boolean;
};

export type CouponRow = {
  id: string;
  code: string;
  type: CouponKind;
  valuePaise?: number | null;
  valuePercentBps?: number | null;
  active: boolean;
  maxRedemptions?: number | null;
  perUserLimit?: number | null;
  applicablePlanId?: string | null;
};

export type ReferralPolicyRow = {
  id: string;
  enabled: boolean;
  referrerRewardType: RewardType;
  referrerRewardValue: number;
  referredDiscountType: DiscountType;
  referredDiscountValue: number;
  maxDiscountCapBps: number;
  maxReferralsPerMonth: number;
  referralCodeExpiryDays: number;
  trainerReferralEnabled: boolean;
  staffReferralEnabled: boolean;
};

export type ReferralCodeRow = {
  id: string;
  referrerUserId: string;
  code: string;
  couponId?: string | null;
  createdByRole: string;
  expiresAt?: string | Date | null;
  maxUses?: number | null;
  status: string;
  redemptionCount: number;
};

export type OfferRow = {
  id: string;
  name: string;
  description?: string | null;
  discountType: CouponKind;
  discountValue: number;
  applicablePlans?: unknown;
  startsAt: string | Date;
  endsAt: string | Date;
  maxRedemptions?: number | null;
  redemptionCount: number;
  active: boolean;
  stackable: boolean;
};

export type BranchRow = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  locationSource?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  whatsappNumber?: string | null;
  operatingHours?: Record<string, unknown> | null;
  amenities?: string[];
  managerId?: string | null;
  logoAssetId?: string | null;
  coverAssetId?: string | null;
  isDefault: boolean;
  active: boolean;
};

export type ReferralAnalyticsPayload = {
  summary: {
    activeCodes: number;
    redemptionsThisMonth: number;
    rewardCreditsThisMonth: number;
    appliedRewardsThisMonth: number;
  };
  topReferrers: Array<{
    code: ReferralCodeRow;
    user: StaffUserRow | null;
  }>;
};

export type MemberDetailPayload = {
  member: {
    user: StaffUserRow | null;
    subscriptions: Array<{
      id: string;
      status: string;
      startsAt?: string | Date | null;
      endsAt?: string | Date | null;
      remainingVisits?: number | null;
      plan?: MembershipPlanRow | null;
    }>;
    payments: Array<{ id: string; amountPaise: number; status: string; recordedAt: string | Date }>;
    attendance: Array<{ id: string; status: string; checkedInAt: string | Date }>;
    bodyProgress?: BodyProgressEntryRow[];
    workouts: Array<{ id: string; title: string; startedAt: string | Date }>;
  };
};

export type BodyProgressEntryRow = {
  id: string;
  measuredAt: string | Date;
  weightKg?: string | number | null;
  waistCm?: string | number | null;
  chestCm?: string | number | null;
  armCm?: string | number | null;
  bodyFatPercent?: string | number | null;
  photoAssetId?: string | null;
  notes?: string | null;
  visibility?: string | null;
};

export type ShopOrderItemRow = {
  id: string;
  productId: string;
  quantity: number;
  unitPaise: number;
};

export type ShopOrderRow = {
  id: string;
  userId: string;
  status: string;
  totalPaise: number;
  pickupCode?: string | null;
  createdAt: string;
  fulfilledAt?: string | null;
  items: ShopOrderItemRow[];
};

export type AIUsageRow = {
  id: string;
  role: string;
  provider: string;
  requestType: string;
  promptSummary: string;
  responseSummary?: string | null;
  tokenEstimate: number;
  costEstimatePaise: number;
  quotaConsumed: number;
  imageCount: number;
  safetyFlags?: unknown;
  createdAt: string | Date;
};

export type AuditLogRow = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  actorUserId?: string | null;
  requestId?: string | null;
  metadata?: unknown;
  createdAt: string;
};

export type NotificationSnapshot = {
  id: string;
  title: string;
  type: string;
  status: string;
  audience?: string | null;
  createdAt: string | Date;
};

export type ProductSnapshot = {
  id: string;
  name: string;
  pricePaise?: number | null;
  stock?: number | null;
  lowStockThreshold?: number | null;
};

export function resolveMode(sectionKey: string): DashboardMode {
  if (sectionKey.includes("public-profile") || sectionKey === "org" || sectionKey === "settings") {
    return "public-profile";
  }
  if (sectionKey.includes("join-requests")) {
    return "join-requests";
  }
  if (sectionKey.includes("attendance")) {
    return "attendance";
  }
  if (sectionKey.includes("notifications")) {
    return "notifications";
  }
  if (sectionKey.includes("reports")) {
    return "reports";
  }
  if (sectionKey.includes("shop")) {
    return "shop";
  }
  if (
    sectionKey.includes("staff") ||
    sectionKey.includes("trainers") ||
    sectionKey.includes("pt")
  ) {
    return "staff";
  }
  if (
    sectionKey.includes("membership-plans") ||
    sectionKey === "plans" ||
    sectionKey.includes("/plans")
  ) {
    return "plans";
  }
  if (sectionKey.includes("payments") || sectionKey.includes("checkout")) {
    return "payments";
  }
  if (sectionKey.includes("audit")) {
    return "audit";
  }
  if (sectionKey.includes("members")) {
    return "members";
  }
  if (sectionKey.includes("ai")) {
    return "ai";
  }
  return "overview";
}

export function countFlags(value: unknown) {
  if (Array.isArray(value)) {
    return value.length;
  }
  if (value && typeof value === "object") {
    return Object.keys(value).length;
  }
  return 0;
}

export function formatPlanShape(plan: MembershipPlanRow) {
  if (plan.type === "DURATION" && plan.durationDays) {
    return `${plan.durationDays} days`;
  }
  if (plan.type === "VISIT_PACK" && plan.visitLimit) {
    return `${plan.visitLimit} visits`;
  }
  if (plan.type === "HYBRID") {
    return `${plan.durationDays ?? "Flexible"} days / ${plan.visitLimit ?? "Open"} visits`;
  }
  if (plan.validityDays) {
    return `${plan.validityDays} days validity`;
  }
  return "Configured in service layer";
}
