import { prisma } from "@zook/db";
import type { DashboardBranchFilter } from "@/server/domains/shared/filters";
import { startOfToday } from "@/server/domains/shared/date";
import { serializeUserForReadModel } from "@/server/domains/shared/read-serialization";

function entryCodeForAttendanceId(id: string) {
  let total = 0;
  for (let index = 0; index < id.length; index += 1) {
    total = (total * 31 + id.charCodeAt(index)) % 1000000;
  }
  return total.toString().padStart(6, "0");
}

async function enrichAttendanceRecords(
  records: Awaited<ReturnType<typeof prisma.attendanceRecord.findMany>>,
  orgId: string,
) {
  const subscriptionIds = records
    .map((record) => record.subscriptionId)
    .filter((id): id is string => Boolean(id));
  const [users, profiles, subscriptions] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: records.map((record) => record.userId) } } }),
    prisma.memberProfile.findMany({
      where: { orgId, userId: { in: records.map((record) => record.userId) } },
    }),
    subscriptionIds.length
      ? prisma.memberSubscription.findMany({ where: { id: { in: subscriptionIds } } })
      : Promise.resolve([]),
  ]);
  const plans = subscriptions.length
    ? await prisma.membershipPlan.findMany({
        where: { id: { in: subscriptions.map((subscription) => subscription.planId) } },
      })
    : [];
  const usersById = new Map(users.map((user) => [user.id, user]));
  const profilesByUserId = new Map(profiles.map((profile) => [profile.userId, profile]));
  const subscriptionsById = new Map(
    subscriptions.map((subscription) => [subscription.id, subscription]),
  );
  const plansById = new Map(plans.map((plan) => [plan.id, plan]));

  return records.map((record) => {
    const subscription = record.subscriptionId
      ? (subscriptionsById.get(record.subscriptionId) ?? null)
      : null;
    return {
      ...record,
      entryCode: entryCodeForAttendanceId(record.id),
      user: serializeUserForReadModel(usersById.get(record.userId) ?? null),
      profile: profilesByUserId.get(record.userId) ?? null,
      subscription,
      plan: subscription ? (plansById.get(subscription.planId) ?? null) : null,
    };
  });
}

export async function getOrganizationAttendanceToday(
  orgId: string,
  filters: DashboardBranchFilter = {},
) {
  const today = startOfToday();
  const records = await prisma.attendanceRecord.findMany({
    where: {
      orgId,
      checkedInAt: { gte: today },
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
    },
    take: 100,
    orderBy: { checkedInAt: "desc" },
  });
  return enrichAttendanceRecords(records, orgId);
}

export async function getOrganizationPendingAttendance(
  orgId: string,
  filters: DashboardBranchFilter = {},
) {
  const records = await prisma.attendanceRecord.findMany({
    where: {
      orgId,
      status: { in: ["PENDING_APPROVAL", "FLAGGED"] },
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
    },
    take: 100,
    orderBy: { checkedInAt: "desc" },
  });
  return enrichAttendanceRecords(records, orgId);
}
