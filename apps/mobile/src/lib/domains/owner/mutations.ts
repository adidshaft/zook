import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mobileApiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { invalidations } from "@/lib/domains/shared/invalidate";
import { queryKeys } from "@/lib/domains/shared/keys";
import {
  getMutationContext,
  notifyMutationError,
  notifyMutationSuccess,
  notifyMutationWarning,
} from "@/lib/domains/shared/request";
import type { OrgJoinRequestRecord, OwnerBillingSubscriptionData } from "@/lib/domains/shared/types";

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
        invalidations.owner.approvals(queryClient, resolvedOrgId),
        invalidations.owner.dashboard(queryClient, resolvedOrgId),
        invalidations.owner.members(queryClient, resolvedOrgId),
      ]);
      notifyMutationSuccess("Join request approved.");
    },
    onError: (error) => {
      notifyMutationError(error, "Join request could not be approved.");
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
        invalidations.owner.approvals(queryClient, resolvedOrgId),
        invalidations.owner.dashboard(queryClient, resolvedOrgId),
      ]);
      notifyMutationWarning("Join request rejected.");
    },
    onError: (error) => {
      notifyMutationError(error, "Join request could not be rejected.");
    },
  });
}

export function useCreateSaasBillingMandate(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useMutation({
    mutationFn: () => {
      const ctx = getMutationContext(token, resolvedOrgId);
      return mobileApiFetch<{
        mandate: NonNullable<OwnerBillingSubscriptionData["mandate"]>;
        checkoutUrl?: string | null;
        checkoutData?: Record<string, unknown> | null;
        session?: { id: string; status: string } | null;
      }>(`/orgs/${ctx.orgId}/billing/mandate`, {
        method: "POST",
        token: ctx.token,
        orgId: ctx.orgId,
        body: {},
      });
    },
    onSuccess: async () => {
      await invalidations.owner.billing(queryClient, resolvedOrgId);
      notifyMutationSuccess("Billing mandate created.");
    },
    onError: (error) => {
      notifyMutationError(error, "Billing mandate could not be created.");
    },
  });
}

export function useUpgradeSaasSubscription(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useMutation({
    mutationFn: (input: {
      tier: "STARTER" | "GROWTH" | "PRO";
      billingCycle: "MONTHLY" | "YEARLY";
    }) => {
      const ctx = getMutationContext(token, resolvedOrgId);
      return mobileApiFetch<{
        subscription: OwnerBillingSubscriptionData["subscription"];
        mandate: OwnerBillingSubscriptionData["mandate"];
        checkoutUrl?: string | null;
        checkoutData?: Record<string, unknown> | null;
        session?: { id: string; status: string } | null;
      }>(`/orgs/${ctx.orgId}/saas-subscription/upgrade`, {
        method: "POST",
        token: ctx.token,
        orgId: ctx.orgId,
        body: input,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        invalidations.owner.billing(queryClient, resolvedOrgId),
        invalidations.owner.dashboard(queryClient, resolvedOrgId),
      ]);
      notifyMutationSuccess("Subscription checkout started.");
    },
    onError: (error) => {
      notifyMutationError(error, "Subscription checkout could not be started.");
    },
  });
}

export function useCancelSaasSubscription(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useMutation({
    mutationFn: () => {
      const ctx = getMutationContext(token, resolvedOrgId);
      return mobileApiFetch<{
        subscription: OwnerBillingSubscriptionData["subscription"];
        mandate: OwnerBillingSubscriptionData["mandate"];
      }>(`/orgs/${ctx.orgId}/saas-subscription/cancel`, {
        method: "POST",
        token: ctx.token,
        orgId: ctx.orgId,
        body: {},
      });
    },
    onSuccess: async () => {
      await Promise.all([
        invalidations.owner.billing(queryClient, resolvedOrgId),
        invalidations.owner.dashboard(queryClient, resolvedOrgId),
      ]);
      notifyMutationWarning("Subscription cancellation scheduled.");
    },
    onError: (error) => {
      notifyMutationError(error, "Subscription could not be cancelled.");
    },
  });
}

export function useMarkPayoutPaid(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useMutation({
    mutationFn: ({ payoutId, method, note }: { payoutId: string; method: string; note?: string }) => {
      const ctx = getMutationContext(token, resolvedOrgId);
      return mobileApiFetch<{ payout: { id: string; status: string } }>(
        `/orgs/${ctx.orgId}/payouts/${payoutId}/mark-paid`,
        {
          method: "POST",
          token: ctx.token,
          orgId: ctx.orgId,
          body: { method, ...(note ? { note } : {}) },
        },
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.owner.payouts(resolvedOrgId) });
      notifyMutationSuccess("Payout marked paid.");
    },
    onError: (error) => {
      notifyMutationError(error, "Could not mark payout paid.");
    },
  });
}
