import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuthSessionSummary, PaymentMode } from "@zook/core";
import { mobileApiFetch } from "./api";
import { useAuth } from "./auth";
import { useBranchSelection } from "./branch-selection";
import type { NotificationPreferenceRecord } from "./notification-preferences";

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
  recentAttendance: Array<{
    id: string;
    checkedInAt: string;
    status: string;
    source?: string;
  }>;
  unreadNotifications: number;
  activeGoals: number;
  assignedPlans: number;
  streakDays?: number;
  todayPlanName?: string | null;
  nextCheckInEstimate?: string | null;
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

export interface OwnerDashboardData {
  organization?: {
    id: string;
    name: string;
    status?: string;
    trialEndAt?: string | null;
  } | null;
  metrics?: OwnerDashboardMetric[];
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

function queryString(input: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value) {
      params.set(key, value);
    }
  }
  const result = params.toString();
  return result ? `?${result}` : "";
}

export function useCurrentUser() {
  const { activeOrgId, session, status, token } = useAuth();
  return useQuery({
    queryKey: ["auth", "me", activeOrgId],
    queryFn: () =>
      mobileApiFetch<AuthSessionSummary>("/auth/me", {
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
      }),
    enabled: status === "authenticated" && Boolean(token),
    initialData: session,
  });
}

export function useMyOrganizations() {
  const { activeOrgId, status, token } = useAuth();
  return useQuery({
    queryKey: ["me", "orgs", activeOrgId],
    queryFn: async () => {
      const session = await mobileApiFetch<{
        organizations: AuthSessionSummary["organizations"];
        activeOrgId?: string;
      }>("/me/orgs", { token, ...(activeOrgId ? { orgId: activeOrgId } : {}) });
      return session.organizations;
    },
    enabled: status === "authenticated" && Boolean(token),
  });
}

export function useMyProfile() {
  const { activeOrgId, status, token } = useAuth();
  return useQuery({
    queryKey: ["me", "profile", activeOrgId],
    queryFn: () =>
      mobileApiFetch<MyProfileData>("/me/profile", {
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
      }),
    enabled: status === "authenticated" && Boolean(token),
  });
}

export function useActiveOrganization() {
  const { activeOrgId, session, status, token } = useAuth();
  return useQuery({
    queryKey: ["me", "active-org", activeOrgId],
    queryFn: async () => {
      const currentSession = await mobileApiFetch<AuthSessionSummary>("/auth/me", {
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
      });
      return (
        currentSession.organizations.find(
          (organization) => organization.orgId === currentSession.activeOrgId,
        ) ??
        currentSession.activeOrganization ??
        null
      );
    },
    enabled: status === "authenticated" && Boolean(token),
    initialData:
      session?.organizations.find((organization) => organization.orgId === activeOrgId) ??
      session?.activeOrganization ??
      null,
  });
}

export function useMemberHome() {
  const { activeOrgId, status, token } = useAuth();
  return useQuery({
    queryKey: ["me", "home", activeOrgId],
    queryFn: () =>
      mobileApiFetch<MemberHomeData>("/me/home", {
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
      }),
    enabled: status === "authenticated" && Boolean(token),
  });
}

export function useGymSearch(input: { query?: string; city?: string } = {}) {
  return useQuery({
    queryKey: ["gyms", input.query ?? "", input.city ?? ""],
    queryFn: () =>
      mobileApiFetch<{ gyms: GymSearchResult[] }>(
        `/orgs/public/search${queryString({ q: input.query, city: input.city })}`,
      ),
  });
}

export function useGymProfile(username: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["gym", username],
    queryFn: () => mobileApiFetch<GymProfileData>(`/orgs/public/${username}`, { token }),
    enabled: Boolean(username),
  });
}

export function useMyMemberships() {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: ["me", "memberships"],
    queryFn: () =>
      mobileApiFetch<{
        subscriptions: Array<Record<string, unknown>>;
        payments?: OrgPaymentRecord[];
      }>("/me/memberships", {
        token,
      }),
    enabled: status === "authenticated" && Boolean(token),
  });
}

