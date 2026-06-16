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
  staffCount: number;
};

export type DashboardChartPoint = {
  date: string;
  label: string;
  value: number;
};

export type DashboardPlanMixPoint = {
  label: string;
  value: number;
  tone: "lime" | "sky" | "amber" | "violet";
};

export type DashboardCharts = {
  revenue7d: DashboardChartPoint[];
  revenue30d: DashboardChartPoint[];
  attendance7d: DashboardChartPoint[];
  memberGrowth30d: DashboardChartPoint[];
  planMix: DashboardPlanMixPoint[];
  deltas: {
    revenue7d: number;
    revenue30d: number;
    attendance7d: number;
    memberGrowth30d: number;
  };
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
  allBranches?: boolean;
  allBranchesAllowed?: boolean;
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
    plan?: {
      id: string;
      name: string;
      type: MembershipPlanType;
    } | null;
  } | null;
};

export type PaymentRow = {
  id: string;
  orgId?: string | null;
  purpose: string;
  amountPaise: number;
  currency?: string | null;
  status: string;
  mode: string;
  provider?: string | null;
  providerRef?: string | null;
  receiptNumber?: string | null;
  refundedAmountPaise?: number | null;
  refunds?: Array<{
    id: string;
    amountPaise: number;
    currency?: string | null;
    status: string;
    reason?: string | null;
    providerRefundId?: string | null;
    createdAt: string | Date;
    processedAt?: string | Date | null;
    failureReason?: string | null;
  }>;
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
    phone?: string | null;
  } | null;
  plan?: { name?: string | null } | null;
  planName?: string | null;
  branchName?: string | null;
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

export type ClassRow = {
  id: string;
  orgId: string;
  branchId: string;
  branchName?: string | null;
  trainerId: string;
  trainerName?: string | null;
  name: string;
  description?: string | null;
  classType: string;
  maxCapacity: number;
  startTime: string | Date;
  endTime: string | Date;
  recurrenceRule?: string | null;
  status: string;
  createdAt: string | Date;
  enrollmentCount: number;
  remainingCapacity: number;
  myEnrollmentStatus?: string | null;
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
  branchId?: string | null;
  name: string;
  description?: string | null;
  category: string;
  pricePaise: number;
  stock: number;
  lowStockThreshold: number;
  imageUrl?: string | null;
  imageUrls?: string[] | null;
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
    openAbuseFlags?: number;
  };
  topReferrers: Array<{
    code: ReferralCodeRow;
    user: StaffUserRow | null;
    abuseSignals?: {
      redemptions24h: number;
      uniqueInviteePhones: number;
      suspiciousClustering: boolean;
    };
  }>;
  pendingRewards?: Array<{
    id: string;
    referrerUserId: string;
    referralCodeId: string;
    rewardType: string;
    rewardValue: number;
    status: string;
    createdAt: string | Date;
  }>;
  openFlags?: Array<{
    id: string;
    type: string;
    severity: string;
    status: string;
    metadata?: unknown;
    createdAt: string | Date;
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
  paymentId?: string | null;
  paymentSessionId?: string | null;
  pickupCode?: string | null;
  createdAt: string;
  fulfilledAt?: string | null;
  items: ShopOrderItemRow[];
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  } | null;
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
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
  createdAt: string;
};

export type NotificationSnapshot = {
  id: string;
  title: string;
  body?: string | null;
  type: string;
  status: string;
  audience?: string | null;
  pushEnabled?: boolean | null;
  createdAt: string | Date;
};

export type ProductSnapshot = {
  id: string;
  name: string;
  pricePaise?: number | null;
  stock?: number | null;
  lowStockThreshold?: number | null;
};

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
  return "Configured";
}
