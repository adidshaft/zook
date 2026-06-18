import type { NextRequest } from "next/server";
import { prisma } from "@zook/db";
import { getRequestContext, requireAuth } from "../access";
import { getActiveMembershipData } from "../domains/members";
import { ok } from "../response";
import { pathMatches } from "./core";

export async function handleMemberMemberships(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["me", "membership", "active"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    return ok({ membership: await getActiveMembershipData(userId, ctx.orgId) });
  }

  if (request.method === "GET" && pathMatches(path, ["me", "memberships"])) {
    const userId = requireAuth(await getRequestContext(request));
    const subscriptions = await prisma.memberSubscription.findMany({
      where: { memberUserId: userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const [plans, organizations, payments, mandates] = await Promise.all([
      prisma.membershipPlan.findMany({
        where: { id: { in: subscriptions.map((subscription) => subscription.planId) } },
      }),
      prisma.organization.findMany({
        where: { id: { in: subscriptions.map((subscription) => subscription.orgId) } },
      }),
      prisma.payment.findMany({
        where: { userId },
        orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
        take: 25,
      }),
      prisma.paymentMandate.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);
    return ok({
      subscriptions: subscriptions.map((subscription) => ({
        ...subscription,
        plan: plans.find((plan) => plan.id === subscription.planId) ?? null,
        organization:
          organizations.find((organization) => organization.id === subscription.orgId) ?? null,
        autopay:
          mandates.find(
            (mandate) =>
              mandate.sourceSubscriptionId === subscription.id ||
              mandate.latestSubscriptionId === subscription.id,
          ) ?? null,
      })),
      payments,
      autopayMandates: mandates,
    });
  }
}
