import { useQuery } from "@tanstack/react-query";
import { mobileApiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { queryKeys } from "@/lib/domains/shared/keys";
import type {
  BodyProgressEntryRecord,
  DietPlanRecord,
  HabitRecord,
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
    staleTime: 5 * 60_000,
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
    staleTime: 5 * 60_000,
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
    staleTime: 5 * 60_000,
  });
}

export function useMyHabits() {
  const { status, token, activeOrgId } = useAuth();
  return useQuery({
    queryKey: queryKeys.tracking.habits(),
    queryFn: () =>
      mobileApiFetch<{ habits: HabitRecord[] }>("/me/tracking/habits", {
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
      }),
    enabled: status === "authenticated" && Boolean(token),
    staleTime: 60_000,
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
    staleTime: 5 * 60_000,
  });
}
