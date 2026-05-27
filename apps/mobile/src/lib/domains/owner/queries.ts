import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileApiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useBranchSelection } from "@/lib/branch-selection";
import { queryKeys } from "@/lib/domains/shared/keys";
import { queryString } from "@/lib/domains/shared/request";
import type {
  OrgJoinRequestRecord,
  OrgMemberRecord,
  OwnerBillingSubscriptionData,
  OwnerDashboardData,
} from "@/lib/domains/shared/types";

export function useOwnerDashboard(orgId?: string) {
  const { activeOrgId, status, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useQuery({
    queryKey: queryKeys.owner.dashboard(resolvedOrgId),
    queryFn: () =>
      mobileApiFetch<OwnerDashboardData>(`/orgs/${resolvedOrgId}/dashboard`, {
        token,
        orgId: resolvedOrgId,
      }),
    enabled: status === "authenticated" && Boolean(token) && Boolean(resolvedOrgId),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useOwnerBillingSubscription(orgId?: string) {
  const { activeOrgId, status, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useQuery({
    queryKey: queryKeys.owner.billing(resolvedOrgId),
    queryFn: () =>
      mobileApiFetch<OwnerBillingSubscriptionData>(
        `/orgs/${resolvedOrgId}/billing/subscription`,
        {
          token,
          orgId: resolvedOrgId,
        },
      ),
    enabled: status === "authenticated" && Boolean(token) && Boolean(resolvedOrgId),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useOrgJoinRequests(orgId?: string) {
  const { activeOrgId, status, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useQuery({
    queryKey: queryKeys.owner.approvals(resolvedOrgId),
    queryFn: () =>
      mobileApiFetch<{ joinRequests: OrgJoinRequestRecord[] }>(
        `/orgs/${resolvedOrgId}/join-requests`,
        {
          token,
          orgId: resolvedOrgId,
        },
      ),
    enabled: status === "authenticated" && Boolean(token) && Boolean(resolvedOrgId),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useOrgMembers(orgId?: string) {
  const { activeOrgId, status, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useQuery({
    queryKey: queryKeys.owner.members(resolvedOrgId),
    queryFn: () =>
      mobileApiFetch<{ members: OrgMemberRecord[] }>(`/orgs/${resolvedOrgId}/members`, {
        token,
        orgId: resolvedOrgId,
      }),
    enabled: status === "authenticated" && Boolean(token) && Boolean(resolvedOrgId),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function usePrefetchOwnerWorkspace(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, status, token } = useAuth();
  const { selectedBranchId } = useBranchSelection();
  const resolvedOrgId = orgId ?? activeOrgId;

  return () => {
    if (status !== "authenticated" || !token || !resolvedOrgId) return;
    const request = { token, orgId: resolvedOrgId, ...(selectedBranchId ? { branchId: selectedBranchId } : {}) };
    void queryClient.prefetchQuery({
      queryKey: queryKeys.owner.dashboard(resolvedOrgId),
      queryFn: () => mobileApiFetch<OwnerDashboardData>(`/orgs/${resolvedOrgId}/dashboard`, request),
      staleTime: 60_000,
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.owner.billing(resolvedOrgId),
      queryFn: () =>
        mobileApiFetch<OwnerBillingSubscriptionData>(
          `/orgs/${resolvedOrgId}/billing/subscription`,
          request,
        ),
      staleTime: 60_000,
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.owner.members(resolvedOrgId),
      queryFn: () => mobileApiFetch<{ members: OrgMemberRecord[] }>(`/orgs/${resolvedOrgId}/members`, request),
      staleTime: 60_000,
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.owner.approvals(resolvedOrgId),
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
