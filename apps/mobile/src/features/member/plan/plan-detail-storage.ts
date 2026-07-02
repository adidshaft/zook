import type { PlanExerciseRecord } from "@/lib/domains";

export type PlanExerciseDraft = {
  name: string;
  sets: string;
  equipment: string;
  reps: string;
  restSeconds?: number | null;
};

export function planStorageDate(date = new Date()) {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function planProgressStorageKey(assignmentId: string, dateKey = planStorageDate()) {
  return `zook_plan_progress_${assignmentId}_${dateKey}`;
}

export function planCustomExerciseStorageKey(assignmentId: string, dateKey = planStorageDate()) {
  return `zook_plan_custom_${assignmentId}_${dateKey}`;
}

export function legacyPlanProgressStorageKey(assignmentId: string) {
  return `zook_plan_progress_${assignmentId}`;
}

export function stalePlanStorageKeys(assignmentId: string, input: { today?: Date; daysToKeep?: number; scanDays?: number } = {}) {
  const today = input.today ?? new Date();
  const daysToKeep = input.daysToKeep ?? 7;
  const scanDays = input.scanDays ?? 45;
  const keys = [legacyPlanProgressStorageKey(assignmentId)];
  for (let age = daysToKeep + 1; age <= scanDays; age += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - age);
    const dateKey = planStorageDate(date);
    keys.push(planProgressStorageKey(assignmentId, dateKey));
    keys.push(planCustomExerciseStorageKey(assignmentId, dateKey));
  }
  return keys;
}

export function parseStoredStringArray(value: string | null) {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

export function parseStoredCustomExercises(value: string | null): PlanExerciseDraft[] {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
      .map((item) => ({
        name: typeof item.name === "string" ? item.name.trim() : "",
        sets: typeof item.sets === "string" ? item.sets : "",
        equipment: typeof item.equipment === "string" ? item.equipment : "",
        reps: typeof item.reps === "string" ? item.reps : "",
        restSeconds: typeof item.restSeconds === "number" ? item.restSeconds : null,
      }))
      .filter((item) => item.name.length > 0);
  } catch {
    return [];
  }
}

export function mergePlanExercises(
  apiExercises: PlanExerciseDraft[],
  customExercises: PlanExerciseDraft[],
) {
  const seen = new Set(apiExercises.map((exercise) => exercise.name.toLowerCase()));
  return [
    ...apiExercises,
    ...customExercises.filter((exercise) => {
      const key = exercise.name.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    }),
  ];
}

export function serializeCustomExercises(exercises: PlanExerciseDraft[]) {
  return JSON.stringify(exercises);
}

export function completedNamesFromApi(exercises: PlanExerciseRecord[]) {
  return exercises.filter((exercise) => exercise.completed).map((exercise) => exercise.name);
}
