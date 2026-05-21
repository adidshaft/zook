import { Prisma, prisma } from "@zook/db";
import type { PlanExerciseSummary } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function exerciseFromRecord(
  input: Record<string, unknown>,
  index: number,
  day?: string | null,
): PlanExerciseSummary | null {
  const name =
    optionalString(input.name) ?? optionalString(input.title) ?? optionalString(input.exerciseName);
  if (!name) {
    return null;
  }
  return {
    id: optionalString(input.id) ?? `${day ?? "exercise"}-${index}`,
    name,
    sets: optionalString(input.sets),
    equipment: optionalString(input.equipment),
    reps: optionalString(input.reps),
    day: day ?? optionalString(input.day),
    raw: optionalString(input.raw),
    orderIndex: index,
    completed: false,
  };
}

function exerciseFromText(raw: string, index: number, day?: string | null): PlanExerciseSummary {
  const match = raw.match(/^(.+?)(?:\s+\d+x|\s+\d+\s*x|\s+-|$)/i);
  const name = match?.[1]?.trim() || raw.trim();
  return {
    id: `${day ?? "exercise"}-${index}`,
    name,
    sets: null,
    equipment: null,
    reps: null,
    day: day ?? null,
    raw,
    orderIndex: index,
    completed: false,
  };
}

export function extractPlanExercises(content: Prisma.JsonValue): PlanExerciseSummary[] {
  if (!isRecord(content)) {
    return [];
  }

  const directExercises = Array.isArray(content.exercises)
    ? content.exercises
        .map((item, index) =>
          isRecord(item)
            ? exerciseFromRecord(item, index)
            : typeof item === "string"
              ? exerciseFromText(item, index)
              : null,
        )
        .filter((item): item is PlanExerciseSummary => Boolean(item))
    : [];

  const dayExercises = Array.isArray(content.days)
    ? content.days.flatMap((day, dayIndex) => {
        if (!isRecord(day)) {
          return [];
        }
        const dayName = optionalString(day.name) ?? `Day ${dayIndex + 1}`;
        const work = Array.isArray(day.work)
          ? day.work
          : Array.isArray(day.exercises)
            ? day.exercises
            : [];
        return work
          .map((item, itemIndex) =>
            isRecord(item)
              ? exerciseFromRecord(item, directExercises.length + itemIndex, dayName)
              : typeof item === "string"
                ? exerciseFromText(item, directExercises.length + itemIndex, dayName)
                : null,
          )
          .filter((item): item is PlanExerciseSummary => Boolean(item));
      })
    : [];

  return [...directExercises, ...dayExercises].map((exercise, index) => ({
    ...exercise,
    id: exercise.id || `exercise-${index}`,
    orderIndex: index,
  }));
}

function completedExerciseNames(progressJson: Prisma.JsonValue | null | undefined) {
  if (!isRecord(progressJson)) {
    return new Set<string>();
  }
  const values: string[] = [];
  for (const key of ["completedExercises", "completed", "done"]) {
    const field = progressJson[key];
    if (Array.isArray(field)) {
      values.push(...field.filter((item): item is string => typeof item === "string"));
    }
  }
  if (isRecord(progressJson.exercises)) {
    for (const [name, value] of Object.entries(progressJson.exercises)) {
      if (value === true || (isRecord(value) && value.completed === true)) {
        values.push(name);
      }
    }
  }
  return new Set(values.map((value) => value.toLowerCase()));
}

export async function getPlanExercisesForUser(userId: string, assignmentId: string) {
  const assignment = await prisma.planAssignment.findFirst({
    where: { id: assignmentId, assignedToUserId: userId, active: true },
  });
  if (!assignment) {
    return null;
  }
  const [plan, progress] = await Promise.all([
    prisma.planContent.findUnique({ where: { id: assignment.planId } }),
    prisma.planProgress.findUnique({ where: { assignmentId_userId: { assignmentId, userId } } }),
  ]);
  if (!plan) {
    return null;
  }
  const completed = completedExerciseNames(progress?.progressJson);
  return {
    assignment,
    plan,
    progress,
    exercises: extractPlanExercises(plan.content).map((exercise) => ({
      ...exercise,
      completed:
        completed.has(exercise.name.toLowerCase()) || completed.has(exercise.id.toLowerCase()),
    })),
  };
}