export function useActiveMembership() {
  const { activeOrgId, status, token } = useAuth();
  return useQuery({
    queryKey: ["me", "membership", "active", activeOrgId],
    queryFn: () =>
      mobileApiFetch<{ membership: ActiveMembershipRecord | null }>("/me/membership/active", {
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
      }),
    enabled: status === "authenticated" && Boolean(token),
  });
}

export function useMyAttendance() {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: ["me", "attendance"],
    queryFn: () =>
      mobileApiFetch<{ attendance: Array<Record<string, unknown>> }>("/me/attendance", { token }),
    enabled: status === "authenticated" && Boolean(token),
  });
}

export function useMyPlans() {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: ["me", "plans"],
    queryFn: () => mobileApiFetch<{ plans: MyPlanRecord[] }>("/me/plans", { token }),
    enabled: status === "authenticated" && Boolean(token),
  });
}

export function usePlanDetail(assignmentId?: string) {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: ["me", "plans", assignmentId],
    queryFn: () =>
      mobileApiFetch<{ assignment: MyPlanRecord }>(`/me/plans/${assignmentId}`, { token }),
    enabled: status === "authenticated" && Boolean(token) && Boolean(assignmentId),
  });
}

export function usePlanExercises(assignmentId?: string) {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: ["me", "plans", assignmentId, "exercises"],
    queryFn: () =>
      mobileApiFetch<{
        assignment: MyPlanRecord;
        plan: PlanContentRecord;
        progress: PlanProgressRecord | null;
        exercises: PlanExerciseRecord[];
      }>(`/me/plans/${assignmentId}/exercises`, { token }),
    enabled: status === "authenticated" && Boolean(token) && Boolean(assignmentId),
  });
}

export function useMyNotifications() {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: ["me", "notifications"],
    queryFn: () =>
      mobileApiFetch<{ notifications: Array<Record<string, unknown>> }>("/me/notifications", {
        token,
      }),
    enabled: status === "authenticated" && Boolean(token),
  });
}

export function useMyNotificationPreferences() {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: ["me", "notification-preferences"],
    queryFn: () =>
      mobileApiFetch<{ preferences: NotificationPreferenceRecord[] }>(
        "/me/notification-preferences",
        {
          token,
        },
      ),
    enabled: status === "authenticated" && Boolean(token),
  });
}

export function useMyPushDevices() {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: ["me", "push-devices"],
    queryFn: () =>
      mobileApiFetch<{ devices: PushDeviceRecord[] }>("/me/push-devices", {
        token,
      }),
    enabled: status === "authenticated" && Boolean(token),
  });
}

export type PrivacyRequestRecord = {
  id: string;
  status: string;
  createdAt?: string;
  completedAt?: string | null;
  scheduledFor?: string | null;
  exportUrl?: string | null;
};

export function useMyConsents() {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: ["me", "consents"],
    queryFn: () =>
      mobileApiFetch<{
        exportRequests: PrivacyRequestRecord[];
        deletionRequests: PrivacyRequestRecord[];
        exportJobs: PrivacyRequestRecord[];
        deletionJobs: PrivacyRequestRecord[];
      }>("/me/consents", { token }),
    enabled: status === "authenticated" && Boolean(token),
  });
}

export function useMyGoals() {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: ["me", "goals"],
    queryFn: () =>
      mobileApiFetch<{ goals: Array<Record<string, unknown>> }>("/me/goals", { token }),
    enabled: status === "authenticated" && Boolean(token),
  });
}

export function useShopProducts(orgId?: string) {
  const { activeOrgId, status, token } = useAuth();
  const { selectedBranchId } = useBranchSelection();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useQuery({
    queryKey: ["shop", "products", resolvedOrgId, selectedBranchId],
    queryFn: () =>
      mobileApiFetch<{ products: ShopProductRecord[] }>(
        `/orgs/${resolvedOrgId}/products${queryString({ branchId: selectedBranchId })}`,
        {
          token,
          orgId: resolvedOrgId,
          ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
        },
      ),
    enabled: status === "authenticated" && Boolean(token) && Boolean(resolvedOrgId),
  });
}

