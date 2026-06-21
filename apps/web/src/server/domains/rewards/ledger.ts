import { Prisma, prisma, type SaaSBillingCycle } from "@zook/db";
import { platformReferralPolicySchema } from "../../api-router/core";

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

async function getPlatformReferralPolicy() {
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
