import type {
  TrackingSummaryMetric,
  TrackingWindow,
  WorkoutHistorySeries,
  WorkoutLogEntry
} from "@zook/core";

function formatDateLabel(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function formatTimeLabel(value?: string | null) {
  if (!value) {
    return "--";
  }
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatDuration(minutes?: number | null) {
  const totalMinutes = minutes ?? 0;
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  if (!hours) {
    return `${remainingMinutes}m`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

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
    dateLabel: formatDateLabel(workout.startedAt),
    workoutName: workout.title,
    startTimeLabel: formatTimeLabel(workout.startedAt),
    endTimeLabel: formatTimeLabel(workout.endedAt),
    durationLabel: formatDuration(workout.durationMinutes),
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
      value: formatDuration(input.totalDuration),
      detail: input.totalDuration > 0 ? "This week" : "No sessions yet",
      tone: "lime"
    },
    {
      id: "recent",
      label: "Sessions",
      value: String(input.weeklyCount),
      detail: "This week",
      tone: "lime"
    },
    {
      id: "weight",
      label: "Weight",
      value: input.latestWeightKg ? `${input.latestWeightKg} kg` : "--",
      detail: "Latest entry",
      tone: "blue"
    },
    {
      id: "habits",
      label: "Habits",
      value: String(input.habitsCount),
      detail: input.habitsCount ? "Active habits" : "Add one",
      tone: "violet"
    }
  ];
}

export function buildHistorySeries(
  workouts: Array<{
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
  }>,
  window: TrackingWindow = "WEEKLY"
): WorkoutHistorySeries {
  const now = Date.now();
  const windowDays: Record<TrackingWindow, number> = {
    TODAY: 1,
    WEEKLY: 7,
    MONTHLY: 30,
    YEARLY: 365
  };
  const cutoffDays = windowDays[window] ?? 7;
  const filteredWorkouts = workouts.filter((workout) => {
    const startedAt = new Date(workout.startedAt).getTime();
    if (!Number.isFinite(startedAt)) {
      return false;
    }
    const ageDays = (now - startedAt) / 86_400_000;
    return ageDays >= 0 && ageDays <= cutoffDays;
  });
  const entries = filteredWorkouts.map(workoutToEntry);
  const totalDuration = filteredWorkouts.reduce(
    (sum, workout) => sum + (workout.durationMinutes ?? 0),
    0
  );

  return {
    key: window,
    label: window,
    totalDurationLabel: formatDuration(totalDuration),
    sessionCountLabel: `${filteredWorkouts.length} sessions`,
    completionLabel: `${filteredWorkouts.reduce((sum, workout) => sum + (workout.exercises?.length ?? 0), 0)} exercises logged`,
    entries
  };
}
