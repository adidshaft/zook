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
