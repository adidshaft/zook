import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mobileApiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { invalidations } from "@/lib/domains/shared/invalidate";
import { queryKeys } from "@/lib/domains/shared/keys";
import { notifyMutationError, notifyMutationSuccess } from "@/lib/domains/shared/request";
import type { MemberHomeData, PlanProgressRecord } from "@/lib/domains/shared/types";

export function useCompletePlanAssignment() {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  return useMutation({
    mutationFn: (input: {
      assignmentId: string;
      exercises?: Array<{
        id?: string;
        name: string;
        completed?: boolean;
        setsCompleted?: number;
        reps?: number;
        weightKg?: number;
        notes?: string;
      }>;
      feedback?: string;
      progressJson?: Record<string, unknown>;
    }) => {
      if (!token) {
        throw new Error("Authentication is required.");
      }
      return mobileApiFetch<{ progress: PlanProgressRecord; completedExercises: string[] }>(
        `/me/plans/${input.assignmentId}/complete`,
        {
          method: "POST",
          token,
          ...(activeOrgId ? { orgId: activeOrgId } : {}),
          body: {
            orgId: activeOrgId,
            exercises: input.exercises ?? [],
            feedback: input.feedback,
            progressJson: input.progressJson ?? {},
          },
        },
      );
    },
    onMutate: async () => {
      const queryKeyHome = queryKeys.member.home(activeOrgId ?? null);
      await queryClient.cancelQueries({ queryKey: queryKeyHome });

      const previousHome = queryClient.getQueryData<MemberHomeData>(queryKeyHome);

      if (previousHome) {
        queryClient.setQueryData<MemberHomeData>(queryKeyHome, {
          ...previousHome,
          todayWorkoutLoggedAt: new Date().toISOString(),
        });
      }

      return { previousHome };
    },
    onSuccess: (_, input) => {
      void Promise.all([
        invalidations.plans.all(queryClient),
        invalidations.plans.detail(queryClient, input.assignmentId),
        invalidations.plans.exercises(queryClient, input.assignmentId),
        invalidations.member.home(queryClient),
      ]);
      notifyMutationSuccess("Plan progress saved.");
    },
    onError: (error, _variables, context) => {
      if (context?.previousHome) {
        queryClient.setQueryData(queryKeys.member.home(activeOrgId ?? null), context.previousHome);
      }
      notifyMutationError(error, "Plan progress could not be saved.");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.member.home(activeOrgId ?? null) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.plans.list() });
    },
  });
}
