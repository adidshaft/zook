import type { NextRequest } from "next/server";
import { z } from "zod";
import { computeSubscriptionWindow } from "@zook/core/services";
import { type PaymentMandateStatus } from "@zook/core";
import { Prisma, prisma } from "@zook/db";
import { getRequestContext, requireAuth, requireOrgPermission } from "../access";
import { writeAuditLog } from "../audit";
import { forbiddenError, notFoundError, validationError } from "../errors";
import { assertRateLimit } from "../rate-limit";
import { ok, readJson } from "../response";
import {
  assertActiveContextOrg,
  assertBranchAccessForContext,
  clean,
  getPaymentProviderOrThrow,
  liveMandateStatuses,
  pathMatches,
  providerMandateStatusToLocal,
  sanitizeRichText,
  toMembershipPlanInput,
} from "./core";

const subscriptionSwitchSchema = z.object({
  planId: z.string(),
  effectiveAt: z.string().datetime().optional(),
});

const subscriptionPauseSchema = z.object({
  resumesAt: z.string().datetime(),
  reason: z.string().trim().max(240).optional(),
});

async function pauseCapDaysForOrg(orgId: string) {
  const setting = await prisma.organizationSetting.findUnique({ where: { orgId } });
  const values =
    setting?.keyValues && typeof setting.keyValues === "object" && !Array.isArray(setting.keyValues)
      ? (setting.keyValues as Record<string, unknown>)
      : {};
  const configured = Number(values.membershipPauseCapDaysPerYear ?? values.pauseCapDaysPerYear ?? 30);
  return Number.isFinite(configured) && configured >= 0 ? Math.floor(configured) : 30;
}

function wholeDaysBetween(start: Date, end: Date) {
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
}

function addDays(start: Date, days: number) {
  return new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
}

async function switchSubscriptionPlan(input: {
  request: NextRequest;
  actorUserId: string;
  subscription: Prisma.MemberSubscriptionGetPayload<object>;
  planId: string;
  effectiveAt?: Date;
}) {
  const subscription = input.subscription;
  if (subscription.status !== "ACTIVE" && subscription.status !== "PAUSED") {
    throw validationError("Only active or paused memberships can be switched.");
  }
  const newPlan = await prisma.membershipPlan.findFirst({
    where: { id: input.planId, orgId: subscription.orgId, active: true },
  });
  if (!newPlan) {
    throw notFoundError("Membership plan not found");
  }
  if (newPlan.branchId && newPlan.branchId !== subscription.branchId) {
    throw forbiddenError("This plan belongs to another branch.");
  }
  const effectiveAt = input.effectiveAt ?? new Date();
  const window = computeSubscriptionWindow(toMembershipPlanInput(newPlan));
  const planDurationDays =
    window.endsAt && window.startsAt ? wholeDaysBetween(window.startsAt, window.endsAt) : 0;
  const unusedDays =
    subscription.endsAt && subscription.endsAt > effectiveAt
      ? wholeDaysBetween(effectiveAt, subscription.endsAt)
      : 0;
  const endsAt =
    planDurationDays > 0 ? addDays(effectiveAt, planDurationDays + unusedDays) : window.endsAt;
  const remainingVisits =
    newPlan.visitLimit !== null
      ? newPlan.visitLimit + Math.max(subscription.remainingVisits ?? 0, 0)
      : subscription.remainingVisits;
  const updated = await prisma.memberSubscription.update({
    where: { id: subscription.id },
    data: clean({
      planId: newPlan.id,
      branchId: subscription.branchId,
      status: "ACTIVE",
      startsAt: effectiveAt,
      endsAt,
      remainingVisits,
      pausedAt: null,
      resumesAt: null,
      notes: [
        subscription.notes,
        `switch:${subscription.planId}->${newPlan.id};unused_days_credit:${unusedDays}`,
      ]
        .filter(Boolean)
        .join("\n"),
    }),
  });
  await writeAuditLog({
    request: input.request,
    orgId: subscription.orgId,
    actorUserId: input.actorUserId,
    action: "membership.plan_switched",
    entityType: "member_subscription",
    entityId: subscription.id,
    metadata: {
      previousPlanId: subscription.planId,
      nextPlanId: newPlan.id,
      unusedDaysCredit: unusedDays,
      prorationPolicy: "credit_unused_days_at_new_plan_rate",
    },
  });
  return { subscription: updated, proration: { unusedDaysCredit: unusedDays } };
}

