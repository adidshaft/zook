import type { NextRequest } from "next/server";
import { z } from "zod";
import { type PlanType } from "@zook/core";
import { canAssignPlanToUser, createPlanVersionSnapshot } from "@zook/core/services";
import { Prisma, prisma } from "@zook/db";

import { getRequestContext, requireAuth, requireOrgPermission } from "../access";
import { writeAuditLog } from "../audit";
import { extractPlanExercises } from "../domains/plans/read-models";
import { conflictError, forbiddenError, notFoundError, validationError } from "../errors";
import { assertMinorConsentGranted } from "../minor-gates";
import { ok, readJson } from "../response";
import {
  ADMIN_DETAIL_LIST_LIMIT,
  assertOrgUser,
  clean,
  createDirectNotification,
  fanoutPlanPublished,
  getOrganizationScopedFileAsset,
  pathMatches,
  planRequiresExercises,
  sanitizeJsonRichText,
  sanitizeRichText,
} from "./core";

const planContentInputSchema = z.object({
  title: z.string().trim().min(2).max(120),
  type: z
    .enum([
      "WORKOUT",
      "DIET",
      "EXERCISE_ROUTINE",
      "TRANSFORMATION_PROGRAM",
      "TRAINER_NOTE",
      "GYM_ADVISORY",
      "MACHINE_GUIDE",
      "RECOVERY",
    ])
    .default("WORKOUT"),
  description: z.string().max(500).optional(),
  content: z.record(z.string(), z.any()).default({ blocks: [] }),
  imageAssetId: z.string().optional(),
  visibility: z.string().default("selected"),
  aiGenerated: z.boolean().default(false),
});

const planContentUpdateSchema = planContentInputSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Provide at least one plan field to update.");

const planAssignSchema = z.object({
  assignedToUserId: z.string().optional(),
  audience: z.enum(["selected_member"]).default("selected_member"),
});

const planFeedbackSchema = z.object({
  planAssignmentId: z.string(),
  message: z.string().trim().min(1).max(500),
});

const challengeInputSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  optInOnly: z.boolean().default(true),
  leaderboardEnabled: z.boolean().default(false),
  active: z.boolean().default(true),
});

const challengeUpdateSchema = challengeInputSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Provide at least one challenge field to update.");

const challengeProgressSchema = z.object({
  value: z.number().int().min(0),
  metadata: z.record(z.string(), z.any()).optional(),
});

function parseChallengeDates(input: { startsAt?: string; endsAt?: string }) {
  const startsAt = input.startsAt ? new Date(input.startsAt) : undefined;
  const endsAt = input.endsAt ? new Date(input.endsAt) : undefined;
  if (startsAt && endsAt && startsAt >= endsAt) {
    throw validationError("Challenge end date must be after start date.");
  }
  return { startsAt, endsAt };
}

async function getActiveChallengeOrThrow(input: { orgId: string; challengeId: string }) {
  const challenge = await prisma.challenge.findFirst({
    where: { id: input.challengeId, orgId: input.orgId, active: true },
  });
  if (!challenge) {
    throw notFoundError("Challenge not found.");
  }
  if (challenge.endsAt < new Date()) {
    throw validationError("Challenge has ended.");
  }
  return challenge;
}

