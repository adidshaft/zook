export type TrackingVisibility = "PRIVATE" | "TRAINER_VISIBLE";

export interface TrackingExerciseInput {
  exerciseName: string;
  orderIndex: number;
  setsCompleted?: number;
  reps?: number;
  weightKg?: number;
  durationSeconds?: number;
  distanceMeters?: number;
  notes?: string;
  completed?: boolean;
}

export interface TrackingWorkoutInput {
  title: string;
  workoutType: string;
  startedAt: Date;
  endedAt?: Date;
  intensity?: string;
  notes?: string;
  mood?: string;
  visibility?: TrackingVisibility;
  exercises?: TrackingExerciseInput[];
}

export interface TrackingWorkoutRecord extends TrackingWorkoutInput {
  id: string;
  userId: string;
  organizationId?: string;
  durationMinutes?: number;
}

export class PersonalTrackingService {
  createWorkoutSession(input: TrackingWorkoutInput) {
    return {
      ...input,
      durationMinutes: this.calculateDurationMinutes(input.startedAt, input.endedAt)
    };
  }

  updateWorkoutSession(current: TrackingWorkoutRecord, input: Partial<TrackingWorkoutInput>) {
    const startedAt = input.startedAt ?? current.startedAt;
    const endedAt = input.endedAt ?? current.endedAt;
    return {
      ...current,
      ...input,
      startedAt,
      endedAt,
      durationMinutes: this.calculateDurationMinutes(startedAt, endedAt)
    };
  }

  listWorkoutSessions(records: TrackingWorkoutRecord[]) {
    return [...records].sort((left, right) => right.startedAt.getTime() - left.startedAt.getTime());
  }

  getTrackingSummary(records: TrackingWorkoutRecord[], now = new Date()) {
    const weeklyCount = this.computeWeeklyConsistency(records, now);
    const totalDuration = records.reduce((sum, record) => sum + (record.durationMinutes ?? 0), 0);
    return {
      weeklyCount,
      totalDuration,
      recentCount: records.length
    };
  }

  addExerciseEntry(record: TrackingWorkoutRecord, entry: TrackingExerciseInput) {
    return {
      ...record,
      exercises: [...(record.exercises ?? []), entry]
    };
  }

  completeWorkout(record: TrackingWorkoutRecord, endedAt: Date) {
    return {
      ...record,
      endedAt,
      durationMinutes: this.calculateDurationMinutes(record.startedAt, endedAt)
    };
  }

  createBodyProgressEntry<T extends Record<string, unknown>>(input: T) {
    return input;
  }

  createHabit<T extends Record<string, unknown>>(input: T) {
    return input;
  }

  logHabit<T extends Record<string, unknown>>(input: T) {
    return input;
  }

  computeWeeklyConsistency(records: Array<{ startedAt: Date }>, now = new Date()) {
    const threshold = new Date(now);
    threshold.setDate(now.getDate() - 6);
    threshold.setHours(0, 0, 0, 0);
    return records.filter((record) => record.startedAt >= threshold && record.startedAt <= now).length;
  }

  computePlanCompletionImpact(input: { assignedPlans: number; completedPlans: number }) {
    if (input.assignedPlans <= 0) {
      return 0;
    }
    return Math.round((input.completedPlans / input.assignedPlans) * 100);
  }

  normalizeVisibility(input: {
    requestedVisibility?: TrackingVisibility;
    isMinor: boolean;
    guardianConsentGranted: boolean;
  }): TrackingVisibility {
    if (input.isMinor || !input.guardianConsentGranted) {
      return "PRIVATE";
    }
    return input.requestedVisibility ?? "PRIVATE";
  }

  private calculateDurationMinutes(startedAt: Date, endedAt?: Date) {
    if (!endedAt) {
      return undefined;
    }
    return Math.max(Math.round((endedAt.getTime() - startedAt.getTime()) / 60_000), 0);
  }
}
