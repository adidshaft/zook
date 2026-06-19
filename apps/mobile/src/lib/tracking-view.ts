import type {
  TrackingSummaryMetric,
  WorkoutLogEntry
} from "@zook/core";

import { formatCompactMinutes, formatLongDate, formatTime } from "@/lib/formatting";

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
    notes: workout.notes ?? "No notes yet.",
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
}): TrackingSummaryMetric[] {
  return [
    {
      id: "worked-out",
      label: "Active time",
      value: formatCompactMinutes(input.totalDuration, {
        includeZeroMinutes: true,
        separator: " ",
      }),
      detail: input.totalDuration > 0 ? "This week" : "No sessions yet"
    },
    {
      id: "recent",
      label: "Sessions",
      value: String(input.weeklyCount),
      detail: "This week"
    },
    {
      id: "weight",
      label: "Weight",
      value: input.latestWeightKg ? `${input.latestWeightKg} kg` : "--",
      detail: "Current entry"
    },
    {
      id: "habits",
      label: "Habits",
      value: String(input.habitsCount),
      detail: input.habitsCount ? "Active habits" : "Add one"
    }
  ];
}
