import { useQuery } from "@tanstack/react-query";
import type { AuthSessionSummary } from "@zook/core";
import { mobileApiFetch } from "./api";
import { useAuth } from "./auth";
import type { NotificationPreferenceRecord } from "./notification-preferences";

export interface MemberHomeData {
  activeOrganization: {
    id?: string;
    name: string;
    status: string;
    city?: string | null;
    state?: string | null;
  } | null;
  activeMembership: {
    id?: string;
    status?: string;
    endsAt?: string | null;
    remainingVisits?: number | null;
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
}

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
  } | null;
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
  user?: { name?: string; email?: string } | null;
  profile?: { fitnessGoal?: string | null } | null;
}

export interface ReceptionQueueRecord {
  id: string;
  status: string;
  checkedInAt: string;
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
  joinRequests?: Array<{
    id: string;
    userId: string;
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
      mobileApiFetch<{ subscriptions: Array<Record<string, unknown>> }>("/me/memberships", {
        token,
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
    queryFn: () =>
      mobileApiFetch<{ plans: Array<Record<string, unknown>> }>("/me/plans", { token }),
    enabled: status === "authenticated" && Boolean(token),
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
      mobileApiFetch<{ preferences: NotificationPreferenceRecord[] }>("/me/notification-preferences", {
        token,
      }),
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
  const resolvedOrgId = orgId ?? activeOrgId;
  return useQuery({
    queryKey: ["shop", "products", resolvedOrgId],
    queryFn: () =>
      mobileApiFetch<{ products: Array<Record<string, unknown>> }>(
        `/orgs/${resolvedOrgId}/products`,
        { token },
      ),
    enabled: status === "authenticated" && Boolean(token) && Boolean(resolvedOrgId),
  });
}

export function useMyShopOrders() {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: ["me", "shop-orders"],
    queryFn: () =>
      mobileApiFetch<{ orders: Array<Record<string, unknown>> }>("/me/shop-orders", { token }),
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

export function useTrainerClients(orgId?: string, trainerUserId?: string) {
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
      status === "authenticated" &&
      Boolean(token) &&
      Boolean(resolvedOrgId) &&
      Boolean(resolvedTrainerId),
  });
}
