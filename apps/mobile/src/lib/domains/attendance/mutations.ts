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
    onMutate: async (input) => {
      const recordId = typeof input === "string" ? input : input.recordId;
      const queryKeyPending = queryKeys.attendance.pending(resolvedOrgId);
      const queryKeyToday = queryKeys.attendance.today(resolvedOrgId);

      await queryClient.cancelQueries({ queryKey: queryKeyPending });
      await queryClient.cancelQueries({ queryKey: queryKeyToday });

      const previousPending = queryClient.getQueryData<{ records: ReceptionQueueRecord[] }>(queryKeyPending);
      const previousToday = queryClient.getQueryData<{ records: ReceptionQueueRecord[] }>(queryKeyToday);

      if (previousPending) {
        const approvedRecord = previousPending.records.find((r) => r.id === recordId);
        queryClient.setQueryData(queryKeyPending, {
          records: previousPending.records.filter((r) => r.id !== recordId),
        });

        if (previousToday && approvedRecord) {
          const updatedRecord = { ...approvedRecord, status: "APPROVED" };
          const exists = previousToday.records.some((r) => r.id === recordId);
          queryClient.setQueryData(queryKeyToday, {
            records: exists
              ? previousToday.records.map((r) => (r.id === recordId ? updatedRecord : r))
              : [updatedRecord, ...previousToday.records],
          });
        }
      }

      return { previousPending, previousToday };
    },
    onSuccess: async () => {
      await Promise.all([
        invalidations.attendance.all(queryClient, resolvedOrgId),
        invalidations.owner.dashboard(queryClient, resolvedOrgId),
      ]);
      notifyMutationSuccess("Attendance approved.");
    },
    onError: (error, _variables, context) => {
      if (context) {
        const queryKeyPending = queryKeys.attendance.pending(resolvedOrgId);
        const queryKeyToday = queryKeys.attendance.today(resolvedOrgId);
        if (context.previousPending) queryClient.setQueryData(queryKeyPending, context.previousPending);
        if (context.previousToday) queryClient.setQueryData(queryKeyToday, context.previousToday);
      }
      notifyMutationError(error, "Attendance could not be approved.");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.attendance.pending(resolvedOrgId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.attendance.today(resolvedOrgId) });
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
    onMutate: async ({ recordId }) => {
      const queryKeyPending = queryKeys.attendance.pending(resolvedOrgId);
      const queryKeyToday = queryKeys.attendance.today(resolvedOrgId);

      await queryClient.cancelQueries({ queryKey: queryKeyPending });
      await queryClient.cancelQueries({ queryKey: queryKeyToday });

      const previousPending = queryClient.getQueryData<{ records: ReceptionQueueRecord[] }>(queryKeyPending);
      const previousToday = queryClient.getQueryData<{ records: ReceptionQueueRecord[] }>(queryKeyToday);

      if (previousPending) {
        const rejectedRecord = previousPending.records.find((r) => r.id === recordId);
        queryClient.setQueryData(queryKeyPending, {
          records: previousPending.records.filter((r) => r.id !== recordId),
        });

        if (previousToday && rejectedRecord) {
          const updatedRecord = { ...rejectedRecord, status: "REJECTED" };
          const exists = previousToday.records.some((r) => r.id === recordId);
          queryClient.setQueryData(queryKeyToday, {
            records: exists
              ? previousToday.records.map((r) => (r.id === recordId ? updatedRecord : r))
              : [updatedRecord, ...previousToday.records],
          });
        }
      }

      return { previousPending, previousToday };
    },
    onSuccess: async () => {
      await Promise.all([
        invalidations.attendance.all(queryClient, resolvedOrgId),
        invalidations.owner.dashboard(queryClient, resolvedOrgId),
      ]);
      notifyMutationWarning("Attendance rejected.");
    },
    onError: (error, _variables, context) => {
      if (context) {
        const queryKeyPending = queryKeys.attendance.pending(resolvedOrgId);
        const queryKeyToday = queryKeys.attendance.today(resolvedOrgId);
        if (context.previousPending) queryClient.setQueryData(queryKeyPending, context.previousPending);
        if (context.previousToday) queryClient.setQueryData(queryKeyToday, context.previousToday);
      }
      notifyMutationError(error, "Attendance could not be rejected.");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.attendance.pending(resolvedOrgId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.attendance.today(resolvedOrgId) });
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
