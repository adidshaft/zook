import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileApiFetch } from "@/lib/api";
import { useActivePermissions, useAuth } from "@/lib/auth";
import { useBranchSelection } from "@/lib/branch-selection";
import { queryKeys } from "@/lib/domains/shared/keys";
import { queryString } from "@/lib/domains/shared/request";
import type {
  OrgJoinRequestRecord,
  OrgMemberRecord,
  OwnerBillingSubscriptionData,
  OwnerDashboardData,
  TrainerPayoutRecord,
} from "@/lib/domains/shared/types";

type OwnerSetupStatusData = {
  hasMembershipPlans: boolean;
  hasQrDisplayed: boolean;
  staffCount: number;
  memberCount: number;
  hasShopProducts: boolean;
};

export function useOwnerDashboard(orgId?: string) {
  const { activeOrgId, status, token } = useAuth();
  const { selectedBranchId } = useBranchSelection();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useQuery({
    queryKey: queryKeys.owner.dashboard(resolvedOrgId, selectedBranchId),
    queryFn: () =>
      mobileApiFetch<OwnerDashboardData>(`/orgs/${resolvedOrgId}/dashboard`, {
        token,
        orgId: resolvedOrgId,
        ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
      }),
    enabled: status === "authenticated" && Boolean(token) && Boolean(resolvedOrgId),
    placeholderData: keepPreviousData,
    staleTime: 8_000,
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
  });
}

