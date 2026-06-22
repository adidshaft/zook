import type { NotificationPreferenceRecord } from "@/lib/notification-preferences";

export interface MemberHomeData {
  activeOrganization: {
    id?: string;
    name: string;
    status: string;
    city?: string | null;
    state?: string | null;
    username?: string | null;
    logoUrl?: string | null;
    attendanceMode?: "AUTOMATIC" | "EXCEPTION_APPROVAL" | "MANUAL_APPROVAL" | string | null;
  } | null;
  activeMembership: {
    id?: string;
    status?: string;
    endsAt?: string | null;
    remainingVisits?: number | null;
    daysLeft?: number | null;
    nextCheckInEstimate?: string | null;
  } | null;
  activePlan: {
    id?: string;
    name: string;
    type: string;
    durationDays?: number | null;
    visitLimit?: number | null;
    validityDays?: number | null;
  } | null;
  activeCheckIn: {
    id: string;
    orgId?: string;
    branchId?: string;
    branchName?: string | null;
    branchLatitude?: number | null;
    branchLongitude?: number | null;
    checkedInAt: string;
    checkedOutAt?: string | null;
    checkoutReason?: string | null;
    durationSeconds?: number | null;
    status: string;
    source?: string | null;
  } | null;
  recentAttendance: Array<{
    id: string;
    checkedInAt: string;
    checkedOutAt?: string | null;
    checkoutReason?: string | null;
    durationSeconds?: number | null;
    branchId?: string | null;
    status: string;
    source?: string;
  }>;
  unreadNotifications: number;
  activeGoals: number;
  assignedPlans: number;
  streakDays?: number;
  todayWorkoutLoggedAt?: string | null;
  todayPlanName?: string | null;
  todayPlanAssignmentId?: string | null;
  todayPlanTrainer?: {
    id?: string;
    name: string;
    email?: string | null;
    profilePhotoUrl?: string | null;
  } | null;
  assignedTrainer?: {
    id?: string;
    name: string;
    email?: string | null;
    profilePhotoUrl?: string | null;
  } | null;
  nextCheckInEstimate?: string | null;
}

export interface MemberBadgeRecord {
  id: string;
  badgeId?: string;
  code: string;
  name: string;
  description: string;
  icon?: string | null;
  awardedAt: string;
  metadata?: Record<string, unknown> | null;
}

export interface MemberNextMilestone {
  code: string;
  name: string;
  description: string;
  icon?: string | null;
  metric: "streakDays" | "totalCheckIns";
  target: number;
  current: number;
  remaining: number;
  progress: number;
}

export interface MemberEngagementData {
  streakDays: number;
  totalCheckIns: number;
  badges: MemberBadgeRecord[];
  latestBadge?: MemberBadgeRecord | null;
  nextMilestone?: MemberNextMilestone | null;
}

export interface ReferralCodeRecord {
  id: string;
  code: string;
  status: string;
  redemptionCount?: number | null;
  maxUses?: number | null;
  expiresAt?: string | null;
}

export interface ReferralRewardRecord {
  id: string;
  status?: string | null;
  rewardType?: string | null;
  rewardValue?: number | null;
  createdAt?: string | null;
}

export interface MemberDashboardData {
  home: MemberHomeData;
  engagement: MemberEngagementData;
  referral: {
    referralCodes: ReferralCodeRecord[];
    rewards: ReferralRewardRecord[];
    links?: { web?: string; short?: string; app?: string };
    policy?: Record<string, unknown> | null;
  };
  preferences: NotificationPreferenceRecord[];
}

export interface MemberClassRecord {
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
  pricePaise?: number | null;
  trainerCommissionBps?: number | null;
  startTime: string;
  endTime: string;
  recurrenceRule?: string | null;
  status: string;
  createdAt: string;
  enrollmentCount: number;
  remainingCapacity: number;
  myEnrollmentStatus?: string | null;
}

export interface PublicPlanSummary {
  id: string;
  name: string;
  description?: string | null;
  type?: string | null;
  pricePaise?: number | null;
  durationDays?: number | null;
  visitLimit?: number | null;
  validityDays?: number | null;
  startDate?: string | null;
  endDate?: string | null;
}

