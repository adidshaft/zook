import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { mobileApiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useBranchSelection } from "@/lib/branch-selection";
import { queryKeys } from "@/lib/domains/shared/keys";
import { queryString } from "@/lib/domains/shared/request";
import { getStoredValue, setStoredValue } from "@/lib/storage";
import type {
  ActiveMembershipRecord,
  MemberClassRecord,
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

function memberQueryCacheKey(scope: "home", orgId?: string | null) {
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

export type MemberCoachingData = {
  subscription: {
    id: string;
    status: string;
    planName: string | null;
    totalSessions: number | null;
    remainingSessions: number | null;
    amountPaise: number;
    startsAt: string | null;
    endsAt: string | null;
  } | null;
  trainer: { id: string; name: string } | null;
  plan: { id: string; name: string; description: string | null; sessionCount: number | null } | null;
  sessions: Array<{ id: string; sessionAt: string; notes: string | null }>;
};

export function useMyCoaching() {
  const { activeOrgId, status, token } = useAuth();
  return useQuery({
    queryKey: ["me", "coaching", activeOrgId] as const,
    queryFn: () =>
      mobileApiFetch<MemberCoachingData>(
        `/me/coaching${queryString({ orgId: activeOrgId ?? undefined })}`,
        { token, ...(activeOrgId ? { orgId: activeOrgId } : {}) },
      ),
    enabled: status === "authenticated" && Boolean(token),
    staleTime: 30_000,
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