export async function handlePlansChallenges(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "plans"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "PLANS_CREATE");
    const plans = await prisma.planContent.findMany({
      where: { orgId },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: 100,
    });
    const assignments = await prisma.planAssignment.findMany({
      where: { orgId, planId: { in: plans.map((plan) => plan.id) } },
    });
    return ok({
      plans: plans.map((plan) => ({
        ...plan,
        assignmentCount: assignments.filter((assignment) => assignment.planId === plan.id).length,
      })),
    });
  }

  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "plans"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "PLANS_CREATE");
    const body = planContentInputSchema.parse(await readJson(request));
    const imageAsset = await getOrganizationScopedFileAsset(body.imageAssetId, orgId, [
      "plan_image",
      "ai_generated_image",
    ]);
    const sanitizedDescription = sanitizeRichText(body.description);
    const sanitizedContent = sanitizeJsonRichText(body.content) as Prisma.InputJsonValue;
    const attachments = imageAsset
      ? ({
          coverImage: {
            fileAssetId: imageAsset.id,
            url: imageAsset.url,
          },
        } as Prisma.InputJsonValue)
      : undefined;
    const plan = await prisma.planContent.create({
      data: clean({
        orgId,
        creatorUserId: userId,
        type: body.type as never,
        title: body.title,
        description: sanitizedDescription,
        content: sanitizedContent,
        attachments,
        aiGenerated: false,
        visibility: body.visibility,
      }),
    });
    await prisma.planVersion.create({
      data: {
        orgId,
        planId: plan.id,
        versionNo: 1,
        content: createPlanVersionSnapshot({
          title: body.title,
          ...clean({
            description: sanitizedDescription,
            aiGenerated: false,
            visibility: body.visibility,
            attachments,
          }),
          content: sanitizedContent,
        }) as Prisma.InputJsonValue,
        createdById: userId,
      },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "plan.created",
      entityType: "plan_content",
      entityId: plan.id,
      metadata: { title: plan.title, type: plan.type },
    });
    return ok({ plan });
  }

  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "plans", /.+/])) {
    const orgId = path[1]!;
    const planId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "PLANS_CREATE");
    const existingPlan = await prisma.planContent.findFirst({ where: { id: planId, orgId } });
    if (!existingPlan) {
      throw notFoundError("Plan not found");
    }
    const body = planContentUpdateSchema.parse(await readJson(request));
    const imageAsset = await getOrganizationScopedFileAsset(body.imageAssetId, orgId, [
      "plan_image",
      "ai_generated_image",
    ]);
    const attachments = imageAsset
      ? ({
          coverImage: {
            fileAssetId: imageAsset.id,
            url: imageAsset.url,
          },
        } as Prisma.InputJsonValue)
      : undefined;
    const sanitizedDescription = sanitizeRichText(body.description);
    const sanitizedContent =
      body.content === undefined
        ? undefined
        : (sanitizeJsonRichText(body.content) as Prisma.InputJsonValue);
    const plan = await prisma.planContent.update({
      where: { id: existingPlan.id },
      data: clean({
        title: body.title,
        type: body.type as never,
        description: sanitizedDescription,
        content: sanitizedContent,
        attachments,
        aiGenerated: false,
        visibility: body.visibility,
      }),
    });
    const latestVersion = await prisma.planVersion.aggregate({
      where: { orgId, planId: plan.id },
      _max: { versionNo: true },
    });
    await prisma.planVersion.create({
      data: {
        orgId,
        planId: plan.id,
        versionNo: (latestVersion._max.versionNo ?? 0) + 1,
        content: createPlanVersionSnapshot({
          title: plan.title,
          ...clean({
            description: plan.description,
            aiGenerated: plan.aiGenerated,
            visibility: plan.visibility,
            attachments: plan.attachments,
          }),
          content: plan.content,
        }) as Prisma.InputJsonValue,
        createdById: userId,
      },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "plan.updated",
      entityType: "plan_content",
      entityId: plan.id,
      metadata: { title: plan.title, type: plan.type },
    });
    return ok({ plan });
  }

  if (request.method === "DELETE" && pathMatches(path, ["orgs", /.+/, "plans", /.+/])) {
    const orgId = path[1]!;
    const planId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "PLANS_CREATE");
    const existingPlan = await prisma.planContent.findFirst({ where: { id: planId, orgId } });
    if (!existingPlan) {
      throw notFoundError("Plan not found");
    }
    const assignmentCount = await prisma.planAssignment.count({ where: { orgId, planId } });
    const plan = assignmentCount
      ? await prisma.planContent.update({
          where: { id: existingPlan.id },
          data: { status: "ARCHIVED" },
        })
      : await prisma.planContent.delete({ where: { id: existingPlan.id } });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: assignmentCount ? "plan.archived" : "plan.deleted",
      entityType: "plan_content",
      entityId: existingPlan.id,
      metadata: { title: existingPlan.title, assignmentCount },
    });
    return ok({ plan, archived: assignmentCount > 0 });
  }

  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "plans", /.+/, "publish"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "PLANS_PUBLISH_ALL");
    const existingPlan = await prisma.planContent.findFirst({ where: { id: path[3]!, orgId } });
    if (!existingPlan) {
      throw notFoundError("Plan not found");
    }
    const plan = await prisma.planContent.update({
      where: { id: existingPlan.id },
      data: { status: "PUBLISHED", reviewed: true, reviewedById: userId },
    });
    const fanout = await fanoutPlanPublished({ request, orgId, actorUserId: userId, plan });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "plan.published",
      entityType: "plan_content",
      entityId: plan.id,
      metadata: fanout,
    });
    return ok({ plan });
  }

  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "plans", /.+/, "review"])) {
    const orgId = path[1]!;
    const planId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "PLANS_CREATE");
    const existingPlan = await prisma.planContent.findFirst({ where: { id: planId, orgId } });
    if (!existingPlan) {
      throw notFoundError("Plan not found");
    }
    const canReview =
      existingPlan.creatorUserId === userId ||
      ctx.permissions.includes("PLANS_PUBLISH_ALL") ||
      ctx.roles.includes("OWNER") ||
      ctx.roles.includes("ADMIN");
    if (!canReview) {
      throw forbiddenError(
        "You can only review your own draft or use owner/admin plan publishing permissions.",
      );
    }
    const exercises = extractPlanExercises(existingPlan.content);
    if (planRequiresExercises(existingPlan.type as PlanType) && !exercises.length) {
      throw validationError("Workout plan drafts need at least one exercise before review.");
    }
    const plan = await prisma.planContent.update({
      where: { id: existingPlan.id },
      data: { reviewed: true, reviewedById: userId },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "plan.reviewed",
      entityType: "plan_content",
      entityId: plan.id,
      metadata: { aiGenerated: plan.aiGenerated },
    });
    return ok({ plan });
  }

  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "plans", /.+/, "assign"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "PLANS_PUBLISH_ASSIGNED");
    const existingPlan = await prisma.planContent.findFirst({ where: { id: path[3]!, orgId } });
    if (!existingPlan) {
      throw notFoundError("Plan not found");
    }
    if (existingPlan.aiGenerated && !existingPlan.reviewed) {
      throw conflictError("Assisted drafts must be reviewed before assignment.");
    }
    if (
      planRequiresExercises(existingPlan.type as PlanType) &&
      !extractPlanExercises(existingPlan.content).length
    ) {
      throw validationError("Workout plans need at least one exercise before assignment.");
    }
    const body = planAssignSchema.parse(await readJson(request));
    if (body.assignedToUserId) {
      await assertOrgUser({ orgId, userId: body.assignedToUserId, role: "MEMBER" });
      const targetUser = await prisma.user.findUniqueOrThrow({
        where: { id: body.assignedToUserId },
      });
      assertMinorConsentGranted({
        isMinor: targetUser.isMinor,
        guardianPending: targetUser.guardianPending,
        action: "plan assignment",
      });
    }
    const assignedClientUserIds = ctx.roles.includes("TRAINER")
      ? (
          await prisma.trainerAssignment.findMany({
            where: { orgId, trainerUserId: userId, active: true },
            select: { memberUserId: true },
          })
        ).map((assignment) => assignment.memberUserId)
      : [];
    if (
      !canAssignPlanToUser({
        actorRoles: ctx.roles,
        actorPermissions: ctx.permissions,
        audience: body.audience,
        assignedClientUserIds,
        ...(body.assignedToUserId ? { targetUserId: body.assignedToUserId } : {}),
      })
    ) {
      throw forbiddenError(
        "You can only assign plans to your own clients or within your granted scope.",
      );
    }
    const assignment = await prisma.planAssignment.create({
      data: clean({
        orgId,
        planId: existingPlan.id,
        assignedById: userId,
        assignedToUserId: body.assignedToUserId,
        audience: body.audience,
      }),
    });
    if (body.assignedToUserId) {
      await createDirectNotification({
        orgId,
        createdById: userId,
        type: "PLAN",
        title: `New plan assigned: ${existingPlan.title}`,
        body: "Open Zook to review the plan, ask follow-up questions, and track progress.",
        audience: "selected_member",
        userIds: [body.assignedToUserId],
        metadata: { assignmentId: assignment.id, planId: existingPlan.id },
      });
    }
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "plan.assigned",
      entityType: "plan_assignment",
      entityId: assignment.id,
      metadata: {
        assignedToUserId: body.assignedToUserId,
        audience: body.audience ?? "selected_member",
      },
    });
    return ok({ assignment });
  }

  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "plan-feedback"])) {
    const orgId = path[1]!;
    const userId = requireAuth(await getRequestContext(request, { orgId }));
    const body = planFeedbackSchema.parse(await readJson(request));
    const assignment = await prisma.planAssignment.findFirst({
      where: {
        id: body.planAssignmentId,
        orgId,
        assignedToUserId: userId,
        active: true,
      },
    });
    if (!assignment) {
      throw notFoundError("Plan assignment not found");
    }
    const plan = await prisma.planContent.findFirst({
      where: { id: assignment.planId, orgId },
      select: { title: true },
    });
    const progress = await prisma.planProgress.upsert({
      where: { assignmentId_userId: { assignmentId: assignment.id, userId } },
      update: { feedback: body.message },
      create: {
        orgId,
        assignmentId: assignment.id,
        userId,
        progressJson: {},
        completionPct: 0,
        feedback: body.message,
      },
    });
    const trainerIds = assignment.assignedById
      ? [assignment.assignedById]
      : (
          await prisma.trainerAssignment.findMany({
            where: { orgId, memberUserId: userId, active: true },
            select: { trainerUserId: true },
          })
        ).map((trainer) => trainer.trainerUserId);
    const recipientIds = [...new Set(trainerIds.filter((trainerId) => trainerId !== userId))];
    if (recipientIds.length) {
      await createDirectNotification({
        orgId,
        createdById: userId,
        type: "PLAN",
        title: `Plan feedback: ${plan?.title ?? "Training plan"}`,
        body: body.message,
        audience: "selected_trainers",
        userIds: recipientIds,
        metadata: {
          targetType: "plan",
          targetId: assignment.id,
          assignmentId: assignment.id,
          planId: assignment.planId,
        },
      });
    }
    return ok({ ok: true, progress, notified: recipientIds.length });
  }

  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "challenges"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "PLANS_CREATE");
    const body = challengeInputSchema.parse(await readJson(request));
    const { startsAt, endsAt } = parseChallengeDates(body);
    const challenge = await prisma.challenge.create({
      data: clean({
        orgId,
        createdById: userId,
        title: body.title,
        description: sanitizeRichText(body.description),
        startsAt: startsAt!,
        endsAt: endsAt!,
        optInOnly: body.optInOnly,
        leaderboardEnabled: body.leaderboardEnabled,
        active: body.active,
      }),
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "challenge.created",
      entityType: "challenge",
      entityId: challenge.id,
      metadata: { title: challenge.title },
    });
    return ok({ challenge });
  }

  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "challenges", /.+/])) {
    const orgId = path[1]!;
    const challengeId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "PLANS_CREATE");
    const existing = await prisma.challenge.findFirst({ where: { id: challengeId, orgId } });
    if (!existing) {
      throw notFoundError("Challenge not found.");
    }
    const body = challengeUpdateSchema.parse(await readJson(request));
    const dates = parseChallengeDates({
      startsAt: body.startsAt ?? existing.startsAt.toISOString(),
      endsAt: body.endsAt ?? existing.endsAt.toISOString(),
    });
    const challenge = await prisma.challenge.update({
      where: { id: existing.id },
      data: clean({
        title: body.title,
        description: sanitizeRichText(body.description),
        startsAt: dates.startsAt,
        endsAt: dates.endsAt,
        optInOnly: body.optInOnly,
        leaderboardEnabled: body.leaderboardEnabled,
        active: body.active,
      }),
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "challenge.updated",
      entityType: "challenge",
      entityId: challenge.id,
    });
    return ok({ challenge });
  }

  if (request.method === "DELETE" && pathMatches(path, ["orgs", /.+/, "challenges", /.+/])) {
    const orgId = path[1]!;
    const challengeId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "PLANS_CREATE");
    const existing = await prisma.challenge.findFirst({ where: { id: challengeId, orgId } });
    if (!existing) {
      throw notFoundError("Challenge not found.");
    }
    const challenge = await prisma.challenge.update({
      where: { id: existing.id },
      data: { active: false },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "challenge.deleted",
      entityType: "challenge",
      entityId: challenge.id,
    });
    return ok({ challenge });
  }

  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "challenges", /.+/, "opt-in"])) {
    const orgId = path[1]!;
    const challengeId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireAuth(ctx);
    await assertOrgUser({ orgId, userId });
    const challenge = await getActiveChallengeOrThrow({ orgId, challengeId });
    const participant = await prisma.challengeParticipant.upsert({
      where: { challengeId_userId: { challengeId, userId } },
      update: { visibleOnLeaderboard: challenge.leaderboardEnabled },
      create: {
        orgId,
        challengeId,
        userId,
        visibleOnLeaderboard: challenge.leaderboardEnabled,
      },
    });
    return ok({ participant });
  }

  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "challenges", /.+/, "progress"])) {
    const orgId = path[1]!;
    const challengeId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireAuth(ctx);
    await assertOrgUser({ orgId, userId });
    const challenge = await getActiveChallengeOrThrow({ orgId, challengeId });
    const body = challengeProgressSchema.parse(await readJson(request));
    if (challenge.optInOnly) {
      const participant = await prisma.challengeParticipant.findUnique({
        where: { challengeId_userId: { challengeId, userId } },
      });
      if (!participant) {
        throw validationError("Opt in to this challenge before posting progress.");
      }
    }
    const progress = await prisma.challengeProgress.upsert({
      where: { challengeId_userId: { challengeId, userId } },
      update: clean({
        value: body.value,
        metadata: body.metadata as Prisma.InputJsonValue | undefined,
      }),
      create: clean({
        orgId,
        challengeId,
        userId,
        value: body.value,
        metadata: body.metadata as Prisma.InputJsonValue | undefined,
      }),
    });
    return ok({ progress });
  }

  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "challenges", /.+/, "leaderboard"])) {
    const orgId = path[1]!;
    const challengeId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireAuth(ctx);
    await assertOrgUser({ orgId, userId });
    const challenge = await prisma.challenge.findFirst({ where: { id: challengeId, orgId, active: true } });
    if (!challenge) {
      throw notFoundError("Challenge not found.");
    }
    const progress = await prisma.challengeProgress.findMany({
      where: {
        orgId,
        challengeId,
        ...(challenge.leaderboardEnabled
          ? { userId: { in: (await prisma.challengeParticipant.findMany({
              where: { orgId, challengeId, visibleOnLeaderboard: true },
              select: { userId: true },
            })).map((participant) => participant.userId) } }
          : {}),
      },
      orderBy: [{ value: "desc" }, { updatedAt: "asc" }],
      take: ADMIN_DETAIL_LIST_LIMIT,
    });
    const users = await prisma.user.findMany({
      where: { id: { in: progress.map((entry) => entry.userId) } },
      select: { id: true, name: true, email: true },
    });
    const userById = new Map(users.map((user) => [user.id, user]));
    return ok({
      leaderboard: progress.map((entry, index) => ({
        rank: index + 1,
        userId: entry.userId,
        displayName: userById.get(entry.userId)?.name ?? userById.get(entry.userId)?.email ?? "Member",
        progressValue: entry.value,
        updatedAt: entry.updatedAt,
      })),
    });
  }

  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "challenges"])) {
    return ok({
      challenges: await prisma.challenge.findMany({
        where: { orgId: path[1]!, active: true },
        orderBy: { startsAt: "desc" },
        take: ADMIN_DETAIL_LIST_LIMIT,
      }),
    });
  }

  return undefined;
}
