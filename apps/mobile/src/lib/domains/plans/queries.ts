import { useQuery } from "@tanstack/react-query";
import { mobileApiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { queryKeys } from "@/lib/domains/shared/keys";
import type {
  MyPlanRecord,
  PlanContentRecord,
  PlanExerciseRecord,
  PlanProgressRecord,
} from "@/lib/domains/shared/types";

export function useMyPlans() {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: queryKeys.plans.list(),
    queryFn: () => mobileApiFetch<{ plans: MyPlanRecord[] }>("/me/plans", { token }),
    enabled: status === "authenticated" && Boolean(token),
  });
}

export function usePlanDetail(assignmentId?: string) {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: queryKeys.plans.detail(assignmentId),
    queryFn: () =>
      mobileApiFetch<{ assignment: MyPlanRecord }>(`/me/plans/${assignmentId}`, { token }),
    enabled: status === "authenticated" && Boolean(token) && Boolean(assignmentId),
  });
}

export function usePlanExercises(assignmentId?: string) {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: queryKeys.plans.exercises(assignmentId),
    queryFn: () =>
      mobileApiFetch<{
        assignment: MyPlanRecord;
        plan: PlanContentRecord;
        progress: PlanProgressRecord | null;
        exercises: PlanExerciseRecord[];
      }>(`/me/plans/${assignmentId}/exercises`, { token }),
    enabled: status === "authenticated" && Boolean(token) && Boolean(assignmentId),
  });
}
