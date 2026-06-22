import type { NextRequest } from "next/server";
import { Prisma, prisma, type RewardLedgerEntry } from "@zook/db";
import { z } from "zod";

import { getRequestContext, requireAuth, requirePlatformAdmin } from "../access";
import { writeAuditLog } from "../audit";
import { conflictError, forbiddenError, notFoundError, validationError } from "../errors";
import { ok, readJson } from "../response";
import { clean, pathMatches, platformReferralPolicySchema } from "./core";

const withdrawalRequestSchema = z.object({
  amountPaise: z.number().int().positive().max(10_000_000),
});

const withdrawalMarkPaidSchema = z.object({
  method: z.string().trim().min(2).max(80),
  note: z.string().trim().max(500).optional(),
  proofFileAssetId: z.string().optional(),
});

function rewardLabel(entry: RewardLedgerEntry) {
  if (entry.kind === "GYM_TO_ZOOK_CASH") return "Gym referral reward";
  if (entry.kind === "MEMBER_TO_GYM_CASH") return "Member referral reward";
  if (entry.kind === "GYM_TO_ZOOK_DAYS") return "Gym referral days";
  return "Membership referral days";
}

function sumPaise(entries: RewardLedgerEntry[], statuses: RewardLedgerEntry["status"][]) {
  const statusSet = new Set(statuses);
  return entries.reduce((total, entry) => (statusSet.has(entry.status) ? total + entry.amountPaise : total), 0);
}

async function getPlatformReferralPolicy() {
  const setting = await prisma.platformSetting.findUnique({
    where: { key: "platform.referralPolicy" },
  });
  return platformReferralPolicySchema.parse(setting?.value ?? {});
}

async function getRequestedWithdrawalTotal(userId: string) {
  const aggregate = await prisma.rewardWithdrawal.aggregate({
    where: { userId, status: "REQUESTED" },
    _sum: { amountPaise: true },
  });
  return aggregate._sum.amountPaise ?? 0;
}