export type ActiveMembershipRecord = NonNullable<MemberHomeData["activeMembership"]> & {
  plan?: PublicPlanSummary | null;
  organization?: MemberHomeData["activeOrganization"];
  recentAttendance?: MemberHomeData["recentAttendance"];
};

export interface GymSearchResult {
  id: string;
  username: string;
  name: string;
  city: string;
  state: string;
  joinMode: string;
  visibility?: string;
  latitude?: number | null;
  longitude?: number | null;
  coverImageUrl?: string | null;
  amenities: string[];
}

export interface GymViewerState {
  activeMembership?: {
    id?: string;
    status?: string;
    endsAt?: string | null;
    remainingVisits?: number | null;
  } | null;
  pendingJoinRequest?: {
    id?: string;
    createdAt?: string | null;
    status?: string | null;
  } | null;
  approvedJoinRequest?: {
    id?: string;
    reviewedAt?: string | null;
    status?: string | null;
  } | null;
}

export interface GymProfileData {
  org: {
    id: string;
    name: string;
    username: string;
    city: string;
    state: string;
    joinMode: "OPEN_JOIN" | "APPROVAL_REQUIRED" | "INVITE_ONLY";
    visibility: string;
    latitude?: number | null;
    longitude?: number | null;
    amenities?: string[] | null;
    coverImageUrl?: string | null;
    logoUrl?: string | null;
    address?: string | null;
    tagline?: string | null;
    gallery?: string[];
    facilities?: string[];
    equipment?: string[];
    gymType?: string | null;
    openingHoursSummary?: string | null;
    appStoreUrl?: string | null;
    playStoreUrl?: string | null;
  } | null;
  branches?: Array<{
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    isDefault?: boolean | null;
  }>;
  trainers?: Array<{
    userId: string;
    name: string;
    profilePhotoUrl?: string | null;
    bio?: string | null;
    specialties?: unknown;
    visibleToMembers?: boolean;
  }>;
  plans: PublicPlanSummary[];
  viewerState?: GymViewerState | null;
  referral?: { code: string; couponId?: string | null; status: string } | null;
}

export interface TrainerClientRecord {
  id?: string;
  memberUserId: string;
  trainerUserId?: string;
  active?: boolean;
  createdAt?: string;
  user?: {
    name?: string;
    email?: string;
    phone?: string | null;
    dateOfBirth?: string | null;
    fitnessGoal?: string | null;
    profilePhotoUrl?: string | null;
  } | null;
  profile?: {
    fitnessGoal?: string | null;
    notes?: string | null;
    profilePhotoUrl?: string | null;
  } | null;
  summary?: {
    fitnessGoal?: string | null;
    dateOfBirth?: string | null;
    weightKg?: number;
    dietPreference?: string;
    allergies?: string;
    summaryNote?: string;
    trainerNote?: string;
    activePlans?: number;
    recentFeedback?: Array<{
      assignmentId: string;
      completionPct: number;
      feedback?: string | null;
      updatedAt?: string;
    }>;
    recentWorkouts?: Array<{
      id: string;
      title: string;
      workoutType: string;
      startedAt?: string;
      durationMinutes?: number | null;
      notes?: string | null;
    }>;
  };
}