async function pauseSubscription(input: {
  request: NextRequest;
  actorUserId: string;
  subscription: Prisma.MemberSubscriptionGetPayload<object>;
  resumesAt: Date;
  reason?: string;
}) {
  const subscription = input.subscription;
  if (subscription.status !== "ACTIVE") {
    throw validationError("Only active memberships can be paused.");
  }
  const now = new Date();
  if (input.resumesAt <= now) {
    throw validationError("Resume date must be in the future.");
  }
  const requestedDays = wholeDaysBetween(now, input.resumesAt);
  const capDays = await pauseCapDaysForOrg(subscription.orgId);
  if (subscription.pauseDaysUsed + requestedDays > capDays) {
    throw validationError(`Membership pause limit is ${capDays} days per year.`);
  }
  const updated = await prisma.memberSubscription.update({
    where: { id: subscription.id },
    data: clean({
      status: "PAUSED",
      pausedAt: now,
      resumesAt: input.resumesAt,
      notes: input.reason
        ? [subscription.notes, `pause_reason:${sanitizeRichText(input.reason)}`]
            .filter(Boolean)
            .join("\n")
        : subscription.notes,
    }),
  });
  await writeAuditLog({
    request: input.request,
    orgId: subscription.orgId,
    actorUserId: input.actorUserId,
    action: "membership.paused",
    entityType: "member_subscription",
    entityId: subscription.id,
    metadata: { resumesAt: input.resumesAt, requestedDays, capDays },
  });
  return { subscription: updated, pauseDaysRequested: requestedDays, capDays };
}

async function resumeSubscription(input: {
  request: NextRequest;
  actorUserId: string;
  subscription: Prisma.MemberSubscriptionGetPayload<object>;
}) {
  const subscription = input.subscription;
  if (subscription.status !== "PAUSED" || !subscription.pausedAt) {
    throw validationError("Only paused memberships can be resumed.");
  }
  const now = new Date();
  const pausedDays = wholeDaysBetween(subscription.pausedAt, now);
  const updated = await prisma.memberSubscription.update({
    where: { id: subscription.id },
    data: {
      status: "ACTIVE",
      pausedAt: null,
      resumesAt: null,
      pauseDaysUsed: { increment: pausedDays },
      ...(subscription.endsAt ? { endsAt: addDays(subscription.endsAt, pausedDays) } : {}),
    },
  });
  await writeAuditLog({
    request: input.request,
    orgId: subscription.orgId,
    actorUserId: input.actorUserId,
    action: "membership.resumed",
    entityType: "member_subscription",
    entityId: subscription.id,
    metadata: { pausedDays, pauseClockExcluded: true },
  });
  return { subscription: updated, pausedDaysApplied: pausedDays };
}

