import { publicUserEmail } from "@zook/core";
import { prisma } from "@zook/db";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getRequestContext, requireOrgPermission } from "../access";
import { writeAuditLog } from "../audit";
import { forbiddenError, notFoundError } from "../errors";
import { assertRateLimit } from "../rate-limit";
import { ok } from "../response";
import {
  assertBranchAccessForContext,
  attendanceWithEntryCode,
  pageResult,
  parseCursorPagination,
  pathMatches,
  queryBranchId,
  serializeUserForClient,
} from "./core";

const orgMemberDetailParamsSchema = z.object({
  orgId: z.string().trim().min(1),
  memberUserId: z.string().trim().min(1),
});

function appendToMapList<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const existing = map.get(key);
  if (existing) {
    existing.push(value);
  } else {
    map.set(key, [value]);
  }
}

async function listOrganizationMembersPage(orgId: string, request: NextRequest, branchId?: string) {
  const { limit, cursor } = parseCursorPagination(request, 50, 100);
  const scopedUserIds = branchId
    ? await (async () => {
        const [branchSubscriptions, orgSubscriptions] = await Promise.all([
          prisma.memberSubscription.findMany({
            where: { orgId, branchId },
            select: { memberUserId: true },
            distinct: ["memberUserId"],
          }),
          prisma.memberSubscription.findMany({
            where: { orgId },
            select: { memberUserId: true },
            distinct: ["memberUserId"],
          }),
        ]);
        const memberIdsWithAnySubscription = new Set(
          orgSubscriptions.map((subscription) => subscription.memberUserId),
        );
        const noSubscriptionProfiles = await prisma.memberProfile.findMany({
          where: {
            orgId,
            ...(memberIdsWithAnySubscription.size
              ? { userId: { notIn: Array.from(memberIdsWithAnySubscription) } }
              : {}),
          },
          select: { userId: true },
        });
        return Array.from(
          new Set([
            ...branchSubscriptions.map((subscription) => subscription.memberUserId),
            ...noSubscriptionProfiles.map((profile) => profile.userId),
          ]),
        );
      })()
    : undefined;
  const profiles = await prisma.memberProfile.findMany({
    where: { orgId, ...(scopedUserIds ? { userId: { in: scopedUserIds } } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    select: {
      id: true,
      orgId: true,
      userId: true,
      profilePhotoUrl: true,
      marketingOptIn: true,
      publicVisibility: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
    },
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const page = pageResult(profiles, limit);
  const memberUserIds = page.items.map((profile) => profile.userId);
  const [users, subscriptions, recentAttendance, activeAttendance, payments] = await Promise.all([
    memberUserIds.length
      ? prisma.user.findMany({
          where: { id: { in: memberUserIds } },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            slug: true,
            dateOfBirth: true,
            profilePhotoUrl: true,
            fitnessGoal: true,
            marketingOptIn: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
    prisma.memberSubscription.findMany({
      where: { orgId, memberUserId: { in: memberUserIds } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orgId: true,
        branchId: true,
        memberUserId: true,
        planId: true,
        status: true,
        startsAt: true,
        endsAt: true,
        remainingVisits: true,
        paymentId: true,
        pausedAt: true,
        resumesAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.attendanceRecord.findMany({
      where: { orgId, userId: { in: memberUserIds } },
      orderBy: { checkedInAt: "desc" },
      select: {
        id: true,
        orgId: true,
        branchId: true,
        userId: true,
        subscriptionId: true,
        status: true,
        source: true,
        dateKey: true,
        checkedInAt: true,
        checkedOutAt: true,
        checkoutReason: true,
        durationSeconds: true,
        suspiciousFlags: true,
        createdAt: true,
      },
      take: Math.max(memberUserIds.length * 3, 20),
    }),
    prisma.attendanceRecord.findMany({
      where: {
        orgId,
        userId: { in: memberUserIds },
        checkedOutAt: null,
        status: { in: ["APPROVED", "PENDING_APPROVAL", "FLAGGED"] },
      },
      orderBy: { checkedInAt: "desc" },
      select: {
        id: true,
        orgId: true,
        branchId: true,
        userId: true,
        subscriptionId: true,
        status: true,
        source: true,
        dateKey: true,
        checkedInAt: true,
        checkedOutAt: true,
        checkoutReason: true,
        durationSeconds: true,
        suspiciousFlags: true,
        createdAt: true,
      },
    }),
    prisma.payment.findMany({
      where: { orgId, userId: { in: memberUserIds } },
      orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        orgId: true,
        branchId: true,
        userId: true,
        purpose: true,
        amountPaise: true,
        currency: true,
        status: true,
        mode: true,
        provider: true,
        providerRef: true,
        receiptNumber: true,
        recordedAt: true,
        createdAt: true,
      },
      take: Math.max(memberUserIds.length * 3, 20),
    }),
  ]);
  const attendanceById = new Map(
    [...activeAttendance, ...recentAttendance].map((record) => [record.id, record]),
  );
  const attendance = Array.from(attendanceById.values()).sort(
    (left, right) => right.checkedInAt.getTime() - left.checkedInAt.getTime(),
  );
  const usersById = new Map(users.map((user) => [user.id, user]));
  const branchIds = Array.from(new Set(attendance.map((record) => record.branchId)));
  const branches = branchIds.length
    ? await prisma.branch.findMany({
        where: { id: { in: branchIds } },
        select: { id: true, name: true },
      })
    : [];
  const branchNamesById = new Map(branches.map((branch) => [branch.id, branch.name]));
  const planIds = Array.from(new Set(subscriptions.map((subscription) => subscription.planId)));
  const plans = planIds.length
    ? await prisma.membershipPlan.findMany({
        where: { orgId, id: { in: planIds } },
        select: { id: true, name: true, type: true },
      })
    : [];
  const plansById = new Map(plans.map((plan) => [plan.id, plan]));
  const subscriptionsByUserId = new Map<string, typeof subscriptions>();
  for (const subscription of subscriptions) {
    appendToMapList(subscriptionsByUserId, subscription.memberUserId, subscription);
  }
  const attendanceByUserId = new Map<string, typeof attendance>();
  for (const record of attendance) {
    appendToMapList(attendanceByUserId, record.userId, record);
  }
  const paymentsByUserId = new Map<string, typeof payments>();
  for (const payment of payments) {
    if (payment.userId) appendToMapList(paymentsByUserId, payment.userId, payment);
  }
  return {
    members: page.items.map((profile) => {
      const user = usersById.get(profile.userId) ?? null;
      const userSubscriptions = subscriptionsByUserId.get(profile.userId) ?? [];
      const userAttendance = attendanceByUserId.get(profile.userId) ?? [];
      const activeSubscription =
        userSubscriptions.find(
          (subscription) =>
            subscription.memberUserId === profile.userId && subscription.status === "ACTIVE",
        ) ??
        userSubscriptions[0] ??
        null;
      return {
        profile,
        user: user ? serializeUserForClient(user) : null,
        activeCheckIn:
          userAttendance
            .filter(
              (record) =>
                record.userId === profile.userId &&
                !record.checkedOutAt &&
                ["APPROVED", "PENDING_APPROVAL", "FLAGGED"].includes(record.status),
            )
            .map(attendanceWithEntryCode)
            .map((record) => ({
              ...record,
              branchName: branchNamesById.get(record.branchId) ?? null,
            }))[0] ?? null,
        lastCheckIn:
          userAttendance
            .map(attendanceWithEntryCode)
            .map((record) => ({
              ...record,
              branchName: branchNamesById.get(record.branchId) ?? null,
            }))[0] ?? null,
        recentCheckIns: userAttendance
          .slice(0, 3)
          .map(attendanceWithEntryCode)
          .map((record) => ({
            ...record,
            branchName: branchNamesById.get(record.branchId) ?? null,
          })),
        lastPayment: paymentsByUserId.get(profile.userId)?.[0] ?? null,
        activeSubscription: activeSubscription
          ? { ...activeSubscription, plan: plansById.get(activeSubscription.planId) ?? null }
          : null,
      };
    }),
    nextCursor: page.nextCursor,
    limit,
  };
}

export async function handleOrganizationMembers(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "members"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "MEMBERS_VIEW");
    await assertRateLimit(
      "memberListByActor",
      `${orgId}:${userId}`,
      "Too many member list requests. Please wait before trying again.",
    );
    const branchId = await assertBranchAccessForContext(ctx, orgId, queryBranchId(request));
    const page = await listOrganizationMembersPage(orgId, request, branchId);
    if (page.members.length >= 75 || page.nextCursor) {
      await writeAuditLog({
        request,
        orgId,
        actorUserId: userId,
        action: "member.list.large_read",
        entityType: "member_profile",
        metadata: { count: page.members.length, hasMore: Boolean(page.nextCursor), branchId },
      });
    }
    return ok({
      members: page.members,
      nextCursor: page.nextCursor,
      limit: page.limit,
    });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "members", /.+/])) {
    const { orgId, memberUserId } = orgMemberDetailParamsSchema.parse({
      orgId: path[1],
      memberUserId: path[3],
    });
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "MEMBERS_VIEW");
    const branchId = await assertBranchAccessForContext(ctx, orgId, queryBranchId(request));
    const membership = await prisma.organizationUser.findFirst({
      where: { orgId, userId: memberUserId, status: "active" },
    });
    if (!membership) {
      throw notFoundError("Member not found");
    }
    if (branchId) {
      const subscriptionsForMember = await prisma.memberSubscription.findMany({
        where: { orgId, memberUserId },
        select: { branchId: true },
      });
      const hasSubscriptionInBranch = subscriptionsForMember.some(
        (subscription) => subscription.branchId === branchId,
      );
      if (subscriptionsForMember.length > 0 && !hasSubscriptionInBranch) {
        throw forbiddenError("This member belongs to another branch.");
      }
    }
    const [user, profile, subscriptions, payments, attendance, bodyProgress, workouts] =
      await Promise.all([
        prisma.user.findUnique({ where: { id: memberUserId } }),
        prisma.memberProfile.findUnique({
          where: { orgId_userId: { orgId, userId: memberUserId } },
        }),
        prisma.memberSubscription.findMany({
          where: { orgId, memberUserId },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
        prisma.payment.findMany({
          where: { orgId, userId: memberUserId },
          orderBy: { recordedAt: "desc" },
          take: 10,
        }),
        prisma.attendanceRecord.findMany({
          where: { orgId, userId: memberUserId },
          orderBy: { checkedInAt: "desc" },
          take: 20,
        }),
        prisma.bodyProgressEntry.findMany({
          where: { organizationId: orgId, userId: memberUserId },
          orderBy: { measuredAt: "desc" },
          take: 12,
        }),
        prisma.workoutSession.findMany({
          where: { organizationId: orgId, userId: memberUserId, visibility: "TRAINER_VISIBLE" },
          orderBy: { startedAt: "desc" },
          take: 10,
        }),
      ]);
    const plans = await prisma.membershipPlan.findMany({
      where: { id: { in: subscriptions.map((subscription) => subscription.planId) } },
    });
    return ok({
      member: {
        user: user ? { ...user, email: publicUserEmail(user.email) ?? "" } : null,
        profile,
        subscriptions: subscriptions.map((subscription) => ({
          ...subscription,
          plan: plans.find((plan) => plan.id === subscription.planId) ?? null,
        })),
        activeSubscription:
          subscriptions.find((subscription) => subscription.status === "ACTIVE") ??
          subscriptions[0] ??
          null,
        lastCheckIn: attendance[0] ?? null,
        recentCheckIns: attendance.slice(0, 3),
        lastPayment: payments[0] ?? null,
        payments,
        attendance,
        bodyProgress,
        workouts,
      },
    });
  }
  return undefined;
}
