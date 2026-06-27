import type { NextRequest } from "next/server";
import {
  bodyProgressEntrySchema,
  mealLogSchema,
  memberHabitLogSchema,
  memberHabitSchema,
  workoutSessionSchema,
} from "@zook/core";
import { PersonalTrackingService } from "@zook/core/services";
import { Prisma, prisma } from "@zook/db";
import { getRequestContext, requireAuth } from "../access";
import { forbiddenError, notFoundError } from "../errors";
import { ok, readJson } from "../response";
import {
  clean,
  getUserScopedFileAsset,
  pathMatches,
} from "./core";

const personalTrackingService = new PersonalTrackingService();
const bodyProgressPatchSchema = bodyProgressEntrySchema.partial();
const memberHabitPatchSchema = memberHabitSchema.partial();

function decimalField(value: unknown) {
  return value !== undefined ? new Prisma.Decimal(value as string | number) : undefined;
}

async function listTrackingWorkouts(userId: string) {
  const workouts = await prisma.workoutSession.findMany({
    where: { userId, deletedAt: null },
    orderBy: { startedAt: "desc" },
    take: 100,
  });
  const exercises = await prisma.workoutExerciseEntry.findMany({
    where: { workoutSessionId: { in: workouts.map((workout) => workout.id) } },
    orderBy: [{ workoutSessionId: "asc" }, { orderIndex: "asc" }],
  });

  return workouts.map((workout) => ({
    ...workout,
    exercises: exercises.filter((exercise) => exercise.workoutSessionId === workout.id),
  }));
}