export async function handleMembershipSubscriptionActions(request: NextRequest, path: string[]) {
  if (
    request.method === "POST" &&
    pathMatches(path, ["me", "memberships", /.+/, "cancel"])
  ) {
    const subscriptionId = path[2]!;
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    await assertRateLimit(
      "subscriptionChangeByActor",
      `cancel:${subscriptionId}:${userId}`,
      "Too many cancellation attempts.",
    );
    const subscription = await prisma.memberSubscription.findFirst({
      where: { id: subscriptionId, memberUserId: userId },
    });
    if (!subscription) {
      throw notFoundError("Membership not found");
    }
    if (!["ACTIVE", "PAUSED"].includes(subscription.status)) {
      throw validationError("Only active or paused memberships can be cancelled.");
    }
    assertActiveContextOrg(ctx, subscription.orgId);
    const updated = await prisma.memberSubscription.update({
      where: { id: subscription.id },
      data: { status: "CANCELLED" },
    });
    await writeAuditLog({
      request,
      orgId: subscription.orgId,
      actorUserId: userId,
      action: "membership.cancelled_by_member",
      entityType: "member_subscription",
      entityId: subscription.id,
      metadata: { previousStatus: subscription.status },
    });
    return ok({ subscription: updated });
  }

  if (
    request.method === "POST" &&
    (pathMatches(path, ["me", "subscriptions", /.+/, "switch"]) ||
      pathMatches(path, ["me", "memberships", /.+/, "switch"]))
  ) {
    const subscriptionId = path[2]!;
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const body = subscriptionSwitchSchema.parse(await readJson(request));
    await assertRateLimit(
      "subscriptionChangeByActor",
      `switch:${subscriptionId}:${userId}`,
      "Too many membership switch attempts.",
    );
    const subscription = await prisma.memberSubscription.findFirst({
      where: { id: subscriptionId, memberUserId: userId },
    });
    if (!subscription) {
      throw notFoundError("Membership not found");
    }
    assertActiveContextOrg(ctx, subscription.orgId);
    const result = await switchSubscriptionPlan({
      request,
      actorUserId: userId,
      subscription,
      planId: body.planId,
      ...(body.effectiveAt ? { effectiveAt: new Date(body.effectiveAt) } : {}),
    });
    return ok(result);
  }

  if (
    request.method === "POST" &&
    (pathMatches(path, ["me", "subscriptions", /.+/, "pause"]) ||
      pathMatches(path, ["me", "memberships", /.+/, "pause"]))
  ) {
    const subscriptionId = path[2]!;
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const body = subscriptionPauseSchema.parse(await readJson(request));
    const subscription = await prisma.memberSubscription.findFirst({
      where: { id: subscriptionId, memberUserId: userId },
    });
    if (!subscription) {
      throw notFoundError("Membership not found");
    }
    assertActiveContextOrg(ctx, subscription.orgId);
    const org = await prisma.organization.findUnique({
      where: { id: subscription.orgId },
      select: { allowSelfServePause: true },
    });
    if (!org?.allowSelfServePause) {
      throw validationError("Contact your gym to pause this membership.");
    }
    return ok(
      await pauseSubscription({
        request,
        actorUserId: userId,
        subscription,
        resumesAt: new Date(body.resumesAt),
        ...(body.reason ? { reason: body.reason } : {}),
      }),
    );
  }

  if (
    request.method === "POST" &&
    (pathMatches(path, ["me", "subscriptions", /.+/, "resume"]) ||
      pathMatches(path, ["me", "memberships", /.+/, "resume"]))
  ) {
    const subscriptionId = path[2]!;
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const subscription = await prisma.memberSubscription.findFirst({
      where: { id: subscriptionId, memberUserId: userId },
    });
    if (!subscription) {
      throw notFoundError("Membership not found");
    }
    assertActiveContextOrg(ctx, subscription.orgId);
    return ok(await resumeSubscription({ request, actorUserId: userId, subscription }));
  }

  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "subscriptions", /.+/, "switch"])
  ) {
    const orgId = path[1]!;
    const subscriptionId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "MEMBERSHIP_SUBSCRIPTION_MANAGE");
    await assertRateLimit(
      "subscriptionChangeByActor",
      `org-switch:${orgId}:${subscriptionId}:${userId}`,
      "Too many membership switch attempts.",
    );
    const body = subscriptionSwitchSchema.parse(await readJson(request));
    const subscription = await prisma.memberSubscription.findFirst({
      where: { id: subscriptionId, orgId },
    });
    if (!subscription) {
      throw notFoundError("Membership not found");
    }
    await assertBranchAccessForContext(ctx, orgId, subscription.branchId);
    return ok(
      await switchSubscriptionPlan({
        request,
        actorUserId: userId,
        subscription,
        planId: body.planId,
        ...(body.effectiveAt ? { effectiveAt: new Date(body.effectiveAt) } : {}),
      }),
    );
  }

  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "subscriptions", /.+/, "pause"])
  ) {
    const orgId = path[1]!;
    const subscriptionId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "MEMBERSHIP_SUBSCRIPTION_MANAGE");
    const body = subscriptionPauseSchema.parse(await readJson(request));
    const subscription = await prisma.memberSubscription.findFirst({
      where: { id: subscriptionId, orgId },
    });
    if (!subscription) {
      throw notFoundError("Membership not found");
    }
    await assertBranchAccessForContext(ctx, orgId, subscription.branchId);
    return ok(
      await pauseSubscription({
        request,
        actorUserId: userId,
        subscription,
        resumesAt: new Date(body.resumesAt),
        ...(body.reason ? { reason: body.reason } : {}),
      }),
    );
  }

  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "subscriptions", /.+/, "resume"])
  ) {
    const orgId = path[1]!;
    const subscriptionId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "MEMBERSHIP_SUBSCRIPTION_MANAGE");
    const subscription = await prisma.memberSubscription.findFirst({
      where: { id: subscriptionId, orgId },
    });
    if (!subscription) {
      throw notFoundError("Membership not found");
    }
    await assertBranchAccessForContext(ctx, orgId, subscription.branchId);
    return ok(await resumeSubscription({ request, actorUserId: userId, subscription }));
  }

  if (request.method === "DELETE" && pathMatches(path, ["me", "memberships", /.+/, "autopay"])) {
    const subscriptionId = path[2]!;
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    await assertRateLimit(
      "subscriptionChangeByActor",
      `autopay-cancel:${subscriptionId}:${userId}`,
      "Too many autopay cancellation attempts.",
    );
    const currentSubscription = await prisma.memberSubscription.findFirst({
      where: { id: subscriptionId, memberUserId: userId },
    });
    if (!currentSubscription) {
      throw notFoundError("Membership not found");
    }
    const orgId = currentSubscription.orgId;
    assertActiveContextOrg(ctx, orgId);
    const mandate = await prisma.paymentMandate.findFirst({
      where: {
        orgId,
        userId,
        status: { in: liveMandateStatuses },
        OR: [{ sourceSubscriptionId: subscriptionId }, { latestSubscriptionId: subscriptionId }],
      },
      orderBy: { createdAt: "desc" },
    });
    if (!mandate) {
      throw notFoundError("Autopay mandate not found");
    }
    const provider = getPaymentProviderOrThrow();
    let nextStatus: PaymentMandateStatus = "CANCELLED";
    if (mandate.providerMandateId && mandate.provider === provider.providerName) {
      const cancellation = await provider.cancelMandate({
        mandateId: mandate.providerMandateId,
        reason: "member_requested",
        cancelAtCycleEnd: false,
      });
      nextStatus = providerMandateStatusToLocal(cancellation.status);
    }
    const updated = await prisma.paymentMandate.update({
      where: { id: mandate.id },
      data: {
        status: nextStatus,
        cancelledAt: new Date(),
      },
    });
    return ok({ mandate: updated });
  }
}
