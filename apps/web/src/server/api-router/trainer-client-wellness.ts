import type { NextRequest } from "next/server";
import { bodyProgressEntrySchema, dietPlanSchema } from "@zook/core";
import { Prisma, prisma } from "@zook/db";

import { getRequestContext, requireAuth, requireOrgPermission } from "../access";
import { writeAuditLog } from "../audit";
import { notFoundError } from "../errors";
import { ok, readJson } from "../response";
import {
  clean,
  createDirectNotification,
  parseMemberProfileNotes,
  pathMatches,
} from "./core";

export async function handleTrainerClientWellness(request: NextRequest, path: string[]) {
  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "trainers", /.+/, "clients", /.+/, "body-progress"])
  ) {
    const orgId = path[1]!;
    const trainerId = path[3]!;
    const clientId = path[5]!;
    const ctx = await getRequestContext(request, { orgId });
    const requesterId = requireAuth(ctx);
    if (requesterId === trainerId) {
      requireOrgPermission(ctx, orgId, "PLANS_CREATE");
    } else {
      requireOrgPermission(ctx, orgId, "MEMBERS_VIEW");
    }
    const assignment = await prisma.trainerAssignment.findFirst({
      where: { orgId, trainerUserId: trainerId, memberUserId: clientId, active: true },
    });
    if (!assignment) {
      throw notFoundError("Trainer client not found");
    }
    const body = bodyProgressEntrySchema.parse(await readJson(request));
    const entry = await prisma.bodyProgressEntry.create({
      data: {
        userId: clientId,
        organizationId: orgId,
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
        ...(body.photoAssetId ? { photoAssetId: body.photoAssetId } : {}),
        ...(body.notes ? { notes: body.notes } : {}),
        recordedByUserId: requesterId,
        visibility: "TRAINER_VISIBLE",
      },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: requesterId,
      action: "trainer.body_progress.recorded",
      entityType: "body_progress_entry",
      entityId: entry.id,
      metadata: { trainerUserId: trainerId, memberUserId: clientId },
    });
    return ok({ entry });
  }

  if (
    (request.method === "GET" || request.method === "POST") &&
    pathMatches(path, ["orgs", /.+/, "trainers", /.+/, "clients", /.+/, "diet-plans"])
  ) {
    const orgId = path[1]!;
    const trainerId = path[3]!;
    const clientId = path[5]!;
    const ctx = await getRequestContext(request, { orgId });
    const requesterId = requireAuth(ctx);
    if (requesterId === trainerId) {
      requireOrgPermission(ctx, orgId, "PLANS_PUBLISH_ASSIGNED");
    } else {
      requireOrgPermission(ctx, orgId, "MEMBERS_VIEW");
    }
    const assignment = await prisma.trainerAssignment.findFirst({
      where: { orgId, trainerUserId: trainerId, memberUserId: clientId, active: true },
    });
    if (!assignment) {
      throw notFoundError("Trainer client not found");
    }
    if (request.method === "GET") {
      const plans = await prisma.dietPlan.findMany({
        where: { orgId, trainerId, memberId: clientId },
        orderBy: { updatedAt: "desc" },
        take: 50,
      });
      const meals = plans.length
        ? await prisma.dietPlanMeal.findMany({
            where: { dietPlanId: { in: plans.map((plan) => plan.id) } },
            orderBy: [{ dietPlanId: "asc" }, { order: "asc" }],
          })
        : [];
      return ok({
        plans: plans.map((plan) => ({
          ...plan,
          meals: meals.filter((meal) => meal.dietPlanId === plan.id),
        })),
      });
    }
    const rawBody = (await readJson(request)) as Record<string, unknown>;
    const body = dietPlanSchema.parse({ ...rawBody, memberId: clientId });
    const plan = await prisma.$transaction(async (tx) => {
      const created = await tx.dietPlan.create({
        data: clean({
          orgId,
          branchId: body.branchId,
          trainerId,
          memberId: clientId,
          title: body.title,
          calorieTarget: body.calorieTarget,
          proteinG: body.proteinG,
          carbsG: body.carbsG,
          fatsG: body.fatsG,
          status: body.status,
        }),
      });
      await tx.dietPlanMeal.createMany({
        data: body.meals.map((meal, index) => ({
          dietPlanId: created.id,
          name: meal.name,
          timeOfDay: meal.timeOfDay ?? null,
          items: meal.items,
          calories: meal.calories ?? null,
          proteinG: meal.proteinG ?? null,
          carbsG: meal.carbsG ?? null,
          fatsG: meal.fatsG ?? null,
          order: meal.order ?? index,
        })),
      });
      return created;
    });
    if (plan.status === "PUBLISHED") {
      await createDirectNotification({
        orgId,
        createdById: requesterId,
        type: "PLAN",
        title: `New diet plan: ${plan.title}`,
        body: "Open Zook to review today's meals and log updates.",
        audience: "selected_member",
        userIds: [clientId],
        metadata: { dietPlanId: plan.id },
      });
    }
    await writeAuditLog({
      request,
      orgId,
      actorUserId: requesterId,
      action: "diet_plan.published",
      entityType: "diet_plan",
      entityId: plan.id,
      metadata: { trainerUserId: trainerId, memberUserId: clientId, status: plan.status },
    });
    return ok({
      plan: {
        ...plan,
        meals: await prisma.dietPlanMeal.findMany({
          where: { dietPlanId: plan.id },
          orderBy: { order: "asc" },
        }),
      },
    });
  }

  if (
    (request.method === "PATCH" || request.method === "DELETE") &&
    pathMatches(path, ["orgs", /.+/, "trainers", /.+/, "clients", /.+/, "diet-plans", /.+/])
  ) {
    const orgId = path[1]!;
    const trainerId = path[3]!;
    const clientId = path[5]!;
    const planId = path[7]!;
    const ctx = await getRequestContext(request, { orgId });
    const requesterId = requireAuth(ctx);
    if (requesterId === trainerId) {
      requireOrgPermission(ctx, orgId, "PLANS_PUBLISH_ASSIGNED");
    } else {
      requireOrgPermission(ctx, orgId, "MEMBERS_VIEW");
    }
    const plan = await prisma.dietPlan.findFirst({
      where: { id: planId, orgId, trainerId, memberId: clientId },
    });
    if (!plan) {
      throw notFoundError("Diet plan not found");
    }
    if (request.method === "DELETE") {
      await prisma.$transaction([
        prisma.dietPlanMeal.deleteMany({ where: { dietPlanId: plan.id } }),
        prisma.dietPlan.delete({ where: { id: plan.id } }),
      ]);
      await writeAuditLog({
        request,
        orgId,
        actorUserId: requesterId,
        action: "diet_plan.deleted",
        entityType: "diet_plan",
        entityId: plan.id,
        riskLevel: "HIGH",
        metadata: { trainerUserId: trainerId, memberUserId: clientId },
      });
      return ok({ deleted: true });
    }
    const rawBody = (await readJson(request)) as Record<string, unknown>;
    const body = dietPlanSchema.partial().parse(rawBody);
    const updated = await prisma.$transaction(async (tx) => {
      const nextPlan = await tx.dietPlan.update({
        where: { id: plan.id },
        data: clean({
          title: body.title,
          branchId: body.branchId,
          calorieTarget: body.calorieTarget,
          proteinG: body.proteinG,
          carbsG: body.carbsG,
          fatsG: body.fatsG,
          status: body.status,
        }),
      });
      if (body.meals) {
        await tx.dietPlanMeal.deleteMany({ where: { dietPlanId: plan.id } });
        await tx.dietPlanMeal.createMany({
          data: body.meals.map((meal, index) => ({
            dietPlanId: plan.id,
            name: meal.name,
            timeOfDay: meal.timeOfDay ?? null,
            items: meal.items,
            calories: meal.calories ?? null,
            proteinG: meal.proteinG ?? null,
            carbsG: meal.carbsG ?? null,
            fatsG: meal.fatsG ?? null,
            order: meal.order ?? index,
          })),
        });
      }
      return nextPlan;
    });
    if (updated.status === "PUBLISHED" && plan.status !== "PUBLISHED") {
      await createDirectNotification({
        orgId,
        createdById: requesterId,
        type: "PLAN",
        title: `New diet plan: ${updated.title}`,
        body: "Open Zook to review today's meals and log updates.",
        audience: "selected_member",
        userIds: [clientId],
        metadata: { dietPlanId: updated.id },
      });
    }
    await writeAuditLog({
      request,
      orgId,
      actorUserId: requesterId,
      action: "diet_plan.updated",
      entityType: "diet_plan",
      entityId: updated.id,
      metadata: { trainerUserId: trainerId, memberUserId: clientId, status: updated.status },
    });
    return ok({
      plan: {
        ...updated,
        meals: await prisma.dietPlanMeal.findMany({
          where: { dietPlanId: updated.id },
          orderBy: { order: "asc" },
        }),
      },
    });
  }

  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "trainers", /.+/, "clients"])) {
    const orgId = path[1]!;
    const trainerId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const requesterId = requireAuth(ctx);
    if (requesterId === trainerId) {
      requireOrgPermission(ctx, orgId, "PLANS_CREATE");
    } else {
      requireOrgPermission(ctx, orgId, "MEMBERS_VIEW");
    }
    const assignments = await prisma.trainerAssignment.findMany({
      where: { orgId, trainerUserId: trainerId, active: true },
      orderBy: { createdAt: "desc" },
    });
    const memberUserIds = assignments.map((assignment) => assignment.memberUserId);
    const [
      users,
      profiles,
      bodyProgressEntries,
      planAssignments,
      planProgressEntries,
      trainerVisibleWorkouts,
    ] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: memberUserIds } },
      }),
      prisma.memberProfile.findMany({
        where: { orgId, userId: { in: memberUserIds } },
      }),
      prisma.bodyProgressEntry.findMany({
        where: {
          organizationId: orgId,
          userId: { in: memberUserIds },
        },
        orderBy: { measuredAt: "desc" },
        take: Math.max(assignments.length * 3, 10),
      }),
      prisma.planAssignment.findMany({
        where: {
          orgId,
          assignedToUserId: { in: memberUserIds },
          active: true,
        },
      }),
      prisma.planProgress.findMany({
        where: {
          orgId,
          userId: { in: memberUserIds },
          OR: [{ feedback: { not: null } }, { completionPct: { gt: 0 } }],
        },
        orderBy: { updatedAt: "desc" },
        take: Math.max(assignments.length * 5, 10),
      }),
      prisma.workoutSession.findMany({
        where: {
          organizationId: orgId,
          userId: { in: memberUserIds },
          visibility: "TRAINER_VISIBLE",
          deletedAt: null,
        },
        orderBy: { startedAt: "desc" },
        take: Math.max(assignments.length * 5, 10),
      }),
    ]);
    return ok({
      clients: assignments.map((assignment) => {
        const user = users.find((candidate) => candidate.id === assignment.memberUserId) ?? null;
        const profile =
          profiles.find((candidate) => candidate.userId === assignment.memberUserId) ?? null;
        const latestBodyProgress =
          bodyProgressEntries.find((entry) => entry.userId === assignment.memberUserId) ?? null;
        return {
          ...assignment,
          user,
          profile,
          summary: {
            ...parseMemberProfileNotes(profile?.notes),
            fitnessGoal: user?.fitnessGoal ?? null,
            dateOfBirth: user?.dateOfBirth ?? null,
            weightKg: latestBodyProgress?.weightKg
              ? Number(latestBodyProgress.weightKg)
              : undefined,
            activePlans: planAssignments.filter(
              (plan) => plan.assignedToUserId === assignment.memberUserId,
            ).length,
            recentFeedback: planProgressEntries
              .filter((entry) => entry.userId === assignment.memberUserId)
              .slice(0, 3)
              .map((entry) => ({
                assignmentId: entry.assignmentId,
                completionPct: entry.completionPct,
                feedback: entry.feedback,
                updatedAt: entry.updatedAt,
              })),
            recentWorkouts: trainerVisibleWorkouts
              .filter((workout) => workout.userId === assignment.memberUserId)
              .slice(0, 3)
              .map((workout) => ({
                id: workout.id,
                title: workout.title,
                workoutType: workout.workoutType,
                startedAt: workout.startedAt,
                durationMinutes: workout.durationMinutes,
                notes: workout.notes,
              })),
          },
        };
      }),
    });
  }

  return undefined;
}
