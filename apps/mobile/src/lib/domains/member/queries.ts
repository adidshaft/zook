import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AuthSessionSummary } from "@zook/core";
import { mobileApiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useBranchSelection } from "@/lib/branch-selection";
import { queryKeys } from "@/lib/domains/shared/keys";
import { queryString } from "@/lib/domains/shared/request";
import { getStoredValue, setStoredValue } from "@/lib/storage";
import type {
  ActiveMembershipRecord,
  MemberBadgeRecord,
  MemberClassRecord,
  MemberDashboardData,
  MemberEngagementData,
  MemberHomeData,
  MyProfileData,
  OrgPaymentRecord,
  ReferralCodeRecord,
  ReferralRewardRecord,
} from "@/lib/domains/shared/types";

const MEMBER_QUERY_CACHE_NAMESPACE = "zook_member_query_cache";
const MEMBER_QUERY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

type CachedQuerySnapshot<T> = {
  cachedAt: number;
  data: T;
};

function memberQueryCacheKey(scope: "home" | "dashboard", orgId?: string | null) {
  return `${MEMBER_QUERY_CACHE_NAMESPACE}:${scope}:${encodeURIComponent(orgId ?? "no-org")}`;
}

function readCachedQuerySnapshot<T>(value: string | null): T | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as Partial<CachedQuerySnapshot<T>>;
    if (typeof parsed.cachedAt !== "number" || parsed.data === undefined) {
      return undefined;
    }
    if (Date.now() - parsed.cachedAt > MEMBER_QUERY_CACHE_TTL_MS) {
      return undefined;
    }
    return parsed.data;
  } catch {
    return undefined;
  }
}

function useStoredQuerySnapshot<T>(key: string, enabled: boolean) {
  const [snapshot, setSnapshot] = useState<T | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    if (!enabled) {
      setSnapshot(undefined);
      return () => {
        mounted = false;
      };
    }
    void getStoredValue(key).then((value) => {
      if (mounted) {
        setSnapshot(readCachedQuerySnapshot<T>(value));
      }
    });
    return () => {
      mounted = false;
    };
  }, [enabled, key]);

  return snapshot;
}

function persistQuerySnapshot<T>(key: string, data: T) {
  void setStoredValue(
    key,
    JSON.stringify({
      cachedAt: Date.now(),
      data,
    } satisfies CachedQuerySnapshot<T>),
  ).catch(() => {
    // Cache persistence is best-effort; the network response remains authoritative.
  });
}

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
    staleTime: 5 * 60_000,
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
    staleTime: 5 * 60_000,
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
  const enabled = status === "authenticated" && Boolean(token);
  const cacheKey = memberQueryCacheKey("home", activeOrgId);
  const cachedHome = useStoredQuerySnapshot<MemberHomeData>(cacheKey, enabled);
  const query = useQuery({
    ...memberHomeQueryOptions({ activeOrgId, token }),
    enabled,
    placeholderData: cachedHome,
  });

  useEffect(() => {
    if (query.data && !query.isPlaceholderData) {
      persistQuerySnapshot(cacheKey, query.data);
    }
  }, [cacheKey, query.data, query.isPlaceholderData]);

  return query;
}

export function memberHomeQueryOptions(input: {
  activeOrgId?: string | null;
  token?: string | null;
}) {
  return {
    queryKey: queryKeys.member.home(input.activeOrgId ?? null),
    queryFn: () =>
      mobileApiFetch<MemberHomeData>("/me/home", {
        token: input.token ?? undefined,
        ...(input.activeOrgId ? { orgId: input.activeOrgId } : {}),
      }),
    staleTime: 30_000,
  };
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
  const enabled = status === "authenticated" && Boolean(token);
  const cacheKey = memberQueryCacheKey("dashboard", activeOrgId);
  const cachedDashboard = useStoredQuerySnapshot<MemberDashboardData>(cacheKey, enabled);
  const query = useQuery({
    ...memberDashboardQueryOptions({ activeOrgId, token }),
    enabled,
    placeholderData: cachedDashboard,
  });

  useEffect(() => {
    if (query.data && !query.isPlaceholderData) {
      persistQuerySnapshot(cacheKey, query.data);
    }
  }, [cacheKey, query.data, query.isPlaceholderData]);

  return query;
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
    staleTime: 10 * 60_000,
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
    staleTime: 5 * 60_000,
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
    staleTime: 5 * 60_000,
  });
}

export function useMyAttendance() {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: queryKeys.member.attendance(),
    queryFn: () =>
      mobileApiFetch<{ attendance: Array<Record<string, unknown>> }>("/me/attendance", { token }),
    enabled: status === "authenticated" && Boolean(token),
    staleTime: 5 * 60_000,
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

export function useMyClasses() {
  const { activeOrgId, status, token } = useAuth();
  const { selectedBranchId } = useBranchSelection();
  return useQuery({
    queryKey: queryKeys.member.classes(activeOrgId, selectedBranchId),
    queryFn: () =>
      mobileApiFetch<{ classes: MemberClassRecord[] }>(
        `/orgs/${activeOrgId}/classes${queryString({ branchId: selectedBranchId ?? undefined })}`,
        {
          token,
          ...(activeOrgId ? { orgId: activeOrgId } : {}),
          ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
        },
      ),
    enabled: status === "authenticated" && Boolean(token) && Boolean(activeOrgId),
    staleTime: 30_000,
  });
}