export function useOrgProducts(orgId?: string) {
  return useShopProducts(orgId);
}

export function useMyShopOrders() {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: ["me", "shop-orders"],
    queryFn: () => mobileApiFetch<{ orders: ShopOrderRecord[] }>("/me/shop-orders", { token }),
    enabled: status === "authenticated" && Boolean(token),
  });
}

export function useMyTracking() {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: ["me", "tracking", "summary"],
    queryFn: () =>
      mobileApiFetch<{
        summary: { weeklyCount: number; totalDuration: number; recentCount: number };
        recentWorkouts: Array<Record<string, unknown>>;
        latestBodyProgress: Record<string, unknown> | null;
        habits: Array<Record<string, unknown>>;
      }>("/me/tracking/summary", { token }),
    enabled: status === "authenticated" && Boolean(token),
  });
}

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

export function useMyBodyProgress() {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: ["me", "tracking", "body-progress"],
    queryFn: () =>
      mobileApiFetch<{ entries: BodyProgressEntryRecord[] }>("/me/tracking/body-progress", {
        token,
      }),
    enabled: status === "authenticated" && Boolean(token),
  });
}

export function useMyTrackingWorkouts() {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: ["me", "tracking", "workouts"],
    queryFn: () =>
      mobileApiFetch<{ workouts: Array<Record<string, unknown>> }>("/me/tracking/workouts", {
        token,
      }),
    enabled: status === "authenticated" && Boolean(token),
  });
}

export function useMyTrackingHabits() {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: ["me", "tracking", "habits"],
    queryFn: () =>
      mobileApiFetch<{ habits: Array<Record<string, unknown>> }>("/me/tracking/habits", { token }),
    enabled: status === "authenticated" && Boolean(token),
  });
}

