import { useQuery } from "@tanstack/react-query";
import type { AuthSessionSummary } from "@zook/core";
import { mobileApiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { queryKeys } from "@/lib/domains/shared/keys";
import { queryString } from "@/lib/domains/shared/request";
import type {
  ActiveMembershipRecord,
  MemberBadgeRecord,
  MemberDashboardData,
  MemberEngagementData,
  MemberHomeData,
  MyProfileData,
  OrgPaymentRecord,
  ReferralCodeRecord,
  ReferralRewardRecord,
} from "@/lib/domains/shared/types";

export function useCurrentUser() {
  const { activeOrgId, session, status, token } = useAuth();
  return useQuery({
    queryKey: queryKeys.auth.currentUser(activeOrgId),
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
    queryKey: queryKeys.member.organizations(activeOrgId),
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
    queryKey: queryKeys.member.profile(activeOrgId),
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
    queryKey: queryKeys.member.activeOrganization(activeOrgId),
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
    queryKey: queryKeys.member.home(activeOrgId),
    queryFn: () =>
      mobileApiFetch<MemberHomeData>("/me/home", {
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
      }),
    enabled: status === "authenticated" && Boolean(token),
  });
}

export function memberDashboardQueryOptions(input: {
  activeOrgId?: string | null;
  token?: string | null;
}) {
  return {
    queryKey: queryKeys.member.dashboard(input.activeOrgId ?? null),
    queryFn: () =>
      mobileApiFetch<MemberDashboardData>(
        `/me/dashboard${queryString({ orgId: input.activeOrgId ?? undefined })}`,
        {
          token: input.token ?? undefined,
          ...(input.activeOrgId ? { orgId: input.activeOrgId } : {}),
        },
      ),
    staleTime: 30_000,
  };
}

export function useMemberDashboard() {
  const { activeOrgId, status, token } = useAuth();
  return useQuery({
    ...memberDashboardQueryOptions({ activeOrgId, token }),
    enabled: status === "authenticated" && Boolean(token),
  });
}

export function useMyEngagement() {
  const { activeOrgId, status, token } = useAuth();
  return useQuery({
    queryKey: queryKeys.member.engagement(activeOrgId),
    queryFn: () =>
      mobileApiFetch<MemberEngagementData>("/me/engagement", {
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
      }),
    enabled: status === "authenticated" && Boolean(token),
  });
}

export function useMyBadges() {
  const { activeOrgId, status, token } = useAuth();
  return useQuery({
    queryKey: queryKeys.member.badges(activeOrgId),
    queryFn: () =>
      mobileApiFetch<{ badges: MemberBadgeRecord[] }>("/me/badges", {
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
      }),
    enabled: status === "authenticated" && Boolean(token),
  });
}

export function useMyMemberships() {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: queryKeys.member.membership(),
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
    queryKey: queryKeys.member.activeMembership(activeOrgId),
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
    queryKey: queryKeys.member.attendance(),
    queryFn: () =>
      mobileApiFetch<{ attendance: Array<Record<string, unknown>> }>("/me/attendance", { token }),
    enabled: status === "authenticated" && Boolean(token),
  });
}

export function useMyReferralCodes() {
  const { activeOrgId, status, token } = useAuth();
  return useQuery({
    queryKey: queryKeys.member.referralCodes(activeOrgId),
    queryFn: () =>
      mobileApiFetch<{
        referralCodes: ReferralCodeRecord[];
        rewards: ReferralRewardRecord[];
        links?: { web?: string; short?: string; app?: string };
        policy?: Record<string, unknown> | null;
      }>(`/me/referral-codes${queryString({ orgId: activeOrgId })}`, { token }),
    enabled: status === "authenticated" && Boolean(token) && Boolean(activeOrgId),
  });
}

export function useMyGoals() {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: queryKeys.member.goals(),
    queryFn: () =>
      mobileApiFetch<{ goals: Array<Record<string, unknown>> }>("/me/goals", { token }),
    enabled: status === "authenticated" && Boolean(token),
  });
}
