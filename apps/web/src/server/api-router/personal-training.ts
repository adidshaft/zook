import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@zook/db";

import { getRequestContext, requireAuth, requireOrgPermission } from "../access";
import {
  accruePtClawback,
  accruePtSessionFee,
  accruePtSubscriptionCommission,
} from "../domains/payouts";
import { forbiddenError, notFoundError, validationError } from "../errors";
import { assertMinorConsentGranted } from "../minor-gates";
import { ok, readJson } from "../response";
import {
  assertOrgUser,
  clean,
  getOrganizationScopedFileAsset,
  pathMatches,
  sanitizeRichText,
} from "./core";

const ptSubscriptionSchema = z.object({
  memberUserId: z.string(),
  trainerUserId: z.string(),
  ptPlanId: z.string().optional(),
  amountPaise: z.number().int().positive(),
  paymentMode: z.enum(["CASH", "DIRECT_UPI", "OTHER"]),
  totalSessions: z.number().int().positive().optional(),
  notes: z.string().max(500).optional(),
  proofAssetId: z.string().optional(),
});

const ptSessionLogSchema = z.object({
  subscriptionId: z.string(),
  sessionAt: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

export async function handlePersonalTraining(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "pt-plans"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireAuth(ctx);
    await assertOrgUser({ orgId, userId: ctx.userId!, role: "MEMBER" });
    const plans = await prisma.personalTrainingPlan.findMany({
      where: { orgId, active: true },
      orderBy: { createdAt: "desc" },
    });
    const trainerIds = Array.from(new Set(plans.map((plan) => plan.trainerUserId)));
    const trainers = trainerIds.length
      ? await prisma.user.findMany({
          where: { id: { in: trainerIds } },
          select: { id: true, name: true },
        })
      : [];
    const trainerById = new Map(trainers.map((trainer) => [trainer.id, trainer.name]));
    return ok({
      plans: plans.map((plan) => ({
        ...plan,
        trainerName: trainerById.get(plan.trainerUserId) ?? null,
      })),
    });
  }

  if (
    request.method === "GET" &&
    pathMatches(path, ["orgs", /.+/, "trainers", /.+/, "pt-plans"])
  ) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "PT_RECORD");
    const trainerUserId = path[3]!;
    const plans = await prisma.personalTrainingPlan.findMany({
      where: { orgId, trainerUserId, active: true },
      orderBy: { createdAt: "desc" },
    });
    return ok({ plans });
  }

  if (
    request.method === "GET" &&
    pathMatches(path, ["orgs", /.+/, "trainers", /.+/, "pt-subscriptions"])
  ) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "PT_RECORD");
    const trainerUserId = path[3]!;
    const subscriptions = await prisma.personalTrainingSubscription.findMany({
      where: { orgId, trainerUserId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const [members, plans] = await Promise.all([
      subscriptions.length
        ? prisma.user.findMany({
            where: { id: { in: Array.from(new Set(subscriptions.map((s) => s.memberUserId))) } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      prisma.personalTrainingPlan.findMany({ where: { orgId, trainerUserId } }),
    ]);
    return ok({
      subscriptions: subscriptions.map((sub) => ({
        ...sub,
        memberName: members.find((member) => member.id === sub.memberUserId)?.name ?? null,
        planName: plans.find((plan) => plan.id === sub.ptPlanId)?.name ?? null,
      })),
    });
  }

  if (
    (request.method === "PATCH" || request.method === "DELETE") &&
    pathMatches(path, ["orgs", /.+/, "trainers", /.+/, "pt-plans", /.+/])
  ) {
    const orgId = path[1]!;
    const trainerUserId = path[3]!;
    const planId = path[5]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "PT_RECORD");
    await assertOrgUser({ orgId, userId: trainerUserId, role: "TRAINER" });
    if (ctx.roles.includes("TRAINER") && trainerUserId !== userId) {
      throw forbiddenError("You can only manage your own PT packages.");
    }
    const plan = await prisma.personalTrainingPlan.findFirst({
      where: { id: planId, orgId, trainerUserId },
    });
    if (!plan) {
      throw notFoundError("Personal training plan not found.");
    }

    if (request.method === "DELETE") {
      await prisma.personalTrainingPlan.update({
        where: { id: plan.id },
        data: { active: false },
      });
      return ok({ ok: true });
    }

    const body = z
      .object({
        name: z.string().trim().min(1).optional(),
        description: z.string().max(500).optional().nullable(),
        sessionCount: z.number().int().positive().optional().nullable(),
        durationDays: z.number().int().positive().optional().nullable(),
        pricePaise: z.number().int().positive().optional(),
      })
      .parse(await readJson(request));
    const updated = await prisma.personalTrainingPlan.update({
      where: { id: plan.id },
      data: clean({
        name: body.name,
        description:
          body.description === null ? null : sanitizeRichText(body.description),
        sessionCount: body.sessionCount,
        durationDays: body.durationDays,
        pricePaise: body.pricePaise,
      }),
    });
    return ok({ plan: updated });
  }

  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "trainers", /.+/, "pt-plans"])
  ) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "PT_RECORD");
    const trainerUserId = path[3]!;
    await assertOrgUser({ orgId, userId: trainerUserId, role: "TRAINER" });
    const body = (await readJson(request)) as {
      name: string;
      description?: string;
      sessionCount?: number;
      durationDays?: number;
      pricePaise: number;
    };
    const plan = await prisma.personalTrainingPlan.create({
      data: clean({
        orgId,
        trainerUserId,
        name: body.name,
        description: sanitizeRichText(body.description),
        sessionCount: body.sessionCount,
        durationDays: body.durationDays,
        pricePaise: body.pricePaise,
      }),
    });
    return ok({ plan });
  }

  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "pt-subscriptions"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "PT_RECORD");
    const body = ptSubscriptionSchema.parse(await readJson(request));
    const memberUser = await prisma.user.findUniqueOrThrow({ where: { id: body.memberUserId } });
    await Promise.all([
      assertOrgUser({ orgId, userId: body.memberUserId, role: "MEMBER" }),
      assertOrgUser({ orgId, userId: body.trainerUserId, role: "TRAINER" }),
    ]);
    if (body.ptPlanId) {
      const ptPlan = await prisma.personalTrainingPlan.findFirst({
        where: { id: body.ptPlanId, orgId, trainerUserId: body.trainerUserId },
      });
      if (!ptPlan) {
        throw notFoundError("Personal training plan not found for this trainer.");
      }
    }
    assertMinorConsentGranted({
      isMinor: memberUser.isMinor,
      guardianPending: memberUser.guardianPending,
      action: "PT subscription activation",
    });
    const proofAsset = await getOrganizationScopedFileAsset(body.proofAssetId, orgId, [
      "payment_proof",
    ]);
    const sub = await prisma.personalTrainingSubscription.create({
      data: clean({
        orgId,
        memberUserId: body.memberUserId,
        trainerUserId: body.trainerUserId,
        ptPlanId: body.ptPlanId,
        status: "ACTIVE",
        startsAt: new Date(),
        totalSessions: body.totalSessions,
        remainingSessions: body.totalSessions,
        amountPaise: body.amountPaise,
        paymentMode: body.paymentMode,
        proofAssetId: proofAsset?.id,
        notes: sanitizeRichText(body.notes),
        recordedById: userId,
      }),
    });
    await accruePtSubscriptionCommission({
      orgId,
      trainerId: body.trainerUserId,
      subscriptionId: sub.id,
      amountPaise: sub.amountPaise,
      createdById: userId,
    });
    return ok({ subscription: sub });
  }

  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "pt-subscriptions", /.+/, "approve"])
  ) {
    const orgId = path[1]!;
    const subscriptionId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "PT_RECORD");
    const sub = await prisma.personalTrainingSubscription.findFirst({
      where: { id: subscriptionId, orgId, status: "PENDING_APPROVAL" },
    });
    if (!sub) {
      throw notFoundError("Pending PT subscription not found.");
    }
    if (ctx.roles.includes("TRAINER") && sub.trainerUserId !== userId) {
      throw forbiddenError("You can only approve your own PT requests.");
    }
    if (sub.totalSessions !== null && sub.totalSessions !== undefined && sub.totalSessions <= 0) {
      throw validationError("PT request has no sessions to approve.");
    }
    const updated = await prisma.personalTrainingSubscription.update({
      where: { id: sub.id },
      data: { status: "ACTIVE", startsAt: new Date() },
    });
    await accruePtSubscriptionCommission({
      orgId,
      trainerId: sub.trainerUserId,
      subscriptionId: sub.id,
      amountPaise: sub.amountPaise,
      createdById: userId,
    });
    return ok({ subscription: updated });
  }

  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "pt-sessions"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "PT_RECORD");
    const body = ptSessionLogSchema.parse(await readJson(request));
    const subscription = await prisma.personalTrainingSubscription.findFirst({
      where: { id: body.subscriptionId, orgId, status: "ACTIVE" },
    });
    if (!subscription) {
      throw notFoundError("Active PT subscription not found.");
    }
    if (ctx.roles.includes("TRAINER") && subscription.trainerUserId !== userId) {
      throw forbiddenError("You can only log sessions for your assigned PT subscriptions.");
    }
    const sessionAt = body.sessionAt ? new Date(body.sessionAt) : new Date();
    const log = await prisma.$transaction(async (tx) => {
      const created = await tx.personalTrainingSessionLog.create({
        data: {
          orgId,
          subscriptionId: subscription.id,
          trainerUserId: subscription.trainerUserId,
          memberUserId: subscription.memberUserId,
          sessionAt,
          notes: body.notes ? (sanitizeRichText(body.notes) ?? null) : null,
        },
      });
      await tx.personalTrainingSubscription.update({
        where: { id: subscription.id },
        data:
          subscription.remainingSessions !== null && subscription.remainingSessions !== undefined
            ? { remainingSessions: { decrement: 1 } }
            : {},
      });
      return created;
    });
    await accruePtSessionFee({
      orgId,
      trainerId: subscription.trainerUserId,
      sessionLogId: log.id,
      sessionAt,
      createdById: userId,
    });
    return ok({ session: log });
  }

  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "pt-subscriptions", /.+/, "refund"])
  ) {
    const orgId = path[1]!;
    const subscriptionId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "PT_RECORD");
    const subscription = await prisma.personalTrainingSubscription.findFirst({
      where: { id: subscriptionId, orgId },
    });
    if (!subscription) {
      throw notFoundError("PT subscription not found.");
    }
    await prisma.personalTrainingSubscription.update({
      where: { id: subscription.id },
      data: { status: "REFUNDED" },
    });
    const line = await accruePtClawback({
      orgId,
      trainerId: subscription.trainerUserId,
      subscriptionId: subscription.id,
      amountPaise: subscription.amountPaise,
      createdById: userId,
    });
    return ok({ refunded: true, line });
  }

  return undefined;
}