export function useOwnerDashboard(orgId?: string) {
  const { activeOrgId, status, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useQuery({
    queryKey: ["org", resolvedOrgId, "dashboard"],
    queryFn: () =>
      mobileApiFetch<OwnerDashboardData>(`/orgs/${resolvedOrgId}/dashboard`, {
        token,
        orgId: resolvedOrgId,
      }),
    enabled: status === "authenticated" && Boolean(token) && Boolean(resolvedOrgId),
  });
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

export function useOrgJoinRequests(orgId?: string) {
  const { activeOrgId, status, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useQuery({
    queryKey: ["org", resolvedOrgId, "join-requests"],
    queryFn: () =>
      mobileApiFetch<{ joinRequests: OrgJoinRequestRecord[] }>(
        `/orgs/${resolvedOrgId}/join-requests`,
        {
          token,
          orgId: resolvedOrgId,
        },
      ),
    enabled: status === "authenticated" && Boolean(token) && Boolean(resolvedOrgId),
  });
}

export function useReceptionQueue(orgId?: string) {
  const { activeOrgId, status, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useQuery({
    queryKey: ["org", resolvedOrgId, "attendance", "live"],
    queryFn: () =>
      mobileApiFetch<{ records: ReceptionQueueRecord[] }>(
        `/orgs/${resolvedOrgId}/attendance/live`,
        {
          token,
          orgId: resolvedOrgId,
        },
      ),
    enabled: status === "authenticated" && Boolean(token) && Boolean(resolvedOrgId),
    refetchInterval: 20_000,
  });
}

export function useOrgAttendanceToday(orgId?: string) {
  const { activeOrgId, status, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useQuery({
    queryKey: ["org", resolvedOrgId, "attendance", "today"],
    queryFn: () =>
      mobileApiFetch<{ records: ReceptionQueueRecord[] }>(
        `/orgs/${resolvedOrgId}/attendance/today`,
        { token, orgId: resolvedOrgId },
      ),
    enabled: status === "authenticated" && Boolean(token) && Boolean(resolvedOrgId),
    refetchInterval: 30_000,
  });
}

export function useOrgAttendancePending(orgId?: string, options?: { enabled?: boolean }) {
  const { activeOrgId, status, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useQuery({
    queryKey: ["org", resolvedOrgId, "attendance", "pending"],
    queryFn: () =>
      mobileApiFetch<{ records: ReceptionQueueRecord[] }>(
        `/orgs/${resolvedOrgId}/attendance/pending`,
        { token, orgId: resolvedOrgId },
      ),
    enabled:
      options?.enabled !== false &&
      status === "authenticated" &&
      Boolean(token) &&
      Boolean(resolvedOrgId),
    refetchInterval: 20_000,
  });
}

export function useOrgRecentPayments(orgId?: string) {
  const { activeOrgId, status, token } = useAuth();
  const { selectedBranchId } = useBranchSelection();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useQuery({
    queryKey: ["org", resolvedOrgId, "payments", "recent", selectedBranchId],
    queryFn: () =>
      mobileApiFetch<{ payments: OrgPaymentRecord[] }>(
        `/orgs/${resolvedOrgId}/payments/recent${queryString({ branchId: selectedBranchId })}`,
        {
          token,
          orgId: resolvedOrgId,
          ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
        },
      ),
    enabled: status === "authenticated" && Boolean(token) && Boolean(resolvedOrgId),
  });
}

export function useOrgActiveShopOrders(orgId?: string) {
  const { activeOrgId, status, token } = useAuth();
  const { selectedBranchId } = useBranchSelection();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useQuery({
    queryKey: ["org", resolvedOrgId, "shop", "orders", "active", selectedBranchId],
    queryFn: () =>
      mobileApiFetch<{ orders: ShopOrderRecord[]; summary?: { fulfilledToday?: number } }>(
        `/orgs/${resolvedOrgId}/shop/orders/active${queryString({ branchId: selectedBranchId })}`,
        {
          token,
          orgId: resolvedOrgId,
          ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
        },
      ),
    enabled: status === "authenticated" && Boolean(token) && Boolean(resolvedOrgId),
    refetchInterval: 30_000,
  });
}

export function useTrainerClients(orgId?: string, trainerUserId?: string, enabled = true) {
  const { activeOrgId, session, status, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  const resolvedTrainerId = trainerUserId ?? session?.user.id;
  return useQuery({
    queryKey: ["org", resolvedOrgId, "trainer", resolvedTrainerId, "clients"],
    queryFn: () =>
      mobileApiFetch<{ clients: TrainerClientRecord[] }>(
        `/orgs/${resolvedOrgId}/trainers/${resolvedTrainerId}/clients`,
        { token, orgId: resolvedOrgId },
      ),
    enabled:
      enabled &&
      status === "authenticated" &&
      Boolean(token) &&
      Boolean(resolvedOrgId) &&
      Boolean(resolvedTrainerId),
  });
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

export function useOrgMembers(orgId?: string) {
  const { activeOrgId, status, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useQuery({
    queryKey: ["org", resolvedOrgId, "members"],
    queryFn: () =>
      mobileApiFetch<{ members: OrgMemberRecord[] }>(`/orgs/${resolvedOrgId}/members`, {
        token,
        orgId: resolvedOrgId,
      }),
    enabled: status === "authenticated" && Boolean(token) && Boolean(resolvedOrgId),
  });
}

type ManualPaymentMode = Extract<
  PaymentMode,
  "CASH" | "DIRECT_UPI" | "BANK_TRANSFER" | "CARD" | "OTHER"
>;

function getMutationContext(token?: string, orgId?: string) {
  if (!token) {
    throw new Error("Authentication is required.");
  }
  if (!orgId) {
    throw new Error("An active organization is required.");
  }
  return { token, orgId };
}

export function useApproveAttendance(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useMutation({
    mutationFn: (input: string | { recordId: string; reason?: string }) => {
      const ctx = getMutationContext(token, resolvedOrgId);
      const recordId = typeof input === "string" ? input : input.recordId;
      const reason = typeof input === "string" ? undefined : input.reason;
      return mobileApiFetch<{ record: ReceptionQueueRecord }>(
        `/orgs/${ctx.orgId}/attendance/${recordId}/approve`,
        {
          method: "POST",
          token: ctx.token,
          orgId: ctx.orgId,
          ...(reason ? { body: { reason } } : {}),
        },
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["org", resolvedOrgId, "attendance"] }),
        queryClient.invalidateQueries({ queryKey: ["org", resolvedOrgId, "dashboard"] }),
      ]);
    },
  });
}

export function useApproveJoinRequest(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useMutation({
    mutationFn: (joinRequestId: string) => {
      const ctx = getMutationContext(token, resolvedOrgId);
      return mobileApiFetch<{ joinRequest: OrgJoinRequestRecord }>(
        `/orgs/${ctx.orgId}/join-requests/${joinRequestId}/approve`,
        { method: "POST", token: ctx.token, orgId: ctx.orgId },
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["org", resolvedOrgId, "join-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["org", resolvedOrgId, "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["org", resolvedOrgId, "members"] }),
      ]);
    },
  });
}

export function useRejectJoinRequest(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useMutation({
    mutationFn: (joinRequestId: string) => {
      const ctx = getMutationContext(token, resolvedOrgId);
      return mobileApiFetch<{ joinRequest: OrgJoinRequestRecord }>(
        `/orgs/${ctx.orgId}/join-requests/${joinRequestId}/reject`,
        { method: "POST", token: ctx.token, orgId: ctx.orgId },
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["org", resolvedOrgId, "join-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["org", resolvedOrgId, "dashboard"] }),
      ]);
    },
  });
}

export function useRejectAttendance(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useMutation({
    mutationFn: ({ recordId, reason }: { recordId: string; reason: string }) => {
      const ctx = getMutationContext(token, resolvedOrgId);
      return mobileApiFetch<{ record: ReceptionQueueRecord }>(
        `/orgs/${ctx.orgId}/attendance/${recordId}/reject`,
        { method: "POST", token: ctx.token, orgId: ctx.orgId, body: { reason } },
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["org", resolvedOrgId, "attendance"] }),
        queryClient.invalidateQueries({ queryKey: ["org", resolvedOrgId, "dashboard"] }),
      ]);
    },
  });
}

export function useManualAttendance(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useMutation({
    mutationFn: (body: {
      memberUserId: string;
      branchId?: string;
      reason: string;
      notes?: string;
    }) => {
      const ctx = getMutationContext(token, resolvedOrgId);
      return mobileApiFetch<{ record: ReceptionQueueRecord }>(
        `/orgs/${ctx.orgId}/attendance/manual`,
        { method: "POST", token: ctx.token, orgId: ctx.orgId, body },
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["org", resolvedOrgId, "attendance"] }),
        queryClient.invalidateQueries({ queryKey: ["org", resolvedOrgId, "members"] }),
        queryClient.invalidateQueries({ queryKey: ["org", resolvedOrgId, "dashboard"] }),
      ]);
    },
  });
}

