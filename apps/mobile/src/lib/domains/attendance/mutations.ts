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
import type { ReceptionQueueRecord } from "@/lib/domains/shared/types";

export function useApproveAttendance(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useMutation({
    mutationFn: (input: string | { recordId: string; reason?: string }) => {
      const ctx = getMutationContext(token, resolvedOrgId);
      const recordId = typeof input === "string" ? input : input.recordId;
      const reason = typeof input === "string" ? undefined : input.reason;
      return mobileApiFetch<{ record: ReceptionQueueRecord }>(
        `/orgs/${ctx.orgId}/attendance/${recordId}/approve`,
        {
          method: "POST",
          token: ctx.token,
          orgId: ctx.orgId,
          ...(reason ? { body: { reason } } : {}),
        },
      );
    },
    onSuccess: async () => {
      await Promise.all([
        invalidations.attendance.all(queryClient, resolvedOrgId),
        invalidations.owner.dashboard(queryClient, resolvedOrgId),
      ]);
      notifyMutationSuccess("Attendance approved.");
    },
    onError: (error) => {
      notifyMutationError(error, "Attendance could not be approved.");
    },
  });
}

export function useRejectAttendance(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useMutation({
    mutationFn: ({ recordId, reason }: { recordId: string; reason: string }) => {
      const ctx = getMutationContext(token, resolvedOrgId);
      return mobileApiFetch<{ record: ReceptionQueueRecord }>(
        `/orgs/${ctx.orgId}/attendance/${recordId}/reject`,
        { method: "POST", token: ctx.token, orgId: ctx.orgId, body: { reason } },
      );
    },
    onSuccess: async () => {
      await Promise.all([
        invalidations.attendance.all(queryClient, resolvedOrgId),
        invalidations.owner.dashboard(queryClient, resolvedOrgId),
      ]);
      notifyMutationWarning("Attendance rejected.");
    },
    onError: (error) => {
      notifyMutationError(error, "Attendance could not be rejected.");
    },
  });
}

export function useManualAttendance(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useMutation({
    mutationFn: (body: {
      memberUserId: string;
      branchId?: string;
      reason: string;
      notes?: string;
    }) => {
      const ctx = getMutationContext(token, resolvedOrgId);
      return mobileApiFetch<{ record: ReceptionQueueRecord }>(
        `/orgs/${ctx.orgId}/attendance/manual`,
        { method: "POST", token: ctx.token, orgId: ctx.orgId, body },
      );
    },
    onSuccess: async () => {
      await Promise.all([
        invalidations.attendance.all(queryClient, resolvedOrgId),
        invalidations.owner.members(queryClient, resolvedOrgId),
        invalidations.owner.dashboard(queryClient, resolvedOrgId),
      ]);
      notifyMutationSuccess("Manual check-in recorded.");
    },
    onError: (error) => {
      notifyMutationError(error, "Manual check-in could not be recorded.");
    },
  });
}