export function useOwnerBillingSubscription(orgId?: string) {
  const { activeOrgId, status, token } = useAuth();
  const permissions = useActivePermissions();
  const { selectedBranchId } = useBranchSelection();
  const resolvedOrgId = orgId ?? activeOrgId;
  const canManageBilling = permissions.has("ORG_MANAGE_BILLING");
  return useQuery({
    queryKey: queryKeys.owner.billing(resolvedOrgId, selectedBranchId),
    queryFn: () =>
      mobileApiFetch<OwnerBillingSubscriptionData>(
        `/orgs/${resolvedOrgId}/billing/subscription`,
        {
          token,
          orgId: resolvedOrgId,
          ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
        },
      ),
    enabled:
      status === "authenticated" &&
      Boolean(token) &&
      Boolean(resolvedOrgId) &&
      canManageBilling,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useOwnerSetupStatus(orgId?: string) {
  const { activeOrgId, status, token } = useAuth();
  const permissions = useActivePermissions();
  const { selectedBranchId } = useBranchSelection();
  const resolvedOrgId = orgId ?? activeOrgId;
  const canManageBilling = permissions.has("ORG_MANAGE_BILLING");
  return useQuery({
    queryKey: queryKeys.owner.setupStatus(resolvedOrgId, selectedBranchId),
    queryFn: () =>
      mobileApiFetch<OwnerSetupStatusData>(`/orgs/${resolvedOrgId}/setup-status`, {
        token,
        orgId: resolvedOrgId,
        ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
      }),
    enabled:
      status === "authenticated" &&
      Boolean(token) &&
      Boolean(resolvedOrgId) &&
      canManageBilling,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

type OrgJoinRequestsData = { joinRequests: OrgJoinRequestRecord[] };

export function useOrgJoinRequests<TData = OrgJoinRequestsData>(
  orgId?: string,
  options?: { select?: (data: OrgJoinRequestsData) => TData },
) {
  const { activeOrgId, status, token } = useAuth();
  const { selectedBranchId } = useBranchSelection();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useQuery({
    queryKey: queryKeys.owner.approvals(resolvedOrgId, selectedBranchId),
    queryFn: () =>
      mobileApiFetch<OrgJoinRequestsData>(
        `/orgs/${resolvedOrgId}/join-requests`,
        {
          token,
          orgId: resolvedOrgId,
          ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
        },
      ),
    enabled: status === "authenticated" && Boolean(token) && Boolean(resolvedOrgId),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    select: options?.select,
  });
}

export function useOrgMembers(orgId?: string) {
  const { activeOrgId, status, token } = useAuth();
  const { selectedBranchId } = useBranchSelection();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useQuery({
    queryKey: queryKeys.owner.members(resolvedOrgId, null, selectedBranchId),
    queryFn: () =>
      mobileApiFetch<{ members: OrgMemberRecord[] }>(`/orgs/${resolvedOrgId}/members`, {
        token,
        orgId: resolvedOrgId,
        ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
      }),
    enabled: status === "authenticated" && Boolean(token) && Boolean(resolvedOrgId),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function usePrefetchOwnerWorkspace(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, status, token } = useAuth();
  const permissions = useActivePermissions();
  const { selectedBranchId } = useBranchSelection();
  const resolvedOrgId = orgId ?? activeOrgId;
  const canManageBilling = permissions.has("ORG_MANAGE_BILLING");

  return () => {
    if (status !== "authenticated" || !token || !resolvedOrgId) return;
    const request = { token, orgId: resolvedOrgId, ...(selectedBranchId ? { branchId: selectedBranchId } : {}) };
    void queryClient.prefetchQuery({
      queryKey: queryKeys.owner.dashboard(resolvedOrgId, selectedBranchId),
      queryFn: () => mobileApiFetch<OwnerDashboardData>(`/orgs/${resolvedOrgId}/dashboard`, request),
      staleTime: 60_000,
    });
    if (canManageBilling) {
      void queryClient.prefetchQuery({
        queryKey: queryKeys.owner.billing(resolvedOrgId, selectedBranchId),
        queryFn: () =>
          mobileApiFetch<OwnerBillingSubscriptionData>(
            `/orgs/${resolvedOrgId}/billing/subscription`,
            request,
          ),
        staleTime: 60_000,
      });
    }
    void queryClient.prefetchQuery({
      queryKey: queryKeys.owner.members(resolvedOrgId, null, selectedBranchId),
      queryFn: () => mobileApiFetch<{ members: OrgMemberRecord[] }>(`/orgs/${resolvedOrgId}/members`, request),
      staleTime: 60_000,
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.owner.approvals(resolvedOrgId, selectedBranchId),
      queryFn: () =>
        mobileApiFetch<{ joinRequests: OrgJoinRequestRecord[] }>(
          `/orgs/${resolvedOrgId}/join-requests`,
          request,
        ),
      staleTime: 60_000,
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.payments.list(resolvedOrgId, selectedBranchId),
      queryFn: () =>
        mobileApiFetch(
          `/orgs/${resolvedOrgId}/payments/recent${queryString({ branchId: selectedBranchId ?? undefined })}`,
          request,
        ),
      staleTime: 60_000,
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.shop.catalog(resolvedOrgId, selectedBranchId),
      queryFn: () =>
        mobileApiFetch(
          `/orgs/${resolvedOrgId}/products${queryString({ branchId: selectedBranchId ?? undefined })}`,
          request,
        ),
      staleTime: 60_000,
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.shop.activeOrders(resolvedOrgId, selectedBranchId),
      queryFn: () =>
        mobileApiFetch(
          `/orgs/${resolvedOrgId}/shop/orders/active${queryString({ branchId: selectedBranchId ?? undefined })}`,
          request,
        ),
      staleTime: 60_000,
    });
  };
}

export function useOrgPayouts(month?: string) {
  const { activeOrgId, status, token } = useAuth();
  return useQuery({
    queryKey: queryKeys.owner.payouts(activeOrgId, month),
    queryFn: () =>
      mobileApiFetch<{ payouts: TrainerPayoutRecord[] }>(
        `/orgs/${activeOrgId}/payouts${queryString({ month: month ?? undefined })}`,
        { token, orgId: activeOrgId ?? undefined },
      ),
    enabled: status === "authenticated" && Boolean(token) && Boolean(activeOrgId),
    staleTime: 60_000,
  });
}

export type PayoutConfig = {
  baseMonthlyPaise: number;
  ptCommissionPercent: number;
  perSessionFeePaise: number;
  payDay: number;
};

export function useTrainerPayoutConfig(trainerUserId?: string | null) {
  const { activeOrgId, status, token } = useAuth();
  return useQuery({
    queryKey: ["org", activeOrgId, "trainer", trainerUserId, "payout-config"] as const,
    queryFn: () =>
      mobileApiFetch<{ config: PayoutConfig | null }>(
        `/orgs/${activeOrgId}/trainers/${trainerUserId}/payout-config`,
        { token, orgId: activeOrgId ?? undefined },
      ),
    enabled:
      status === "authenticated" && Boolean(token) && Boolean(activeOrgId) && Boolean(trainerUserId),
  });
}
