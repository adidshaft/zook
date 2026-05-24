import { useQuery } from "@tanstack/react-query";
import { mobileApiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { queryKeys } from "@/lib/domains/shared/keys";
import type {
  BodyProgressEntryRecord,
  DietPlanRecord,
  MealLogRecord,
} from "@/lib/domains/shared/types";

export function useMyTracking() {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: queryKeys.tracking.summary(),
    queryFn: () =>
      mobileApiFetch<{
        summary: { weeklyCount: number; totalDuration: number; recentCount: number };
        recentWorkouts: Array<Record<string, unknown>>;
        latestBodyProgress: Record<string, unknown> | null;
        habits: Array<Record<string, unknown>>;
      }>("/me/tracking/summary", { token }),
    enabled: status === "authenticated" && Boolean(token),
  });
}

export function useMyBodyProgress() {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: queryKeys.tracking.bodyProgress(),
    queryFn: () =>
      mobileApiFetch<{ entries: BodyProgressEntryRecord[] }>("/me/tracking/body-progress", {
        token,
      }),
    enabled: status === "authenticated" && Boolean(token),
  });
}

export function useMyTrackingWorkouts() {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: queryKeys.tracking.workouts(),
    queryFn: () =>
      mobileApiFetch<{ workouts: Array<Record<string, unknown>> }>("/me/tracking/workouts", {
        token,
      }),
    enabled: status === "authenticated" && Boolean(token),
  });
}

export function useMyTrackingHabits() {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: queryKeys.tracking.habits(),
    queryFn: () =>
      mobileApiFetch<{ habits: Array<Record<string, unknown>> }>("/me/tracking/habits", { token }),
    enabled: status === "authenticated" && Boolean(token),
  });
}

export function useMyDiet() {
  const { status, token, activeOrgId } = useAuth();
  return useQuery({
    queryKey: queryKeys.member.diet(),
    queryFn: () =>
      mobileApiFetch<{ plan: DietPlanRecord | null; logs: MealLogRecord[] }>("/me/diet", {
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
      }),
    enabled: status === "authenticated" && Boolean(token),
  });
}