async function ensureUserWallet(userId: string) {
  return prisma.userRewardWallet.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

function resolveRole(ctxRoles: string[], requestedRole?: string | null) {
  if (requestedRole && ctxRoles.includes(requestedRole)) return requestedRole;
  return ctxRoles[0] ?? "MEMBER";
}

async function ensureGymReferralCode(input: { userId: string; orgId: string; role: string }) {
  const existing = await prisma.referralCode.findFirst({
    where: { orgId: input.orgId, referrerUserId: input.userId, createdByRole: input.role as never, status: "active" },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  const base = `ZG${input.userId.slice(-6)}`.toUpperCase();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = attempt === 0 ? base : `${base}${attempt}`;
    try {
      return await prisma.referralCode.create({
        data: {
          orgId: input.orgId,
          referrerUserId: input.userId,
          code,
          createdByRole: input.role as never,
          displayName: "Refer a gym",
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }
      throw error;
    }
  }
  throw conflictError("Could not reserve a referral code. Try again.");
}

export async function handleRewards(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["me", "rewards", "wallet"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const [wallet, entries, requestedPaise, orgs, users] = await Promise.all([
      ensureUserWallet(userId),
      prisma.rewardLedgerEntry.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      getRequestedWithdrawalTotal(userId),
      prisma.organization.findMany({
        where: {
          id: {
            in: Array.from(
              new Set(
                (
                  await prisma.rewardLedgerEntry.findMany({
                    where: { userId, referredOrgId: { not: null } },
                    select: { referredOrgId: true },
                  })
                )
                  .map((entry) => entry.referredOrgId)
                  .filter((id): id is string => Boolean(id)),
              ),
            ),
          },
        },
        select: { id: true, name: true },
      }),
      prisma.user.findMany({
        where: {
          id: {
            in: Array.from(
              new Set(
                (
                  await prisma.rewardLedgerEntry.findMany({
                    where: { userId, referredUserId: { not: null } },
                    select: { referredUserId: true },
                  })
                )
                  .map((entry) => entry.referredUserId)
                  .filter((id): id is string => Boolean(id)),
              ),
            ),
          },
        },
        select: { id: true, name: true },
      }),
    ]);
    const orgNames = new Map(orgs.map((org) => [org.id, org.name]));
    const userNames = new Map(users.map((user) => [user.id, user.name]));
    const payablePaise = Math.max(0, sumPaise(entries, ["PAYABLE"]) - requestedPaise);
    return ok({
      balancePaise: wallet.balancePaise || payablePaise,
      pendingPaise: sumPaise(entries, ["PENDING", "QUALIFIED"]),
      payablePaise,
      lifetimePaise: sumPaise(entries, ["PAYABLE", "PAID"]),
      currency: wallet.currency,
      entries: entries.map((entry) => ({
        id: entry.id,
        kind: entry.kind,
        label: rewardLabel(entry),
        amountPaise: entry.amountPaise,
        status: entry.status,
        createdAt: entry.createdAt,
        referredName:
          (entry.referredOrgId ? orgNames.get(entry.referredOrgId) : null) ??
          (entry.referredUserId ? userNames.get(entry.referredUserId) : null) ??
          null,
      })),
    });
  }

  if (request.method === "POST" && pathMatches(path, ["me", "rewards", "withdrawals"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const body = withdrawalRequestSchema.parse(await readJson(request));
    const [policy, entries, requestedPaise] = await Promise.all([
      getPlatformReferralPolicy(),
      prisma.rewardLedgerEntry.findMany({ where: { userId } }),
      getRequestedWithdrawalTotal(userId),
    ]);
    const payablePaise = Math.max(0, sumPaise(entries, ["PAYABLE"]) - requestedPaise);
    if (body.amountPaise < policy.minWithdrawalPaise) {
      throw validationError(`Minimum withdrawal is ₹${Math.round(policy.minWithdrawalPaise / 100)}.`);
    }
    if (body.amountPaise > payablePaise) {
      throw validationError("Withdrawal exceeds your payable reward balance.");
    }
    const withdrawal = await prisma.rewardWithdrawal.create({
      data: { userId, amountPaise: body.amountPaise },
    });
    await writeAuditLog({
      request,
      actorUserId: userId,
      action: "reward.withdrawal_requested",
      entityType: "reward_withdrawal",
      entityId: withdrawal.id,
      riskLevel: "HIGH",
      metadata: { amountPaise: withdrawal.amountPaise },
    });
    return ok({ withdrawal });
  }

  if (request.method === "GET" && pathMatches(path, ["me", "rewards", "gym-referral"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const orgId = ctx.orgId;
    if (!orgId) {
      throw forbiddenError("Select a gym before sharing a gym referral.");
    }
    const role = resolveRole(ctx.roles, request.nextUrl.searchParams.get("role"));
    const [policy, code] = await Promise.all([
      getPlatformReferralPolicy(),
      ensureGymReferralCode({ userId, orgId, role }),
    ]);
    const ownerReward = role === "OWNER";
    return ok({
      code: code.code,
      shareUrl: `https://zookfit.in/r/${encodeURIComponent(code.code)}`,
      qualifyingCycles: policy.qualifyingCycles,
      ...(ownerReward
        ? { rewardDays: policy.ownerRewardDays }
        : { rewardPaise: policy.nonOwnerYearlyRewardPaise }),
      terms: ownerReward
        ? `${policy.ownerRewardDays} Zook subscription days when a referred gym upgrades.`
        : `Cash rewards qualify when a referred gym buys ${policy.qualifyingCycles.join(" or ")}.`,
    });
  }

  if (request.method === "GET" && pathMatches(path, ["platform", "rewards", "withdrawals"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    const withdrawals = await prisma.rewardWithdrawal.findMany({
      orderBy: { requestedAt: "desc" },
      take: 100,
    });
    const users = withdrawals.length
      ? await prisma.user.findMany({
          where: { id: { in: Array.from(new Set(withdrawals.map((item) => item.userId))) } },
          select: { id: true, name: true, email: true },
        })
      : [];
    return ok({
      withdrawals: withdrawals.map((withdrawal) => ({
        ...withdrawal,
        user: users.find((user) => user.id === withdrawal.userId) ?? null,
      })),
    });
  }

  if (
    request.method === "POST" &&
    pathMatches(path, ["platform", "rewards", "withdrawals", /.+/, "mark-paid"])
  ) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    const withdrawalId = path[3]!;
    const body = withdrawalMarkPaidSchema.parse(await readJson(request));
    const paidAt = new Date();
    const withdrawal = await prisma.$transaction(async (tx) => {
      const current = await tx.rewardWithdrawal.findUnique({ where: { id: withdrawalId } });
      if (!current) throw notFoundError("Withdrawal not found");
      if (current.status !== "REQUESTED") throw conflictError("Withdrawal is not pending review.");
      const payableEntries = await tx.rewardLedgerEntry.findMany({
        where: { userId: current.userId, status: "PAYABLE" },
        orderBy: { payableAt: "asc" },
      });
      let remaining = current.amountPaise;
      const paidEntryIds: string[] = [];
      for (const entry of payableEntries) {
        if (remaining <= 0) break;
        paidEntryIds.push(entry.id);
        remaining -= entry.amountPaise;
      }
      if (remaining > 0) {
        throw validationError("Not enough payable reward balance for this withdrawal.");
      }
      await tx.rewardLedgerEntry.updateMany({
        where: { id: { in: paidEntryIds } },
        data: { status: "PAID", paidAt, payoutId: current.id },
      });
      await tx.userRewardWallet.upsert({
        where: { userId: current.userId },
        create: { userId: current.userId, balancePaise: 0 },
        update: { balancePaise: { decrement: current.amountPaise } },
      });
      return tx.rewardWithdrawal.update({
        where: { id: current.id },
        data: clean({
          status: "PAID",
          reviewedById: actorUserId,
          reviewedAt: paidAt,
          paidAt,
          paidMethod: body.method,
          paidNote: body.note,
          proofFileAssetId: body.proofFileAssetId,
        }),
      });
    });
    await writeAuditLog({
      request,
      actorUserId,
      action: "reward.withdrawal_paid",
      entityType: "reward_withdrawal",
      entityId: withdrawal.id,
      riskLevel: "HIGH",
      metadata: { amountPaise: withdrawal.amountPaise, method: body.method },
    });
    return ok({ withdrawal });
  }

  return undefined;
}
