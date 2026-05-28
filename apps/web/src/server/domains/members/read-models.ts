import { prisma } from "@zook/db";
import { addDays, daysUntil, toDateKey } from "@/server/domains/shared/date";
import {
  serializeOrganizationForReadModel,
  serializeUserForReadModel,
} from "@/server/domains/shared/read-serialization";

export async function getOrganizationMembers(orgId: string) {
  const profiles = await prisma.memberProfile.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const memberUserIds = profiles.map((profile) => profile.userId);
  const [users, subscriptions, attendance, payments, trainerAssignments] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: memberUserIds } },
    }),
    prisma.memberSubscription.findMany({
      where: { orgId, memberUserId: { in: memberUserIds } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.attendanceRecord.findMany({
      where: { orgId, userId: { in: memberUserIds } },
      orderBy: { checkedInAt: "desc" },
      take: Math.max(memberUserIds.length * 3, 20),
    }),
    prisma.payment.findMany({
      where: { orgId, userId: { in: memberUserIds } },
      orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
      take: Math.max(memberUserIds.length * 3, 20),
    }),
    prisma.trainerAssignment.findMany({
      where: { orgId, memberUserId: { in: memberUserIds }, active: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const usersById = new Map(users.map((user) => [user.id, user]));
  const trainerIds = Array.from(
    new Set(trainerAssignments.map((assignment) => assignment.trainerUserId)),
  );
  const trainers = trainerIds.length
    ? await prisma.user.findMany({ where: { id: { in: trainerIds } } })
    : [];
  const trainersById = new Map(trainers.map((trainer) => [trainer.id, trainer]));

  return profiles.map((profile) => ({
    profile,
    user: serializeUserForReadModel(usersById.get(profile.userId) ?? null),
    lastCheckIn: attendance.find((record) => record.userId === profile.userId) ?? null,
    recentCheckIns: attendance.filter((record) => record.userId === profile.userId).slice(0, 3),
    lastPayment: payments.find((payment) => payment.userId === profile.userId) ?? null,
    activeSubscription:
      subscriptions.find(
        (subscription) =>
          subscription.memberUserId === profile.userId && subscription.status === "ACTIVE",
      ) ??
      subscriptions.find((subscription) => subscription.memberUserId === profile.userId) ??
      null,
    assignedTrainer:
      trainerAssignments
        .filter((assignment) => assignment.memberUserId === profile.userId)
        .map((assignment) =>
          serializeUserForReadModel(trainersById.get(assignment.trainerUserId) ?? null),
        )
        .find(Boolean) ?? null,
  }));
}

export async function getMemberHomeData(userId: string, preferredOrgId?: string) {
  const subscription =
    (preferredOrgId
      ? await prisma.memberSubscription.findFirst({
          where: { memberUserId: userId, orgId: preferredOrgId, status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
        })
      : await prisma.memberSubscription.findFirst({
          where: { memberUserId: userId, status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
        })) ?? null;

  const activeOrgId = preferredOrgId ?? subscription?.orgId ?? undefined;

  const [
    organization,
    plan,
    recentAttendance,
    streakAttendance,
    notificationsUnread,
    goalsCount,
    plansCount,
    todayPlanAssignment,
  ] = await Promise.all([
    activeOrgId
      ? prisma.organization.findUnique({ where: { id: activeOrgId } })
      : Promise.resolve(null),
    subscription
      ? prisma.membershipPlan.findUnique({
          where: { id: subscription.planId },
          select: {
            id: true,
            name: true,
            type: true,
            durationDays: true,
            visitLimit: true,
            validityDays: true,
          },
        })
      : Promise.resolve(null),
    prisma.attendanceRecord.findMany({
      where: { userId, ...(activeOrgId ? { orgId: activeOrgId } : {}) },
      orderBy: { checkedInAt: "desc" },
      select: { id: true, checkedInAt: true, status: true, source: true, dateKey: true },
      take: 12,
    }),
    prisma.attendanceRecord.findMany({
      where: { userId, status: "APPROVED", ...(activeOrgId ? { orgId: activeOrgId } : {}) },
      orderBy: { checkedInAt: "desc" },
      select: { dateKey: true },
      take: 366,
    }),
    prisma.notificationRecipient.count({ where: { userId, readAt: null } }),
    prisma.userGoal.count({ where: { userId, active: true } }),
    prisma.planAssignment.count({ where: { assignedToUserId: userId, active: true } }),
    prisma.planAssignment.findFirst({
      where: {
        assignedToUserId: userId,
        active: true,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, planId: true },
    }),
  ]);
  const todayPlan = todayPlanAssignment
    ? await prisma.planContent.findUnique({
        where: { id: todayPlanAssignment.planId },
        select: { title: true },
      })
    : null;
  const attendanceKeys = new Set(
    streakAttendance.map((record) => record.dateKey),
  );
  let streakDays = 0;
  for (let offset = 0; offset < 365; offset += 1) {
    if (!attendanceKeys.has(toDateKey(addDays(new Date(), -offset)))) {
      break;
    }
    streakDays += 1;
  }
  const checkedInToday = attendanceKeys.has(toDateKey(new Date()));

  return {
    activeOrganization: serializeOrganizationForReadModel(organization),
    activeMembership: subscription
      ? {
          ...subscription,
          daysLeft: daysUntil(subscription.endsAt),
          nextCheckInEstimate: checkedInToday ? "Tomorrow" : "Available today",
        }
      : null,
    activePlan: plan,
    recentAttendance,
    unreadNotifications: notificationsUnread,
    activeGoals: goalsCount,
    assignedPlans: plansCount,
    streakDays,
    todayPlanName: todayPlan?.title ?? null,
    todayPlanAssignmentId: todayPlanAssignment?.id ?? null,
    nextCheckInEstimate: checkedInToday ? "Tomorrow" : subscription ? "Available today" : null,
  };
}

export async function getActiveMembershipData(userId: string, preferredOrgId?: string) {
  const subscription = await prisma.memberSubscription.findFirst({
    where: {
      memberUserId: userId,
      status: "ACTIVE",
      ...(preferredOrgId ? { orgId: preferredOrgId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  if (!subscription) {
    return null;
  }
  const [plan, organization, attendance] = await Promise.all([
    prisma.membershipPlan.findUnique({ where: { id: subscription.planId } }),
    prisma.organization.findUnique({ where: { id: subscription.orgId } }),
    prisma.attendanceRecord.findMany({
      where: { orgId: subscription.orgId, userId, status: "APPROVED" },
      orderBy: { checkedInAt: "desc" },
      take: 10,
    }),
  ]);
  const checkedInToday = attendance.some((record) => record.dateKey === toDateKey(new Date()));
  return {
    ...subscription,
    plan,
    organization: serializeOrganizationForReadModel(organization),
    daysLeft: daysUntil(subscription.endsAt),
    nextCheckInEstimate: checkedInToday ? "Tomorrow" : "Available today",
    recentAttendance: attendance,
  };
}
