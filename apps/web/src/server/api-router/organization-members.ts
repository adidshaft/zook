import { normalizePhoneNumber, publicUserEmail } from "@zook/core";
import { computeSubscriptionWindow } from "@zook/core/services";
import { prisma } from "@zook/db";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getRequestContext, requireAuth, requireOrgPermission } from "../access";
import { writeAuditLog } from "../audit";
import { forbiddenError, notFoundError, validationError } from "../errors";
import { createUniqueMemberSlug } from "../member-slug";
import { assertRateLimit } from "../rate-limit";
import { ok, readJson } from "../response";
import {
  assertBranchAccessForContext,
  attendanceWithEntryCode,
  clean,
  createDirectNotification,
  ensureOrganizationMembership,
  pageResult,
  parseCursorPagination,
  pathMatches,
  queryBranchId,
  resolveOrgBranch,
  serializeUserForClient,
} from "./core";

const orgMemberDetailParamsSchema = z.object({
  orgId: z.string().trim().min(1),
  memberUserId: z.string().trim().min(1),
});

const orgMemberStatusBodySchema = z.object({
  status: z.enum(["active", "inactive"]),
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
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const { limit, cursor } = parseCursorPagination(request, q ? 20 : 50, 100);
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
    where: {
      orgId,
      ...(scopedUserIds ? { userId: { in: scopedUserIds } } : {}),
      ...(q
        ? {
            user: {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { startsWith: q, mode: "insensitive" } },
                { phone: { startsWith: normalizePhoneNumber(q) ?? q } },
              ],
            },
          }
        : {}),
    },
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
  const [users, memberships, subscriptions, recentAttendance, activeAttendance, payments] =
    await Promise.all([
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
              emergencyContact: true,
              profilePhotoUrl: true,
              fitnessGoal: true,
              marketingOptIn: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),
      memberUserIds.length
        ? prisma.organizationUser.findMany({
            where: { orgId, userId: { in: memberUserIds } },
            select: { userId: true, status: true, joinedAt: true, leftAt: true },
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
  const membershipsByUserId = new Map(
    memberships.map((membership) => [membership.userId, membership]),
  );
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
        membership: membershipsByUserId.get(profile.userId) ?? null,
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
          userAttendance.map(attendanceWithEntryCode).map((record) => ({
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
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "members", "import"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireAuth(ctx);
    requireOrgPermission(ctx, orgId, "MEMBERS_MANAGE");
    await assertRateLimit(
      "fileUploadByActor",
      `member-import:${orgId}:${userId}`,
      "Too many import attempts. Try again after a short wait.",
    );
    const body = z
      .object({
        csv: z.string().min(1).max(500_000),
        planId: z.string().optional(),
        sendWelcomeNotification: z.boolean().default(true),
        activateSubscription: z.boolean().default(false),
      })
      .parse(await readJson(request));

    const lines = body.csv
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length < 2) {
      throw validationError("CSV must contain a header row and at least one data row.");
    }
    const headerLine = lines[0]!.toLowerCase();
    const headers = headerLine.split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
    const nameIndex = headers.findIndex(
      (h) => h === "name" || h === "full name" || h === "member name",
    );
    const emailIndex = headers.findIndex((h) => h === "email" || h === "email address");
    const phoneIndex = headers.findIndex(
      (h) => h === "phone" || h === "mobile" || h === "phone number",
    );
    if (nameIndex < 0 || emailIndex < 0) {
      throw validationError("CSV must include 'name' and 'email' columns.");
    }

    const organization = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!organization) {
      throw notFoundError("Gym not found");
    }

    let plan: Awaited<ReturnType<typeof prisma.membershipPlan.findFirst>> | null = null;
    if (body.planId) {
      plan = await prisma.membershipPlan.findFirst({
        where: { id: body.planId, orgId, active: true },
      });
      if (!plan) {
        throw notFoundError("Membership plan not found");
      }
    }

    const dataLines = lines.slice(1);
    const maxRows = 500;
    if (dataLines.length > maxRows) {
      throw validationError(`Import limited to ${maxRows} members at a time.`);
    }

    const results: Array<{
      row: number;
      status: "created" | "existing" | "error";
      email?: string;
      error?: string;
    }> = [];
    const importedUserIds: string[] = [];
    const branch = await resolveOrgBranch(orgId);

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i]!;
      const columns = line.split(",").map((col) => col.trim().replace(/^["']|["']$/g, ""));
      const name = columns[nameIndex]?.trim();
      const email = columns[emailIndex]?.trim().toLowerCase();
      const phone =
        phoneIndex >= 0 ? normalizePhoneNumber(columns[phoneIndex]?.trim() ?? "") : undefined;

      if (!name || !email) {
        results.push({ row: i + 2, status: "error", error: "Missing name or email" });
        continue;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        results.push({ row: i + 2, status: "error", email, error: "Invalid email format" });
        continue;
      }

      try {
        let user = await prisma.user.findUnique({ where: { email } });
        let isNewUser = false;
        if (!user) {
          user = await prisma.user.create({
            data: clean({
              email,
              name,
              slug: await createUniqueMemberSlug(),
              phone: phone || undefined,
              marketingOptIn: true,
            }),
          });
          isNewUser = true;
        }

        await ensureOrganizationMembership({
          orgId,
          userId: user.id,
          marketingOptIn: user.marketingOptIn,
        });

        if (plan && body.activateSubscription) {
          const existingSub = await prisma.memberSubscription.findFirst({
            where: { orgId, memberUserId: user.id, status: { in: ["ACTIVE", "PENDING_PAYMENT"] } },
          });
          if (!existingSub) {
            const window = computeSubscriptionWindow(
              clean({
                id: plan.id,
                orgId: plan.orgId,
                branchId: branch.id,
                name: plan.name,
                type: plan.type,
                pricePaise: plan.pricePaise,
                durationDays: plan.durationDays ?? undefined,
                visitLimit: plan.visitLimit ?? undefined,
                validityDays: plan.validityDays ?? undefined,
                startDate: plan.startDate ?? undefined,
                endDate: plan.endDate ?? undefined,
                active: plan.active,
                publicVisible: plan.publicVisible,
              }),
            );
            await prisma.memberSubscription.create({
              data: clean({
                orgId,
                branchId: branch.id,
                memberUserId: user.id,
                planId: plan.id,
                status: "ACTIVE",
                startsAt: window.startsAt,
                endsAt: window.endsAt,
                remainingVisits: window.remainingVisits,
                activatedById: userId,
                notes: "bulk_import",
              }),
            });
          }
        }

        importedUserIds.push(user.id);
        results.push({ row: i + 2, status: isNewUser ? "created" : "existing", email });
      } catch (error) {
        results.push({
          row: i + 2,
          status: "error",
          email,
          error: error instanceof Error ? error.message : "Unexpected error",
        });
      }
    }

    if (body.sendWelcomeNotification && importedUserIds.length > 0) {
      await createDirectNotification({
        orgId,
        createdById: userId,
        type: "TRANSACTIONAL",
        title: `Welcome to ${organization.name}`,
        body: "You have been added as a member. Open Zook to check your membership details.",
        audience: "selected_members",
        userIds: importedUserIds,
      });
    }

    const created = results.filter((r) => r.status === "created").length;
    const existing = results.filter((r) => r.status === "existing").length;
    const errors = results.filter((r) => r.status === "error").length;

    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "members.bulk_imported",
      entityType: "organization",
      entityId: orgId,
      metadata: { totalRows: dataLines.length, created, existing, errors },
    });

    return ok({ results, summary: { total: dataLines.length, created, existing, errors } });
  }

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

  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "members", /.+/, "status"])) {
    const { orgId, memberUserId } = orgMemberDetailParamsSchema.parse({
      orgId: path[1],
      memberUserId: path[3],
    });
    const body = orgMemberStatusBodySchema.parse(await readJson(request));
    const ctx = await getRequestContext(request, { orgId });
    const actorUserId = requireOrgPermission(ctx, orgId, "MEMBERS_MANAGE");
    const existing = await prisma.organizationUser.findUnique({
      where: { orgId_userId: { orgId, userId: memberUserId } },
    });
    if (!existing) {
      throw notFoundError("Member not found");
    }

    const membership = await prisma.organizationUser.update({
      where: { orgId_userId: { orgId, userId: memberUserId } },
      data:
        body.status === "active"
          ? { status: "active", leftAt: null }
          : { status: "inactive", leftAt: new Date() },
      select: { userId: true, status: true, joinedAt: true, leftAt: true },
    });

    await writeAuditLog({
      request,
      orgId,
      actorUserId,
      action: body.status === "active" ? "member.reactivated" : "member.deactivated",
      entityType: "organization_user",
      entityId: memberUserId,
      metadata: { previousStatus: existing.status, nextStatus: body.status },
    });

    return ok({ membership });
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
