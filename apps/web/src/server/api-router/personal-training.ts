import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@zook/db";

import { getRequestContext, requireOrgPermission } from "../access";
import {
  accruePtClawback,
  accruePtSessionFee,
  accruePtSubscriptionCommission,
} from "../domains/payouts";
import { forbiddenError, notFoundError } from "../errors";
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
