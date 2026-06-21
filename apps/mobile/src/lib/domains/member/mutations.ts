import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mobileApiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useBranchSelection } from "@/lib/branch-selection";
import { queryKeys } from "@/lib/domains/shared/keys";
import {
  notifyMutationError,
  notifyMutationSuccess,
  notifyMutationWarning,
} from "@/lib/domains/shared/request";

export function useEnrollInClass() {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const { selectedBranchId } = useBranchSelection();
  return useMutation({
    mutationFn: async ({ classId }: { classId: string }) => {
      if (!activeOrgId || !token) {
        throw new Error("Sign in again to book a class.");
      }
      return mobileApiFetch<{
        enrollment: { id: string; status: string };
        remainingCapacity: number;
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
      notifyMutationSuccess(
        payload.enrollment.status === "waitlisted" ? "Added to waitlist." : "Class booked.",
      );
    },
    onError: (error) => {
      notifyMutationError(error, "Class booking could not be completed.");
    },
  });
}

export function useCancelEnrollment() {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const { selectedBranchId } = useBranchSelection();
  return useMutation({
    mutationFn: async ({ classId }: { classId: string }) => {
      if (!activeOrgId || !token) {
        throw new Error("Sign in again to manage your booking.");
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
      notifyMutationWarning("Booking cancelled.");
    },
    onError: (error) => {
      notifyMutationError(error, "Could not cancel your booking.");
    },
  });
}