export function useRecordManualPayment(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const { selectedBranchId } = useBranchSelection();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useMutation({
    mutationFn: (body: {
      memberUserId: string;
      planId?: string;
      subscriptionId?: string;
      amountPaise: number;
      mode: ManualPaymentMode;
      proofAssetId?: string;
      receiptNumber?: string;
      notes?: string;
      branchId?: string;
    }) => {
      const ctx = getMutationContext(token, resolvedOrgId);
      const branchId = body.branchId ?? selectedBranchId;
      return mobileApiFetch<{
        payment: OrgPaymentRecord;
        subscription?: Record<string, unknown> | null;
      }>(`/orgs/${ctx.orgId}/manual-payments`, {
        method: "POST",
        token: ctx.token,
        orgId: ctx.orgId,
        ...(branchId ? { branchId } : {}),
        body: { ...body, ...(branchId ? { branchId } : {}) },
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["org", resolvedOrgId, "payments"] }),
        queryClient.invalidateQueries({ queryKey: ["org", resolvedOrgId, "members"] }),
        queryClient.invalidateQueries({ queryKey: ["org", resolvedOrgId, "dashboard"] }),
      ]);
    },
  });
}

export function useFulfillShopOrder(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useMutation({
    mutationFn: (
      input:
        | string
        | {
            orderId: string;
            skipCode?: boolean;
            skipReason?: string;
          },
    ) => {
      const orderId = typeof input === "string" ? input : input.orderId;
      const ctx = getMutationContext(token, resolvedOrgId);
      return mobileApiFetch<{ order: ShopOrderRecord }>(
        `/orgs/${ctx.orgId}/shop/orders/${orderId}/fulfill`,
        {
          method: "POST",
          token: ctx.token,
          orgId: ctx.orgId,
          body:
            typeof input === "string"
              ? undefined
              : {
                  pickupCodeSkipped: Boolean(input.skipCode),
                  ...(input.skipReason ? { skipReason: input.skipReason } : {}),
                },
        },
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["org", resolvedOrgId, "shop", "orders"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "shop-orders"] }),
        queryClient.invalidateQueries({ queryKey: ["shop", "products", resolvedOrgId] }),
        queryClient.invalidateQueries({ queryKey: ["org", resolvedOrgId, "dashboard"] }),
      ]);
    },
  });
}