function toTrackingWorkoutRecord(input: {
  id: string;
  userId: string;
  organizationId: string | null;
  title: string;
  workoutType: string;
  startedAt: Date;
  endedAt: Date | null;
  durationMinutes: number | null;
  intensity: string | null;
  notes: string | null;
  mood: string | null;
  visibility: "PRIVATE" | "TRAINER_VISIBLE";
}) {
  return {
    id: input.id,
    userId: input.userId,
    ...(input.organizationId ? { organizationId: input.organizationId } : {}),
    title: input.title,
    workoutType: input.workoutType,
    startedAt: input.startedAt,
    ...(input.endedAt ? { endedAt: input.endedAt } : {}),
    ...(input.durationMinutes !== null ? { durationMinutes: input.durationMinutes } : {}),
    ...(input.intensity ? { intensity: input.intensity } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
    ...(input.mood ? { mood: input.mood } : {}),
    visibility: input.visibility,
  };
}

export async function handleTracking(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["me", "tracking", "summary"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const [workouts, bodyProgress, habits] = await Promise.all([
      listTrackingWorkouts(userId),
      prisma.bodyProgressEntry.findMany({
        where: { userId },
        orderBy: { measuredAt: "desc" },
        take: 10,
      }),
      prisma.memberHabit.findMany({
        where: { userId, active: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    return ok({
      summary: personalTrackingService.getTrackingSummary(
        workouts.map((workout) => toTrackingWorkoutRecord(workout)),
      ),
      recentWorkouts: workouts.slice(0, 5),
      latestBodyProgress: bodyProgress[0] ?? null,
      habits,
    });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "tracking", "workouts"])) {
    const userId = requireAuth(await getRequestContext(request));
    return ok({ workouts: await listTrackingWorkouts(userId) });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "tracking", "workouts"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const body = workoutSessionSchema.parse(await readJson(request));
    let organizationId = body.organizationId;
    if (body.planAssignmentId) {
      const assignment = await prisma.planAssignment.findFirst({
        where: { id: body.planAssignmentId, assignedToUserId: userId, active: true },
      });
      if (!assignment) {
        throw forbiddenError("Plan assignment does not belong to this user.");
      }
      if (organizationId && organizationId !== assignment.orgId) {
        throw forbiddenError("Workout organization does not match the plan assignment.");
      }
      organizationId = assignment.orgId;
    }
    if (organizationId) {
      const membership = await prisma.organizationUser.findFirst({
        where: { orgId: organizationId, userId, status: "active" },
      });
      if (!membership && !ctx.isPlatformAdmin) {
        throw forbiddenError("No organization access for workout tracking.");
      }
    }
    if (body.attendanceRecordId) {
      const attendanceRecord = await prisma.attendanceRecord.findFirst({
        where: {
          id: body.attendanceRecordId,
          userId,
          ...(organizationId ? { orgId: organizationId } : {}),
        },
      });
      if (!attendanceRecord) {
        throw forbiddenError("Attendance record does not belong to this user.");
      }
      organizationId = attendanceRecord.orgId;
    }
    const visibility = personalTrackingService.normalizeVisibility({
      isMinor: user.isMinor,
      guardianConsentGranted: !user.guardianPending,
      ...(body.visibility ? { requestedVisibility: body.visibility } : {}),
    });
    const baseWorkout = personalTrackingService.createWorkoutSession({
      title: body.title,
      workoutType: body.workoutType,
      startedAt: new Date(body.startedAt),
      ...(body.endedAt ? { endedAt: new Date(body.endedAt) } : {}),
      ...(body.intensity ? { intensity: body.intensity } : {}),
      ...(body.notes ? { notes: body.notes } : {}),
      ...(body.mood ? { mood: body.mood } : {}),
      visibility,
    });

    const workout = await prisma.workoutSession.create({
      data: {
        userId,
        ...(organizationId ? { organizationId } : {}),
        ...(body.planAssignmentId ? { planAssignmentId: body.planAssignmentId } : {}),
        ...(body.attendanceRecordId ? { attendanceRecordId: body.attendanceRecordId } : {}),
        title: baseWorkout.title,
        workoutType: baseWorkout.workoutType,
        startedAt: baseWorkout.startedAt,
        ...(baseWorkout.endedAt ? { endedAt: baseWorkout.endedAt } : {}),
        ...(baseWorkout.durationMinutes !== undefined
          ? { durationMinutes: baseWorkout.durationMinutes }
          : {}),
        ...(baseWorkout.intensity ? { intensity: baseWorkout.intensity } : {}),
        ...(baseWorkout.notes ? { notes: baseWorkout.notes } : {}),
        ...(baseWorkout.mood ? { mood: baseWorkout.mood } : {}),
        visibility,
      },
    });

    if (body.exercises.length) {
      await prisma.workoutExerciseEntry.createMany({
        data: body.exercises.map((exercise) => ({
          workoutSessionId: workout.id,
          exerciseName: exercise.exerciseName,
          orderIndex: exercise.orderIndex,
          ...(exercise.muscleGroup ? { muscleGroup: exercise.muscleGroup } : {}),
          ...(exercise.equipment ? { equipment: exercise.equipment } : {}),
          ...(exercise.setsPlanned !== undefined ? { setsPlanned: exercise.setsPlanned } : {}),
          ...(exercise.setsCompleted !== undefined
            ? { setsCompleted: exercise.setsCompleted }
            : {}),
          ...(exercise.reps !== undefined ? { reps: exercise.reps } : {}),
          ...(exercise.weightKg !== undefined
            ? { weightKg: new Prisma.Decimal(exercise.weightKg) }
            : {}),
          ...(exercise.durationSeconds !== undefined
            ? { durationSeconds: exercise.durationSeconds }
            : {}),
          ...(exercise.distanceMeters !== undefined
            ? { distanceMeters: exercise.distanceMeters }
            : {}),
          ...(exercise.notes ? { notes: exercise.notes } : {}),
          completed: exercise.completed,
        })),
      });
    }

    return ok({ workout });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "tracking", "workouts", /.+/])) {
    const userId = requireAuth(await getRequestContext(request));
    const workout = await prisma.workoutSession.findFirst({
      where: { id: path[3]!, userId, deletedAt: null },
    });
    if (!workout) {
      throw notFoundError("Workout not found");
    }
    const exercises = await prisma.workoutExerciseEntry.findMany({
      where: { workoutSessionId: workout.id },
      orderBy: { orderIndex: "asc" },
    });
    return ok({ workout: { ...workout, exercises } });
  }
  if (request.method === "PATCH" && pathMatches(path, ["me", "tracking", "workouts", /.+/])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const existingWorkout = await prisma.workoutSession.findFirst({
      where: { id: path[3]!, userId, deletedAt: null },
    });
    if (!existingWorkout) {
      throw notFoundError("Workout not found");
    }
    const body = workoutSessionSchema.partial().parse(await readJson(request));
    const visibility = personalTrackingService.normalizeVisibility({
      isMinor: user.isMinor,
      guardianConsentGranted: !user.guardianPending,
      ...(body.visibility ? { requestedVisibility: body.visibility } : {}),
    });
    const updated = personalTrackingService.updateWorkoutSession(
      toTrackingWorkoutRecord(existingWorkout),
      {
        ...(body.title ? { title: body.title } : {}),
        ...(body.workoutType ? { workoutType: body.workoutType } : {}),
        ...(body.startedAt ? { startedAt: new Date(body.startedAt) } : {}),
        ...(body.endedAt ? { endedAt: new Date(body.endedAt) } : {}),
        ...(body.intensity ? { intensity: body.intensity } : {}),
        ...(body.notes ? { notes: body.notes } : {}),
        ...(body.mood ? { mood: body.mood } : {}),
        visibility,
      },
    );

    const workout = await prisma.workoutSession.update({
      where: { id: existingWorkout.id },
      data: {
        title: updated.title,
        workoutType: updated.workoutType,
        startedAt: updated.startedAt,
        ...(updated.endedAt ? { endedAt: updated.endedAt } : {}),
        ...(updated.durationMinutes !== undefined
          ? { durationMinutes: updated.durationMinutes }
          : {}),
        ...(updated.intensity ? { intensity: updated.intensity } : {}),
        ...(updated.notes ? { notes: updated.notes } : {}),
        ...(updated.mood ? { mood: updated.mood } : {}),
        visibility,
      },
    });

    if (body.exercises) {
      await prisma.workoutExerciseEntry.deleteMany({ where: { workoutSessionId: workout.id } });
      if (body.exercises.length) {
        await prisma.workoutExerciseEntry.createMany({
          data: body.exercises.map((exercise) => ({
            workoutSessionId: workout.id,
            exerciseName: exercise.exerciseName,
            orderIndex: exercise.orderIndex,
            ...(exercise.muscleGroup ? { muscleGroup: exercise.muscleGroup } : {}),
            ...(exercise.equipment ? { equipment: exercise.equipment } : {}),
            ...(exercise.setsPlanned !== undefined ? { setsPlanned: exercise.setsPlanned } : {}),
            ...(exercise.setsCompleted !== undefined
              ? { setsCompleted: exercise.setsCompleted }
              : {}),
            ...(exercise.reps !== undefined ? { reps: exercise.reps } : {}),
            ...(exercise.weightKg !== undefined
              ? { weightKg: new Prisma.Decimal(exercise.weightKg) }
              : {}),
            ...(exercise.durationSeconds !== undefined
              ? { durationSeconds: exercise.durationSeconds }
              : {}),
            ...(exercise.distanceMeters !== undefined
              ? { distanceMeters: exercise.distanceMeters }
              : {}),
            ...(exercise.notes ? { notes: exercise.notes } : {}),
            completed: exercise.completed,
          })),
        });
      }
    }

    return ok({ workout });
  }
  if (request.method === "DELETE" && pathMatches(path, ["me", "tracking", "workouts", /.+/])) {
    const userId = requireAuth(await getRequestContext(request));
    const workout = await prisma.workoutSession.findFirst({
      where: { id: path[3]!, userId, deletedAt: null },
    });
    if (!workout) {
      throw notFoundError("Workout not found");
    }
    await prisma.workoutSession.update({
      where: { id: workout.id },
      data: { deletedAt: new Date() },
    });
    return ok({ deleted: true });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "tracking", "body-progress"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const body = bodyProgressEntrySchema.parse(await readJson(request));
    const photoAsset = await getUserScopedFileAsset({
      userId,
      allowedCategories: ["body_progress_photo", "profile_photo"],
      ...(body.photoAssetId ? { fileAssetId: body.photoAssetId } : {}),
      ...(body.organizationId ? { orgId: body.organizationId } : {}),
    });
    const visibility = personalTrackingService.normalizeVisibility({
      isMinor: user.isMinor,
      guardianConsentGranted: !user.guardianPending,
      ...(body.visibility ? { requestedVisibility: body.visibility } : {}),
    });
    const entry = await prisma.bodyProgressEntry.create({
      data: {
        userId,
        ...(body.organizationId ? { organizationId: body.organizationId } : {}),
        measuredAt: new Date(body.measuredAt),
        ...(body.weightKg !== undefined ? { weightKg: new Prisma.Decimal(body.weightKg) } : {}),
        ...(body.waistCm !== undefined ? { waistCm: new Prisma.Decimal(body.waistCm) } : {}),
        ...(body.hipCm !== undefined ? { hipCm: new Prisma.Decimal(body.hipCm) } : {}),
        ...(body.chestCm !== undefined ? { chestCm: new Prisma.Decimal(body.chestCm) } : {}),
        ...(body.shoulderCm !== undefined
          ? { shoulderCm: new Prisma.Decimal(body.shoulderCm) }
          : {}),
        ...(body.armCm !== undefined ? { armCm: new Prisma.Decimal(body.armCm) } : {}),
        ...(body.forearmCm !== undefined
          ? { forearmCm: new Prisma.Decimal(body.forearmCm) }
          : {}),
        ...(body.thighCm !== undefined ? { thighCm: new Prisma.Decimal(body.thighCm) } : {}),
        ...(body.calfCm !== undefined ? { calfCm: new Prisma.Decimal(body.calfCm) } : {}),
        ...(body.neckCm !== undefined ? { neckCm: new Prisma.Decimal(body.neckCm) } : {}),
        ...(body.bodyFatPercent !== undefined
          ? { bodyFatPercent: new Prisma.Decimal(body.bodyFatPercent) }
          : {}),
        ...(body.muscleMassKg !== undefined
          ? { muscleMassKg: new Prisma.Decimal(body.muscleMassKg) }
          : {}),
        ...(body.visceralFatRating !== undefined
          ? { visceralFatRating: body.visceralFatRating }
          : {}),
        ...(body.restingHeartRate !== undefined ? { restingHeartRate: body.restingHeartRate } : {}),
        ...(photoAsset ? { photoAssetId: photoAsset.id } : {}),
        ...(body.notes ? { notes: body.notes } : {}),
        visibility,
      },
    });
    return ok({ entry });
  }
  if (
    request.method === "PATCH" &&
    pathMatches(path, ["me", "tracking", "body-progress", /.+/])
  ) {
    const userId = requireAuth(await getRequestContext(request));
    const entryId = path[3]!;
    const existing = await prisma.bodyProgressEntry.findFirst({ where: { id: entryId, userId } });
    if (!existing) {
      throw notFoundError("Body progress entry not found");
    }
    const body = bodyProgressPatchSchema.parse(await readJson(request));
    const entry = await prisma.bodyProgressEntry.update({
      where: { id: existing.id },
      data: clean({
        organizationId: body.organizationId,
        measuredAt: body.measuredAt ? new Date(body.measuredAt) : undefined,
        weightKg: decimalField(body.weightKg),
        waistCm: decimalField(body.waistCm),
        hipCm: decimalField(body.hipCm),
        chestCm: decimalField(body.chestCm),
        shoulderCm: decimalField(body.shoulderCm),
        armCm: decimalField(body.armCm),
        forearmCm: decimalField(body.forearmCm),
        thighCm: decimalField(body.thighCm),
        calfCm: decimalField(body.calfCm),
        neckCm: decimalField(body.neckCm),
        bodyFatPercent: decimalField(body.bodyFatPercent),
        muscleMassKg: decimalField(body.muscleMassKg),
        visceralFatRating: body.visceralFatRating,
        restingHeartRate: body.restingHeartRate,
        photoAssetId: body.photoAssetId,
        notes: body.notes,
        visibility: body.visibility,
      }),
    });
    return ok({ entry });
  }
  if (
    request.method === "DELETE" &&
    pathMatches(path, ["me", "tracking", "body-progress", /.+/])
  ) {
    const userId = requireAuth(await getRequestContext(request));
    const entry = await prisma.bodyProgressEntry.findFirst({ where: { id: path[3]!, userId } });
    if (!entry) {
      throw notFoundError("Body progress entry not found");
    }
    await prisma.bodyProgressEntry.delete({ where: { id: entry.id } });
    return ok({ deleted: true });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "tracking", "body-progress"])) {
    const userId = requireAuth(await getRequestContext(request));
    return ok({
      entries: await prisma.bodyProgressEntry.findMany({
        where: { userId },
        orderBy: { measuredAt: "desc" },
        take: 50,
      }),
    });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "diet"])) {
    const userId = requireAuth(await getRequestContext(request));
    const plan = await prisma.dietPlan.findFirst({
      where: { memberId: userId, status: "PUBLISHED" },
      orderBy: { updatedAt: "desc" },
    });
    const [meals, logs] = await Promise.all([
      plan
        ? prisma.dietPlanMeal.findMany({
            where: { dietPlanId: plan.id },
            orderBy: { order: "asc" },
          })
        : Promise.resolve([]),
      prisma.mealLog.findMany({
        where: {
          userId,
          loggedAt: {
            gte: (() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return today;
            })(),
          },
        },
        orderBy: { loggedAt: "desc" },
        take: 20,
      }),
    ]);
    return ok({ plan: plan ? { ...plan, meals } : null, logs });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "diet", "meal-logs"])) {
    const userId = requireAuth(await getRequestContext(request));
    const body = mealLogSchema.parse(await readJson(request));
    const plan = body.dietPlanId
      ? await prisma.dietPlan.findFirst({ where: { id: body.dietPlanId, memberId: userId } })
      : null;
    if (body.dietPlanId && !plan) {
      throw notFoundError("Diet plan not found");
    }
    const log = await prisma.mealLog.create({
      data: clean({
        userId,
        organizationId: body.organizationId ?? plan?.orgId,
        dietPlanId: plan?.id,
        mealName: body.mealName,
        loggedAt: body.loggedAt ? new Date(body.loggedAt) : new Date(),
        calories: body.calories,
        proteinG: body.proteinG,
        carbsG: body.carbsG,
        fatsG: body.fatsG,
        photoAssetId: body.photoAssetId,
        notes: body.notes,
      }),
    });
    return ok({ log });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "tracking", "habits"])) {
    const userId = requireAuth(await getRequestContext(request));
    const habits = await prisma.memberHabit.findMany({
      where: { userId, active: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const logs = await prisma.memberHabitLog.findMany({
      where: { habitId: { in: habits.map((habit) => habit.id) } },
      orderBy: { loggedAt: "desc" },
      take: 100,
    });
    return ok({
      habits: habits.map((habit) => ({
        ...habit,
        logs: logs.filter((log) => log.habitId === habit.id),
      })),
    });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "tracking", "habits"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const body = memberHabitSchema.parse(await readJson(request));
    const visibility = personalTrackingService.normalizeVisibility({
      isMinor: user.isMinor,
      guardianConsentGranted: !user.guardianPending,
      ...(body.visibility ? { requestedVisibility: body.visibility } : {}),
    });
    const habit = await prisma.memberHabit.create({
      data: {
        userId,
        ...(body.organizationId ? { organizationId: body.organizationId } : {}),
        title: body.title,
        category: body.category,
        ...(body.targetValue !== undefined ? { targetValue: body.targetValue } : {}),
        ...(body.unit ? { unit: body.unit } : {}),
        frequency: body.frequency,
        visibility,
      },
    });
    return ok({ habit });
  }
  if (request.method === "PATCH" && pathMatches(path, ["me", "tracking", "habits", /.+/])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const habit = await prisma.memberHabit.findFirst({
      where: { id: path[3]!, userId, active: true },
    });
    if (!habit) {
      throw notFoundError("Habit not found");
    }
    const body = memberHabitPatchSchema.parse(await readJson(request));
    const updated = await prisma.memberHabit.update({
      where: { id: habit.id },
      data: clean({
        organizationId: body.organizationId,
        title: body.title,
        category: body.category,
        targetValue: body.targetValue,
        unit: body.unit,
        frequency: body.frequency,
        visibility: body.visibility,
      }),
    });
    return ok({ habit: updated });
  }
  if (request.method === "DELETE" && pathMatches(path, ["me", "tracking", "habits", /.+/])) {
    const userId = requireAuth(await getRequestContext(request));
    const habit = await prisma.memberHabit.findFirst({
      where: { id: path[3]!, userId, active: true },
    });
    if (!habit) {
      throw notFoundError("Habit not found");
    }
    await prisma.memberHabit.update({ where: { id: habit.id }, data: { active: false } });
    return ok({ deleted: true });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "tracking", "habits", /.+/, "log"])) {
    const userId = requireAuth(await getRequestContext(request));
    const habit = await prisma.memberHabit.findFirst({
      where: { id: path[3]!, userId, active: true },
    });
    if (!habit) {
      throw notFoundError("Habit not found");
    }
    const body = memberHabitLogSchema.parse(await readJson(request));
    const log = await prisma.memberHabitLog.create({
      data: {
        habitId: habit.id,
        ...(body.loggedAt ? { loggedAt: new Date(body.loggedAt) } : {}),
        ...(body.value !== undefined ? { value: body.value } : {}),
        ...(body.notes ? { notes: body.notes } : {}),
        completed: body.completed,
      },
    });
    return ok({ log });
  }
  return undefined;
}
