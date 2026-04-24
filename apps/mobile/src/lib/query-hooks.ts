import { useQuery } from "@tanstack/react-query";
import type { AuthSessionSummary } from "@zook/core";
import { mobileApiFetch } from "./api";
import { useAuth } from "./auth";

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
        ...(activeOrgId ? { orgId: activeOrgId } : {})
      }),
    enabled: status === "authenticated" && Boolean(token),
    initialData: session
  });
}

export function useMyOrganizations() {
  const { activeOrgId, status, token } = useAuth();
  return useQuery({
    queryKey: ["me", "orgs", activeOrgId],
    queryFn: async () => {
      const session = await mobileApiFetch<{ organizations: AuthSessionSummary["organizations"]; activeOrgId?: string }>(
        "/me/orgs",
        { token, ...(activeOrgId ? { orgId: activeOrgId } : {}) }
      );
      return session.organizations;
    },
    enabled: status === "authenticated" && Boolean(token)
  });
}

export function useActiveOrganization() {
  const { activeOrgId, session, status, token } = useAuth();
  return useQuery({
    queryKey: ["me", "active-org", activeOrgId],
    queryFn: async () => {
      const currentSession = await mobileApiFetch<AuthSessionSummary>("/auth/me", {
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {})
      });
      return (
        currentSession.organizations.find((organization) => organization.orgId === currentSession.activeOrgId) ??
        currentSession.activeOrganization ??
        null
      );
    },
    enabled: status === "authenticated" && Boolean(token),
    initialData:
      session?.organizations.find((organization) => organization.orgId === activeOrgId) ??
      session?.activeOrganization ??
      null
  });
}

export function useMemberHome() {
  const { activeOrgId, status, token } = useAuth();
  return useQuery({
    queryKey: ["me", "home", activeOrgId],
    queryFn: () =>
      mobileApiFetch<{
        activeOrganization: { name: string; status: string } | null;
        activeMembership: { endsAt?: string | null; remainingVisits?: number | null } | null;
        activePlan: { name: string; type: string } | null;
        recentAttendance: Array<{ id: string; checkedInAt: string; status: string }>;
        unreadNotifications: number;
        activeGoals: number;
        assignedPlans: number;
      }>("/me/home", {
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {})
      }),
    enabled: status === "authenticated" && Boolean(token)
  });
}

export function useGymSearch(input: { query?: string; city?: string } = {}) {
  return useQuery({
    queryKey: ["gyms", input.query ?? "", input.city ?? ""],
    queryFn: () =>
      mobileApiFetch<{ gyms: Array<{ id: string; username: string; name: string; city: string; state: string; joinMode: string; amenities: string[] }> }>(
        `/orgs/public/search${queryString({ q: input.query, city: input.city })}`
      )
  });
}

export function useGymProfile(username: string) {
  return useQuery({
    queryKey: ["gym", username],
    queryFn: () => mobileApiFetch<{ org: Record<string, unknown>; plans: Array<Record<string, unknown>> }>(`/orgs/public/${username}`),
    enabled: Boolean(username)
  });
}

export function useMyMemberships() {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: ["me", "memberships"],
    queryFn: () => mobileApiFetch<{ subscriptions: Array<Record<string, unknown>> }>("/me/memberships", { token }),
    enabled: status === "authenticated" && Boolean(token)
  });
}

export function useMyAttendance() {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: ["me", "attendance"],
    queryFn: () => mobileApiFetch<{ attendance: Array<Record<string, unknown>> }>("/me/attendance", { token }),
    enabled: status === "authenticated" && Boolean(token)
  });
}

export function useMyPlans() {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: ["me", "plans"],
    queryFn: () => mobileApiFetch<{ plans: Array<Record<string, unknown>> }>("/me/plans", { token }),
    enabled: status === "authenticated" && Boolean(token)
  });
}

export function useMyNotifications() {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: ["me", "notifications"],
    queryFn: () => mobileApiFetch<{ notifications: Array<Record<string, unknown>> }>("/me/notifications", { token }),
    enabled: status === "authenticated" && Boolean(token)
  });
}

export function useMyGoals() {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: ["me", "goals"],
    queryFn: () => mobileApiFetch<{ goals: Array<Record<string, unknown>> }>("/me/goals", { token }),
    enabled: status === "authenticated" && Boolean(token)
  });
}

export function useShopProducts(orgId?: string) {
  const { activeOrgId, status, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useQuery({
    queryKey: ["shop", "products", resolvedOrgId],
    queryFn: () => mobileApiFetch<{ products: Array<Record<string, unknown>> }>(`/orgs/${resolvedOrgId}/products`, { token }),
    enabled: status === "authenticated" && Boolean(token) && Boolean(resolvedOrgId)
  });
}

export function useMyShopOrders() {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: ["me", "shop-orders"],
    queryFn: () => mobileApiFetch<{ orders: Array<Record<string, unknown>> }>("/me/shop-orders", { token }),
    enabled: status === "authenticated" && Boolean(token)
  });
}

export function useOwnerDashboard(orgId?: string) {
  const { activeOrgId, status, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useQuery({
    queryKey: ["org", resolvedOrgId, "dashboard"],
    queryFn: () => mobileApiFetch<Record<string, unknown>>(`/orgs/${resolvedOrgId}/dashboard`, { token, orgId: resolvedOrgId }),
    enabled: status === "authenticated" && Boolean(token) && Boolean(resolvedOrgId)
  });
}

export function useReceptionQueue(orgId?: string) {
  const { activeOrgId, status, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useQuery({
    queryKey: ["org", resolvedOrgId, "attendance", "live"],
    queryFn: () => mobileApiFetch<{ records: Array<Record<string, unknown>> }>(`/orgs/${resolvedOrgId}/attendance/live`, { token, orgId: resolvedOrgId }),
    enabled: status === "authenticated" && Boolean(token) && Boolean(resolvedOrgId),
    refetchInterval: 20_000
  });
}

export function useTrainerClients(orgId?: string, trainerUserId?: string) {
  const { activeOrgId, session, status, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  const resolvedTrainerId = trainerUserId ?? session?.user.id;
  return useQuery({
    queryKey: ["org", resolvedOrgId, "trainer", resolvedTrainerId, "clients"],
    queryFn: () =>
      mobileApiFetch<{ clients: Array<Record<string, unknown>> }>(
        `/orgs/${resolvedOrgId}/trainers/${resolvedTrainerId}/clients`,
        { token, orgId: resolvedOrgId }
      ),
    enabled: status === "authenticated" && Boolean(token) && Boolean(resolvedOrgId) && Boolean(resolvedTrainerId)
  });
}