export function useCreateShopOrder(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const { selectedBranchId } = useBranchSelection();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useMutation({
    mutationFn: (input: {
      items: Array<{ productId: string; quantity: number }>;
      branchId?: string;
    }) => {
      const ctx = getMutationContext(token, resolvedOrgId);
      const branchId = input.branchId ?? selectedBranchId;
      return mobileApiFetch<{
        order: ShopOrderRecord;
        checkoutUrl?: string;
        checkoutData?: Record<string, unknown> | null;
        session: { id: string; status: string; provider?: string };
      }>("/shop/orders", {
        method: "POST",
        token: ctx.token,
        orgId: ctx.orgId,
        ...(branchId ? { branchId } : {}),
        body: { orgId: ctx.orgId, items: input.items, ...(branchId ? { branchId } : {}) },
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "shop-orders"] }),
        queryClient.invalidateQueries({ queryKey: ["shop", "products", resolvedOrgId] }),
        queryClient.invalidateQueries({ queryKey: ["org", resolvedOrgId, "shop", "orders"] }),
      ]);
    },
  });
}

export function useCompleteMockPayment() {
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const { selectedBranchId } = useBranchSelection();
  return useMutation({
    mutationFn: (input: string | { sessionId: string; branchId?: string }) => {
      if (!token) {
        throw new Error("Authentication is required.");
      }
      const sessionId = typeof input === "string" ? input : input.sessionId;
      const branchId =
        typeof input === "string" ? selectedBranchId : (input.branchId ?? selectedBranchId);
      return mobileApiFetch<{
        session: { id: string; status: string };
        payment?: OrgPaymentRecord | null;
      }>(`/payments/mock/${sessionId}/complete`, {
        method: "POST",
        token,
        ...(branchId ? { branchId } : {}),
        body: { status: "SUCCEEDED", ...(branchId ? { branchId } : {}) },
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "shop-orders"] }),
        queryClient.invalidateQueries({ queryKey: ["shop", "products"] }),
        queryClient.invalidateQueries({ queryKey: ["org"] }),
      ]);
    },
  });
}

export function useCompletePlanAssignment() {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  return useMutation({
    mutationFn: (input: {
      assignmentId: string;
      exercises?: Array<{
        id?: string;
        name: string;
        completed?: boolean;
        setsCompleted?: number;
        reps?: number;
        weightKg?: number;
        notes?: string;
      }>;
      feedback?: string;
      progressJson?: Record<string, unknown>;
    }) => {
      if (!token) {
        throw new Error("Authentication is required.");
      }
      return mobileApiFetch<{ progress: PlanProgressRecord; completedExercises: string[] }>(
        `/me/plans/${input.assignmentId}/complete`,
        {
          method: "POST",
          token,
          ...(activeOrgId ? { orgId: activeOrgId } : {}),
          body: {
            orgId: activeOrgId,
            exercises: input.exercises ?? [],
            feedback: input.feedback,
            progressJson: input.progressJson ?? {},
          },
        },
      );
    },
    onSuccess: async (_, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "plans"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "plans", input.assignmentId] }),
        queryClient.invalidateQueries({ queryKey: ["me", "home"] }),
      ]);
    },
  });
}