export interface PlanContentRecord {
  id: string;
  orgId: string;
  creatorUserId?: string;
  type: string;
  title: string;
  description?: string | null;
  content?: Record<string, unknown> | null;
  aiGenerated?: boolean;
  reviewed?: boolean;
  status?: string;
  visibility?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlanProgressRecord {
  id: string;
  orgId: string;
  assignmentId: string;
  userId: string;
  progressJson: Record<string, unknown>;
  completionPct: number;
  feedback?: string | null;
  updatedAt?: string;
  createdAt?: string;
}

export interface PlanExerciseRecord {
  id: string;
  name: string;
  sets?: string | null;
  equipment?: string | null;
  reps?: string | null;
  day?: string | null;
  raw?: string | null;
  orderIndex: number;
  completed: boolean;
}

export interface MyPlanRecord {
  id: string;
  orgId: string;
  planId: string;
  assignedById?: string;
  assignedToUserId?: string | null;
  audience?: string;
  active?: boolean;
  createdAt?: string;
  plan: PlanContentRecord | null;
  progress: PlanProgressRecord | null;
}

export interface ShopProductRecord {
  id: string;
  orgId: string;
  name: string;
  description?: string | null;
  category: string;
  pricePaise: number;
  stock: number;
  lowStockThreshold: number;
  imageUrl?: string | null;
  imageUrls?: string[] | null;
  active?: boolean;
}

export interface ShopOrderItemRecord {
  id?: string;
  productId: string;
  quantity: number;
  unitPaise: number;
  product?: ShopProductRecord | null;
}

export interface ShopOrderRecord {
  id: string;
  orgId: string;
  branchId?: string | null;
  branchName?: string | null;
  userId: string;
  status: string;
  paymentSessionId?: string | null;
  paymentId?: string | null;
  totalPaise: number;
  pickupCode?: string | null;
  fulfilledAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  user?: { id: string; name: string; email: string; phone?: string | null } | null;
  items: ShopOrderItemRecord[];
}

export interface OrgPaymentRecord {
  id: string;
  orgId?: string | null;
  branchId?: string | null;
  branchName?: string | null;
  userId?: string | null;
  purpose: string;
  amountPaise: number;
  status: string;
  mode: string;
  receiptNumber?: string | null;
  notes?: string | null;
  recordedAt?: string | null;
  createdAt?: string;
  user?: { id: string; name: string; email: string; phone?: string | null } | null;
}

export interface InvoiceRecord {
  id: string;
  orgId?: string | null;
  userId?: string | null;
  paymentId?: string | null;
  invoiceNumber?: string | null;
  invoiceNo?: string | null;
  invoiceUrl?: string | null;
  issueDate?: string | null;
  issuedAt?: string | null;
  subtotalPaise?: number;
  gstPaise?: number;
  totalPaise?: number;
  amountPaise?: number;
  status?: string;
  invoiceStatus?: string | null;
}

export interface MyProfileData {
  user: {
    id: string;
    email: string;
    name: string;
    phone?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    emergencyContact?: { name?: string | null; phone?: string | null } | null;
    fitnessGoal?: string | null;
    profilePhotoUrl?: string | null;
    marketingOptIn?: boolean | null;
    aiConsent?: boolean | null;
    preferredLocale?: string | null;
    weeklyWorkoutGoal?: number | null;
  };
  profile?: {
    id: string;
    notes?: string | null;
    profilePhotoUrl?: string | null;
    publicVisibility?: boolean | null;
  } | null;
  wellness?: {
    weightKg?: number;
    dietPreference?: string;
    allergies?: string;
    summaryNote?: string;
    latestMeasurementAt?: string;
  };
}

export interface ReceptionQueueRecord {
  id: string;
  status: string;
  checkedInAt: string;
  branchId?: string | null;
  branchName?: string | null;
  source?: string;
  suspiciousFlags?: string[] | null;
  rejectionReason?: string | null;
  user?: { name?: string | null; email?: string | null } | null;
  profile?: { profilePhotoUrl?: string | null } | null;
  plan?: { name?: string | null } | null;
  subscription?: {
    status?: string | null;
    endsAt?: string | null;
    remainingVisits?: number | null;
  } | null;
}

export interface OwnerDashboardMetric {
  label: string;
  value: string;
  delta: string;
}

export interface OwnerDashboardChartPoint {
  date: string;
  label: string;
  value: number;
}

export interface OwnerDashboardPlanMixPoint {
  label: string;
  value: number;
}

export interface OwnerDashboardCharts {
  revenue7d: OwnerDashboardChartPoint[];
  revenue30d: OwnerDashboardChartPoint[];
  attendance7d: OwnerDashboardChartPoint[];
  memberGrowth30d: OwnerDashboardChartPoint[];
  planMix: OwnerDashboardPlanMixPoint[];
  deltas: {
    revenue7d: number;
    revenue30d: number;
    attendance7d: number;
    memberGrowth30d: number;
  };
}

export interface OwnerBillingSubscriptionData {
  subscription: {
    orgStatus: string;
    trialStartAt?: string | null;
    trialEndAt?: string | null;
    status: string;
    tier: "FREE" | "STARTER" | "GROWTH" | "PRO" | string;
    billingCycle: "MONTHLY" | "YEARLY" | string;
    priceLockedPaise?: number | null;
    billingEmail?: string | null;
    nextBillingAt?: string | null;
    nextRenewalAt?: string | null;
    cancelledAt?: string | null;
    cancelAtPeriodEnd?: boolean;
  };
  activeMemberCount: number;
  entitlements?: {
    memberLimit?: number | null;
    branchLimit?: number | null;
    staffLimit?: number | null;
    trainerLimit?: number | null;
    productLimit?: number | null;
    notificationMonthlyLimit?: number | null;
    aiTextMonthlyLimit?: number | null;
    aiImageMonthlyLimit?: number | null;
    reports?: string;
    referrals?: string;
    support?: string;
    onboarding?: string;
    multiBranch?: boolean;
    apiAccess?: boolean;
  };
  usage?: {
    activeMemberCount?: number;
    branchCount?: number;
    staffCount?: number;
    trainerCount?: number;
    productCount?: number;
    notificationMonthlyCount?: number;
    aiTextMonthlyCount?: number;
    aiImageMonthlyCount?: number;
  };
  pricing: Record<
    string,
    {
      monthly: number;
      semiannual?: number;
      yearly: number;
      memberLimit?: number | null;
      entitlements?: OwnerBillingSubscriptionData["entitlements"];
    }
  >;
  mandate: {
    id: string;
    status: string;
    provider?: string | null;
    providerMandateId?: string | null;
    amountPaise: number;
    currency: string;
    billingPeriod: string;
    billingInterval: number;
    paidCount: number;
    totalCount: number;
    nextChargeAt?: string | null;
    currentEndAt?: string | null;
    authenticatedAt?: string | null;
    activatedAt?: string | null;
    cancelledAt?: string | null;
    checkoutUrl?: string | null;
  } | null;
  platformReferral?: {
    code: string;
    referredCount: number;
    recent: Array<{ id: string; targetOrgId: string; status: string; createdAt?: string | null }>;
  };
}

export interface OwnerDashboardData {
  organization?: {
    id: string;
    name: string;
    status?: string;
    trialEndAt?: string | null;
  } | null;
  metrics?: OwnerDashboardMetric[];
  charts?: OwnerDashboardCharts;
  summary?: {
    activeMembers?: number;
    joinRequests?: number;
    expiringMemberships?: number;
    todayAttendance?: number;
    pendingAttendanceApprovals?: number;
    cashCollectedPaise?: number;
    revenuePaise?: number;
    lowStockProducts?: number;
    notificationQueueCount?: number;
    aiUsageThisMonth?: number;
    trialDaysRemaining?: number;
  };
  branchScope?: {
    selectedBranch?: {
      id: string;
      name: string;
      isDefault?: boolean;
    } | null;
    defaultBranch?: {
      id: string;
      name: string;
      isDefault?: boolean;
    } | null;
    branches?: Array<{
      id: string;
      name: string;
      isDefault?: boolean;
    }>;
    inventoryScope?: "ORG_WIDE";
  };
  joinRequests?: Array<{
    id: string;
    userId: string;
    userName?: string | null;
    userEmail?: string | null;
    planId?: string | null;
    referralCode?: string | null;
    status?: string | null;
    createdAt?: string;
  }>;
  products?: Array<{
    id: string;
    name: string;
    pricePaise?: number | null;
    stock?: number | null;
    lowStockThreshold?: number | null;
    category?: string | null;
  }>;
  notifications?: Array<{
    id: string;
    title?: string | null;
    type?: string | null;
    status?: string | null;
    createdAt?: string | null;
  }>;
  aiUsage?: Array<{
    id: string;
    role?: string | null;
    provider?: string | null;
    requestType?: string | null;
    promptSummary?: string | null;
    quotaConsumed?: number | null;
    createdAt?: string | null;
  }>;
  auditLogCount?: number;
}

export interface PushDeviceRecord {
  id: string;
  orgId?: string | null;
  platform?: string | null;
  provider?: string | null;
  status?: string | null;
  deviceLabel?: string | null;
  deviceFingerprint?: string | null;
  appVersion?: string | null;
  lastSeenAt?: string | null;
  lastRegisteredAt?: string | null;
  lastFailureAt?: string | null;
  failureReason?: string | null;
  revokedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  metadata?: Record<string, unknown> | null;
}

export type PrivacyRequestRecord = {
  id: string;
  status: string;
  createdAt?: string;
  completedAt?: string | null;
  scheduledFor?: string | null;
  exportUrl?: string | null;
};

export interface BodyProgressEntryRecord {
  id: string;
  userId?: string;
  organizationId?: string | null;
  measuredAt?: string | null;
  weightKg?: string | number | null;
  waistCm?: string | number | null;
  chestCm?: string | number | null;
  armCm?: string | number | null;
  bodyFatPct?: string | number | null;
  bodyFatPercent?: string | number | null;
  photoAssetId?: string | null;
  photoUrl?: string | null;
  photoAsset?: { url?: string | null } | null;
  notes?: string | null;
}

export interface DietPlanMealRecord {
  id: string;
  name: string;
  timeOfDay?: string | null;
  items?: string[] | null;
  calories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatsG?: number | null;
  order?: number | null;
}

export interface DietPlanRecord {
  id: string;
  title: string;
  calorieTarget?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatsG?: number | null;
  status?: string | null;
  meals?: DietPlanMealRecord[];
}

export interface MealLogRecord {
  id: string;
  mealName: string;
  loggedAt?: string | null;
  calories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatsG?: number | null;
  notes?: string | null;
}

export type HabitCategory =
  | "HYDRATION"
  | "SLEEP"
  | "STEPS"
  | "PROTEIN"
  | "STRETCHING"
  | "CUSTOM";

export interface HabitLogRecord {
  id: string;
  habitId: string;
  loggedAt?: string | null;
  value?: number | null;
  notes?: string | null;
  completed: boolean;
}

export interface PtPlanRecord {
  id: string;
  orgId?: string;
  trainerUserId?: string;
  name: string;
  description?: string | null;
  durationDays?: number | null;
  sessionCount?: number | null;
  pricePaise: number;
  active?: boolean;
  createdAt?: string | null;
}

export interface PtSubscriptionRecord {
  id: string;
  memberUserId: string;
  memberName?: string | null;
  trainerUserId?: string;
  ptPlanId?: string | null;
  planName?: string | null;
  status: string;
  totalSessions?: number | null;
  remainingSessions?: number | null;
  amountPaise: number;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt?: string | null;
}

export interface HabitRecord {
  id: string;
  title: string;
  category: HabitCategory | string;
  targetValue?: number | null;
  unit?: string | null;
  frequency: "DAILY" | "WEEKLY" | string;
  visibility?: string | null;
  active?: boolean;
  createdAt?: string | null;
  logs?: HabitLogRecord[];
}

export interface TrainerPayoutLineRecord {
  id: string;
  kind: string;
  description: string;
  amountPaise: number;
  createdAt?: string | null;
}

export interface TrainerPayoutRecord {
  id: string;
  trainerId: string;
  trainerName?: string | null;
  totalPaise: number;
  status: string;
  period?: string | null;
  paidAt?: string | null;
  lines?: TrainerPayoutLineRecord[];
}

export interface OrgJoinRequestRecord {
  id: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  planId?: string | null;
  referralCode?: string | null;
  status?: string | null;
  createdAt?: string;
}

export interface OrgMemberRecord {
  profile: {
    id: string;
    userId: string;
    orgId: string;
    fitnessGoal?: string | null;
    notes?: string | null;
    profilePhotoUrl?: string | null;
    createdAt?: string | null;
  };
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    dateOfBirth?: string | null;
    fitnessGoal?: string | null;
    profilePhotoUrl?: string | null;
  } | null;
  lastCheckIn?: { checkedInAt?: string; status?: string } | null;
  activeSubscription?: {
    id?: string;
    status?: string;
    endsAt?: string | null;
    remainingVisits?: number | null;
  } | null;
  assignedTrainer?: {
    id: string;
    name: string;
    email: string;
    profilePhotoUrl?: string | null;
  } | null;
}
