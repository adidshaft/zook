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
import { useT } from "@/lib/i18n";

export function useApproveJoinRequest(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  const t = useT();
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
      notifyMutationSuccess(t("owner.mutation.joinApproved"));
    },
    onError: (error) => {
      notifyMutationError(error, t("owner.mutation.joinApproveFailed"));
    },
  });
}

export function useRejectJoinRequest(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  const t = useT();
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
      notifyMutationWarning(t("owner.mutation.joinRejected"));
    },
    onError: (error) => {
      notifyMutationError(error, t("owner.mutation.joinRejectFailed"));
    },
  });
}

export function useCreateSaasBillingMandate(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  const t = useT();
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
      notifyMutationSuccess(t("owner.mutation.billingMandateCreated"));
    },
    onError: (error) => {
      notifyMutationError(error, t("owner.mutation.billingMandateFailed"));
    },
  });
}

export function useUpgradeSaasSubscription(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  const t = useT();
  return useMutation({
    mutationFn: (input: {
      tier: "STARTER" | "GROWTH" | "PRO";
      billingCycle: "MONTHLY" | "SEMIANNUAL" | "YEARLY";
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
      notifyMutationSuccess(t("owner.mutation.checkoutStarted"));
    },
    onError: (error) => {
      notifyMutationError(error, t("owner.mutation.checkoutFailed"));
    },
  });
}

export function useCancelSaasSubscription(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  const t = useT();
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
      notifyMutationWarning(t("owner.mutation.subscriptionCancellationScheduled"));
    },
    onError: (error) => {
      notifyMutationError(error, t("owner.mutation.subscriptionCancelFailed"));
    },
  });
}

export function useMarkPayoutPaid(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  const t = useT();
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
      notifyMutationSuccess(t("owner.mutation.payoutMarkedPaid"));
    },
    onError: (error) => {
      notifyMutationError(error, t("owner.mutation.payoutMarkFailed"));
    },
  });
}

export function useUpdatePayoutConfig(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  const t = useT();
  return useMutation({
    mutationFn: ({
      trainerUserId,
      config,
    }: {
      trainerUserId: string;
      config: {
        baseMonthlyPaise: number;
        ptCommissionPercent: number;
        perSessionFeePaise: number;
        payDay: number;
      };
    }) => {
      const ctx = getMutationContext(token, resolvedOrgId);
      return mobileApiFetch<{ config: unknown }>(
        `/orgs/${ctx.orgId}/trainers/${trainerUserId}/payout-config`,
        { method: "PUT", token: ctx.token, orgId: ctx.orgId, body: config },
      );
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["org", resolvedOrgId, "trainer", variables.trainerUserId, "payout-config"],
      });
      notifyMutationSuccess(t("owner.mutation.payoutSettingsSaved"));
    },
    onError: (error) => notifyMutationError(error, t("owner.mutation.payoutSettingsFailed")),
  });
}

export function useUpdateReferralPolicy(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  const t = useT();
  return useMutation({
    mutationFn: (patch: Record<string, unknown>) => {
      const ctx = getMutationContext(token, resolvedOrgId);
      return mobileApiFetch<{ policy: unknown }>(`/orgs/${ctx.orgId}/referral-policy`, {
        method: "PATCH",
        token: ctx.token,
        orgId: ctx.orgId,
        body: patch,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["org", resolvedOrgId, "referral-policy"] });
      notifyMutationSuccess(t("owner.mutation.referralSaved"));
    },
    onError: (error) => notifyMutationError(error, t("owner.mutation.referralFailed")),
  });
}

export type MembershipPlanInput = {
  name: string;
  description?: string;
  type: "DURATION" | "VISIT_PACK" | "DATE_RANGE" | "HYBRID" | "TRIAL";
  pricePaise: number;
  durationDays?: number;
  visitLimit?: number;
  publicVisible?: boolean;
};

export function useSaveMembershipPlan(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  const t = useT();
  return useMutation({
    mutationFn: ({ planId, body }: { planId?: string; body: MembershipPlanInput }) => {
      const ctx = getMutationContext(token, resolvedOrgId);
      const path = planId
        ? `/orgs/${ctx.orgId}/membership-plans/${planId}`
        : `/orgs/${ctx.orgId}/membership-plans`;
      return mobileApiFetch<{ plan: { id: string } }>(path, {
        method: planId ? "PATCH" : "POST",
        token: ctx.token,
        orgId: ctx.orgId,
        body,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["org", resolvedOrgId, "membership-plans"] });
      notifyMutationSuccess(t("owner.mutation.planSaved"));
    },
    onError: (error) => notifyMutationError(error, t("owner.mutation.planSaveFailed")),
  });
}

