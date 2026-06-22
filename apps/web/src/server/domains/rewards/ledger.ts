import { Prisma, prisma, type SaaSBillingCycle } from "@zook/db";
import { platformReferralPolicySchema } from "../../api-router/core";

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export async function getPlatformReferralPolicy() {
  const setting = await prisma.platformSetting.findUnique({
    where: { key: "platform.referralPolicy" },
  });
  return platformReferralPolicySchema.parse(setting?.value ?? {});
}

export async function qualifyPlatformGymReferral(input: {
  referredOrgId: string;
  billingCycle: SaaSBillingCycle;
  paymentId?: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const partnership = await prisma.orgReferralPartnership.findFirst({
    where: { targetOrgId: input.referredOrgId, status: { in: ["pending", "active"] } },
    orderBy: { createdAt: "asc" },
  });
  if (!partnership) return null;

  const policy = await getPlatformReferralPolicy();
  if (!policy.enabled || !policy.qualifyingCycles.includes(input.billingCycle as never)) {
    return null;
  }

  if (partnership.referrerRole === "OWNER" || !partnership.referrerUserId) {
    const days = policy.ownerRewardDays;
    if (days <= 0) return null;
    const subscription = await prisma.saaSSubscription.findUnique({
      where: { orgId: partnership.sourceOrgId },
    });
    const nextRenewalAt = subscription?.nextRenewalAt
      ? addDays(subscription.nextRenewalAt, days)
      : undefined;
    const updated = await prisma.saaSSubscription.update({
      where: { orgId: partnership.sourceOrgId },
      data: {
        trialExtendedDays: { increment: days },
        ...(nextRenewalAt ? { nextRenewalAt } : {}),
      },
    });
    await prisma.orgReferralPartnership.update({
      where: { id: partnership.id },
      data: {
        status: "qualified",
        referralPolicySnapshot: {
          ...((partnership.referralPolicySnapshot ?? {}) as Record<string, unknown>),
          qualifiedAt: now.toISOString(),
          rewardDays: days,
          billingCycle: input.billingCycle,
          paymentId: input.paymentId,
        } as Prisma.InputJsonValue,
      },
    });
    return { kind: "DAYS" as const, subscription: updated, days };
  }

  const amountPaise =
    input.billingCycle === "YEARLY"
      ? policy.nonOwnerYearlyRewardPaise
      : policy.nonOwnerSemiannualRewardPaise;
  if (amountPaise <= 0) return null;

  const existing = await prisma.rewardLedgerEntry.findUnique({
    where: {
      userId_kind_referredOrgId: {
        userId: partnership.referrerUserId,
        kind: "GYM_TO_ZOOK_CASH",
        referredOrgId: input.referredOrgId,
      },
    },
  });
  if (existing) return { kind: "CASH" as const, entry: existing, idempotent: true };

  // Guardrail: cap how many cash rewards a single referrer can qualify per
  // calendar month so the program can't be farmed.
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const rewardsThisMonth = await prisma.rewardLedgerEntry.count({
    where: {
      userId: partnership.referrerUserId,
      kind: "GYM_TO_ZOOK_CASH",
      status: { not: "REVERSED" },
      createdAt: { gte: monthStart },
    },
  });
  if (rewardsThisMonth >= policy.maxRewardsPerUserPerMonth) {
    return { kind: "CAPPED" as const };
  }

  const payableAt = addDays(now, policy.clawbackWindowDays);
  const status = policy.clawbackWindowDays === 0 ? "PAYABLE" : "QUALIFIED";
  const entry = await prisma.rewardLedgerEntry.create({
    data: {
      userId: partnership.referrerUserId,
      kind: "GYM_TO_ZOOK_CASH",
      source: "PLATFORM",
      referredOrgId: input.referredOrgId,
      amountPaise,
      status,
      qualifiedAt: now,
      payableAt,
      metadata: {
        partnershipId: partnership.id,
        billingCycle: input.billingCycle,
        paymentId: input.paymentId,
      } as Prisma.InputJsonValue,
    },
  });
  await prisma.userRewardWallet.upsert({
    where: { userId: partnership.referrerUserId },
    create: {
      userId: partnership.referrerUserId,
      balancePaise: status === "PAYABLE" ? amountPaise : 0,
    },
    update: status === "PAYABLE" ? { balancePaise: { increment: amountPaise } } : {},
  });
  await prisma.orgReferralPartnership.update({
    where: { id: partnership.id },
    data: {
      status: "qualified",
      referralPolicySnapshot: {
        ...((partnership.referralPolicySnapshot ?? {}) as Record<string, unknown>),
        qualifiedAt: now.toISOString(),
        rewardPaise: amountPaise,
        billingCycle: input.billingCycle,
        paymentId: input.paymentId,
      } as Prisma.InputJsonValue,
    },
  });
  return { kind: "CASH" as const, entry, idempotent: false };
}

/**
 * Whether a cash reward's referred subscription is still in good standing.
 * Used at the end of the clawback window to decide promote-vs-reverse:
 * the referred party must still be a paying customer for the reward to pay out.
 */
async function referredStillQualifies(entry: {
  kind: string;
  referredOrgId: string | null;
  referredUserId: string | null;
  fundingOrgId: string | null;
}) {
  if (entry.kind === "GYM_TO_ZOOK_CASH" && entry.referredOrgId) {
    const sub = await prisma.saaSSubscription.findUnique({
      where: { orgId: entry.referredOrgId },
      select: { status: true, cancelledAt: true },
    });
    // The referred gym must still be a live account (it paid to qualify).
    // Reverse if it was deleted, its trial lapsed without converting, or it
    // cancelled inside the window.
    return (
      Boolean(sub) &&
      sub!.status !== "DELETED" &&
      sub!.status !== "TRIAL_EXPIRED" &&
      !sub!.cancelledAt
    );
  }
  if (entry.kind === "MEMBER_TO_GYM_CASH" && entry.referredUserId && entry.fundingOrgId) {
    const sub = await prisma.memberSubscription.findFirst({
      where: { orgId: entry.fundingOrgId, memberUserId: entry.referredUserId },
      orderBy: { createdAt: "desc" },
      select: { status: true },
    });
    return Boolean(sub) && !["CANCELLED", "REFUNDED", "EXPIRED"].includes(sub!.status);
  }
  return true;
}

/**
 * Settlement pass (run on a schedule): for every cash reward whose clawback
 * window has elapsed, promote it to PAYABLE (and credit the wallet) if the
 * referred subscription is still good, otherwise REVERSE it. This is the single
 * chokepoint for both promotion and clawback — no per-refund hook needed.
 */
export async function settleReadyRewards(now: Date = new Date()) {
  const due = await prisma.rewardLedgerEntry.findMany({
    where: {
      status: "QUALIFIED",
      payableAt: { lte: now },
      kind: { in: ["GYM_TO_ZOOK_CASH", "MEMBER_TO_GYM_CASH"] },
    },
    take: 500,
  });
  let promoted = 0;
  let reversed = 0;
  for (const entry of due) {
    const stillGood = await referredStillQualifies(entry);
    await prisma.$transaction(async (tx) => {
      // Re-read inside the transaction to stay idempotent under concurrent runs.
      const current = await tx.rewardLedgerEntry.findUnique({ where: { id: entry.id } });
      if (!current || current.status !== "QUALIFIED") return;
      if (stillGood) {
        await tx.rewardLedgerEntry.update({
          where: { id: entry.id },
          data: { status: "PAYABLE" },
        });
        await tx.userRewardWallet.upsert({
          where: { userId: entry.userId },
          create: { userId: entry.userId, balancePaise: entry.amountPaise },
          update: { balancePaise: { increment: entry.amountPaise } },
        });
        promoted += 1;
      } else {
        await tx.rewardLedgerEntry.update({
          where: { id: entry.id },
          data: { status: "REVERSED", reversedAt: now },
        });
        reversed += 1;
      }
    });
  }
  return { processed: due.length, promoted, reversed };
}
