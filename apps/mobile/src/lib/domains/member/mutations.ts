import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Linking } from "react-native";
import { mobileApiFetch, toWebUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useBranchSelection } from "@/lib/branch-selection";
import { queryKeys } from "@/lib/domains/shared/keys";
import {
  notifyMutationError,
  notifyMutationSuccess,
  notifyMutationWarning,
} from "@/lib/domains/shared/request";
import type { PtSubscriptionRecord } from "@/lib/domains/shared/types";
import { useT } from "@/lib/i18n";

export function useEnrollInClass() {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const { selectedBranchId } = useBranchSelection();
  const t = useT();
  return useMutation({
    mutationFn: async ({ classId }: { classId: string }) => {
      if (!activeOrgId || !token) {
        throw new Error(t("member.mutation.signInBookClass"));
      }
      return mobileApiFetch<{
        enrollment: { id: string; status: string };
        remainingCapacity: number;
        paymentRequired?: boolean;
        checkoutUrl?: string | null;
        session?: { id?: string | null } | null;
      }>(`/orgs/${activeOrgId}/classes/${classId}/enroll`, {
        method: "POST",
        token,
        orgId: activeOrgId,
        ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
      });
    },
    onSuccess: async (payload) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.member.classes(activeOrgId, selectedBranchId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.member.home(activeOrgId) }),
      ]);
      if (payload.paymentRequired && payload.checkoutUrl) {
        const checkoutUrl = /^https?:\/\//i.test(payload.checkoutUrl)
          ? payload.checkoutUrl
          : toWebUrl(payload.checkoutUrl);
        const returnUrl = `zook://payments/return?target=classes${payload.session?.id ? `&session=${encodeURIComponent(payload.session.id)}` : ""}`;
        try {
          const parsed = new URL(checkoutUrl);
          parsed.searchParams.set("return_url", returnUrl);
          await Linking.openURL(parsed.toString());
        } catch {
          const separator = checkoutUrl.includes("?") ? "&" : "?";
          await Linking.openURL(`${checkoutUrl}${separator}return_url=${encodeURIComponent(returnUrl)}`);
        }
        notifyMutationSuccess(t("member.mutation.classCheckoutStarted"));
        return;
      }
      notifyMutationSuccess(
        payload.enrollment.status === "waitlisted"
          ? t("member.mutation.waitlistAdded")
          : t("member.mutation.classBooked"),
      );
    },
    onError: (error) => {
      notifyMutationError(error, t("member.mutation.classBookingFailed"));
    },
  });
}

export function useCancelEnrollment() {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const { selectedBranchId } = useBranchSelection();
  const t = useT();
  return useMutation({
    mutationFn: async ({ classId }: { classId: string }) => {
      if (!activeOrgId || !token) {
        throw new Error(t("member.mutation.signInManageBooking"));
      }
      return mobileApiFetch<{ ok: boolean }>(`/orgs/${activeOrgId}/classes/${classId}/enroll`, {
        method: "DELETE",
        token,
        orgId: activeOrgId,
        ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.member.classes(activeOrgId, selectedBranchId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.member.home(activeOrgId) }),
      ]);
      notifyMutationWarning(t("member.mutation.bookingCancelled"));
    },
    onError: (error) => {
      notifyMutationError(error, t("member.mutation.bookingCancelFailed"));
    },
  });
}

export type RequestPtSubscriptionInput = {
  ptPlanId: string;
  trainerUserId?: string;
  amountPaise?: number;
  totalSessions?: number;
};

export function useRequestPtSubscription() {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const t = useT();
  return useMutation({
    mutationFn: async (input: RequestPtSubscriptionInput) => {
      if (!activeOrgId || !token) {
        throw new Error(t("member.mutation.signInRequestPt"));
      }
      return mobileApiFetch<{ subscription: PtSubscriptionRecord }>(
        "/me/pt-subscriptions/request",
        {
          method: "POST",
          token,
          orgId: activeOrgId,
          body: input,
        },
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.member.coaching(activeOrgId),
      });
      notifyMutationSuccess(t("member.coaching.requestSent"));
    },
    onError: (error) => {
      notifyMutationError(error, t("member.mutation.ptRequestFailed"));
    },
  });
}

export function useCancelMembership() {
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const t = useT();
  return useMutation({
    mutationFn: ({ subscriptionId }: { subscriptionId: string }) =>
      mobileApiFetch<{ subscription: Record<string, unknown> }>(
        `/me/memberships/${subscriptionId}/cancel`,
        { method: "POST", token },
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.member.membership() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.member.activeMembership() }),
      ]);
      notifyMutationWarning(t("member.membership.cancelled"));
    },
    onError: (error) => {
      notifyMutationError(error, t("member.mutation.membershipCancelFailed"));
    },
  });
}