export function useDeleteMembershipPlan(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  const t = useT();
  return useMutation({
    mutationFn: (planId: string) => {
      const ctx = getMutationContext(token, resolvedOrgId);
      return mobileApiFetch<{ ok: boolean }>(`/orgs/${ctx.orgId}/membership-plans/${planId}`, {
        method: "DELETE",
        token: ctx.token,
        orgId: ctx.orgId,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["org", resolvedOrgId, "membership-plans"] });
      notifyMutationWarning(t("owner.mutation.planRemoved"));
    },
    onError: (error) => notifyMutationError(error, t("owner.mutation.planRemoveFailed")),
  });
}

export type CouponInput = {
  code: string;
  type: "FIXED_AMOUNT" | "PERCENTAGE";
  valuePaise?: number;
  valuePercentBps?: number;
  maxRedemptions?: number;
  perUserLimit?: number;
  active?: boolean;
};

export function useSaveCoupon(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  const t = useT();
  return useMutation({
    mutationFn: ({ couponId, body }: { couponId?: string; body: CouponInput }) => {
      const ctx = getMutationContext(token, resolvedOrgId);
      const path = couponId
        ? `/orgs/${ctx.orgId}/coupons/${couponId}`
        : `/orgs/${ctx.orgId}/coupons`;
      return mobileApiFetch<{ coupon: { id: string } }>(path, {
        method: couponId ? "PATCH" : "POST",
        token: ctx.token,
        orgId: ctx.orgId,
        body,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["org", resolvedOrgId, "coupons"] });
      notifyMutationSuccess(t("owner.mutation.couponSaved"));
    },
    onError: (error) => notifyMutationError(error, t("owner.mutation.couponSaveFailed")),
  });
}

export function useDeleteCoupon(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  const t = useT();
  return useMutation({
    mutationFn: (couponId: string) => {
      const ctx = getMutationContext(token, resolvedOrgId);
      return mobileApiFetch<{ ok: boolean }>(`/orgs/${ctx.orgId}/coupons/${couponId}`, {
        method: "DELETE",
        token: ctx.token,
        orgId: ctx.orgId,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["org", resolvedOrgId, "coupons"] });
      notifyMutationWarning(t("owner.mutation.couponRemoved"));
    },
    onError: (error) => notifyMutationError(error, t("owner.mutation.couponRemoveFailed")),
  });
}

export type StaffRole = "ADMIN" | "RECEPTIONIST" | "TRAINER";

export function useInviteStaff(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  const t = useT();
  return useMutation({
    mutationFn: (body: { email: string; role: StaffRole; branchId?: string }) => {
      const ctx = getMutationContext(token, resolvedOrgId);
      return mobileApiFetch<{ invite: { id: string } }>(`/orgs/${ctx.orgId}/staff/invite`, {
        method: "POST",
        token: ctx.token,
        orgId: ctx.orgId,
        body,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["org", resolvedOrgId, "staff"] });
      notifyMutationSuccess(t("owner.mutation.inviteSent"));
    },
    onError: (error) => notifyMutationError(error, t("owner.mutation.inviteFailed")),
  });
}

export function useUpdateStaffRole(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  const t = useT();
  return useMutation({
    mutationFn: ({ assignmentId, role, branchId }: { assignmentId: string; role: StaffRole; branchId?: string }) => {
      const ctx = getMutationContext(token, resolvedOrgId);
      return mobileApiFetch<{ assignment: { id: string } }>(`/orgs/${ctx.orgId}/staff/${assignmentId}`, {
        method: "PATCH",
        token: ctx.token,
        orgId: ctx.orgId,
        body: { role, ...(branchId ? { branchId } : {}) },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["org", resolvedOrgId, "staff"] });
      notifyMutationSuccess(t("owner.mutation.roleUpdated"));
    },
    onError: (error) => notifyMutationError(error, t("owner.mutation.roleUpdateFailed")),
  });
}

export function useRemoveStaff(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  const t = useT();
  return useMutation({
    mutationFn: (assignmentId: string) => {
      const ctx = getMutationContext(token, resolvedOrgId);
      return mobileApiFetch<{ ok: boolean }>(`/orgs/${ctx.orgId}/staff/${assignmentId}`, {
        method: "DELETE",
        token: ctx.token,
        orgId: ctx.orgId,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["org", resolvedOrgId, "staff"] });
      notifyMutationWarning(t("owner.mutation.staffRemoved"));
    },
    onError: (error) => notifyMutationError(error, t("owner.mutation.staffRemoveFailed")),
  });
}
