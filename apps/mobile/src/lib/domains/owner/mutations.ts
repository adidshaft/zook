import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mobileApiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { invalidations } from "@/lib/domains/shared/invalidate";
import {
  getMutationContext,
  notifyMutationError,
  notifyMutationSuccess,
  notifyMutationWarning,
} from "@/lib/domains/shared/request";
import type { OrgJoinRequestRecord } from "@/lib/domains/shared/types";

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
