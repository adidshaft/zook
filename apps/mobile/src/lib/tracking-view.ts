import type {
  TrackingSummaryMetric,
  WorkoutLogEntry
} from "@zook/core";

import { formatCompactMinutes, formatLongDate, formatTime } from "@/lib/formatting";
import type { useT } from "@/lib/i18n";

export function workoutToEntry(workout: {
  id: string;
  title: string;
  workoutType: string;
  startedAt: string;
  endedAt?: string | null;
  durationMinutes?: number | null;
  intensity?: string | null;
  notes?: string | null;
  exercises?: Array<{
    id: string;
    exerciseName: string;
    setsCompleted?: number | null;
    reps?: number | null;
    weightKg?: string | number | null;
    completed: boolean;
  }>;
}): WorkoutLogEntry {
  return {
    id: workout.id,
    dateLabel: formatLongDate(workout.startedAt),
    workoutName: workout.title,
    startTimeLabel: formatTime(workout.startedAt),
    endTimeLabel: formatTime(workout.endedAt),
    durationLabel: formatCompactMinutes(workout.durationMinutes, {
      includeZeroMinutes: true,
      separator: " ",
    }),
    focusLabel: workout.workoutType,
    effortLabel: workout.intensity ?? "Logged",
    notes: workout.notes ?? "No notes.",
    exercises:
      workout.exercises?.map((exercise) => ({
        id: exercise.id,
        name: exercise.exerciseName,
        setsLabel: `${exercise.setsCompleted ?? 0} sets`,
        repsLabel: `${exercise.reps ?? 0} reps`,
        loadLabel: exercise.weightKg ? `${exercise.weightKg} kg` : undefined,
        status: exercise.completed ? "DONE" : "SKIPPED"
      })) ?? []
  };
}

export function buildTrackingSummaryMetrics(input: {
  totalDuration: number;
  weeklyCount: number;
  recentCount: number;
  latestWeightKg?: string | number | null;
  habitsCount: number;
  t: ReturnType<typeof useT>;
}): TrackingSummaryMetric[] {
  const { t } = input;
  return [
    {
      id: "worked-out",
      label: t("tracking.activeTime"),
      value: formatCompactMinutes(input.totalDuration, {
        includeZeroMinutes: true,
        separator: " ",
      }),
      detail: input.totalDuration > 0 ? t("tracking.workoutTime") : t("tracking.noSessions")
    },
    {
      id: "recent",
      label: t("tracking.sessions"),
      value: String(input.weeklyCount),
      detail: t("tracking.loggedSessions")
    },
    {
      id: "weight",
      label: t("tracking.weight"),
      value: input.latestWeightKg ? `${input.latestWeightKg} kg` : "--",
      detail: t("tracking.latestEntry")
    },
    {
      id: "habits",
      label: t("member.home.habits"),
      value: String(input.habitsCount),
      detail: input.habitsCount ? t("tracking.activeHabits") : t("tracking.addOne")
    }
  ];
}
