import { type PlanType } from "@zook/core";
import { Prisma, prisma } from "@zook/db";
import type { NextRequest } from "next/server";

import { getRequestContext, requireAuth } from "../access";
import { getPlanExercisesForUser } from "../domains/plans/read-models";
import { forbiddenError, notFoundError, validationError } from "../errors";
import { ok, readJson } from "../response";
import {
  assertActiveContextOrg,
  clean,
  getBadgePayloads,
  listPlanAssignmentsForUser,
  pathMatches,
  planCompletionInputSchema,
  planProgressInputSchema,
  planRequiresExercises,
  USER_HISTORY_LIST_LIMIT,
} from "./core";

export async function handleMemberPlansGoals(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["me", "plans"])) {
    const userId = requireAuth(await getRequestContext(request));
    return ok({ plans: await listPlanAssignmentsForUser(userId) });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "plans", /.+/, "exercises"])) {
    const userId = requireAuth(await getRequestContext(request));
    const detail = await getPlanExercisesForUser(userId, path[2]!);
    if (!detail) {
      throw notFoundError("Plan assignment not found");
    }
    return ok(detail);
  }
  if (request.method === "GET" && pathMatches(path, ["me", "plans", /.+/])) {
    const userId = requireAuth(await getRequestContext(request));
    const plans = await listPlanAssignmentsForUser(userId, path[2]!);
    const assignment = plans[0];
    if (!assignment) {
      throw notFoundError("Plan assignment not found");
    }
    return ok({ assignment });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "plans", /.+/, "progress"])) {
    const userId = requireAuth(await getRequestContext(request));
    const body = planProgressInputSchema.parse(await readJson(request));
    const assignment = await prisma.planAssignment.findFirst({
      where: { id: path[2]!, assignedToUserId: userId, active: true },
    });
    if (!assignment) {
      throw notFoundError("Plan assignment not found");
    }
    if (body.orgId && body.orgId !== assignment.orgId) {
      throw forbiddenError("Progress organization does not match the plan assignment.");
    }
    const progress = await prisma.planProgress.upsert({
      where: { assignmentId_userId: { assignmentId: path[2]!, userId } },
      update: clean({
        progressJson: body.progressJson as Prisma.InputJsonValue,
        completionPct: body.completionPct,
        feedback: body.feedback,
      }),
      create: clean({
        orgId: assignment.orgId,
        assignmentId: path[2]!,
        userId,
        progressJson: body.progressJson as Prisma.InputJsonValue,
        completionPct: body.completionPct,
        feedback: body.feedback,
      }),
    });
    return ok({ progress });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "plans", /.+/, "complete"])) {
    const userId = requireAuth(await getRequestContext(request));
    const body = planCompletionInputSchema.parse(await readJson(request));
    const detail = await getPlanExercisesForUser(userId, path[2]!);
    if (!detail) {
      throw notFoundError("Plan assignment not found");
    }
    if (planRequiresExercises(detail.plan.type as PlanType) && !detail.exercises.length) {
      throw validationError("Workout plans need at least one exercise before completion.");
    }
    if (body.orgId && body.orgId !== detail.assignment.orgId) {
      throw forbiddenError("Completion organization does not match the plan assignment.");
    }
    const completedExercises = body.exercises.length
      ? body.exercises.filter((exercise) => exercise.completed).map((exercise) => exercise.name)
      : detail.exercises.map((exercise) => exercise.name);
    const progressJson = {
      ...body.progressJson,
      completedExercises,
      exerciseProgress: body.exercises,
      completedAt: new Date().toISOString(),
    };
    const progress = await prisma.planProgress.upsert({
      where: { assignmentId_userId: { assignmentId: path[2]!, userId } },
      update: clean({
        progressJson: progressJson as Prisma.InputJsonValue,
        completionPct: 100,
        feedback: body.feedback,
      }),
      create: clean({
        orgId: detail.assignment.orgId,
        assignmentId: path[2]!,
        userId,
        progressJson: progressJson as Prisma.InputJsonValue,
        completionPct: 100,
        feedback: body.feedback,
      }),
    });
    return ok({ progress, completedExercises });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "goals"])) {
    const userId = requireAuth(await getRequestContext(request));
    return ok({
      goals: await prisma.userGoal.findMany({
        where: { userId, active: true },
        orderBy: { updatedAt: "desc" },
        take: USER_HISTORY_LIST_LIMIT,
      }),
    });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "goals"])) {
    const userId = requireAuth(await getRequestContext(request));
    const body = (await readJson(request)) as {
      orgId?: string;
      type: string;
      title: string;
      targetValue?: number;
      period?: string;
    };
    const goal = await prisma.userGoal.create({
      data: clean({
        orgId: body.orgId,
        userId,
        type: body.type,
        title: body.title,
        targetValue: body.targetValue,
        period: body.period,
      }),
    });
    return ok({ goal });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "badges"])) {
    const requestedOrgId = request.nextUrl.searchParams.get("orgId") ?? undefined;
    const ctx = await getRequestContext(request, requestedOrgId ? { orgId: requestedOrgId } : {});
    const userId = requireAuth(ctx);
    assertActiveContextOrg(ctx, requestedOrgId);
    return ok({ badges: await getBadgePayloads(userId, requestedOrgId ?? ctx.orgId) });
  }
  return undefined;
}
