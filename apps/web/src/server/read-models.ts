import { prisma } from "@zook/db";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfWindow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

export async function getOrganizationDashboardData(orgId: string) {
  const today = startOfToday();
  const nextWeek = endOfWindow(7);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    organization,
    activeMembers,
    joinRequests,
    expiringMemberships,
    todayAttendance,
    pendingAttendanceApprovals,
    manualPaymentsToday,
    successfulPaymentsToday,
    lowStockProducts,
    notifications,
    aiUsage,
    members,
    auditLogCount
  ] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: orgId } }),
    prisma.memberSubscription.count({ where: { orgId, status: "ACTIVE" } }),
    prisma.membershipJoinRequest.findMany({ where: { orgId, status: "pending" }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.memberSubscription.count({
      where: { orgId, status: "ACTIVE", endsAt: { gte: today, lte: nextWeek } }
    }),
    prisma.attendanceRecord.count({ where: { orgId, checkedInAt: { gte: today } } }),
    prisma.attendanceRecord.count({ where: { orgId, status: "PENDING_APPROVAL" } }),
    prisma.payment.aggregate({
      where: {
        orgId,
        status: "SUCCEEDED",
        mode: { in: ["CASH", "DIRECT_UPI", "BANK_TRANSFER", "OTHER"] },
        recordedAt: { gte: today }
      },
      _sum: { amountPaise: true }
    }),
    prisma.payment.aggregate({
      where: { orgId, status: "SUCCEEDED", createdAt: { gte: today } },
      _sum: { amountPaise: true }
    }),
    prisma.product.findMany({
      where: { orgId, active: true, stock: { lte: 8 } },
      take: 8,
      orderBy: { stock: "asc" }
    }),
    prisma.notification.findMany({ where: { orgId }, take: 8, orderBy: { createdAt: "desc" } }),
    prisma.aIUsageLog.findMany({ where: { orgId }, take: 8, orderBy: { createdAt: "desc" } }),
    prisma.memberProfile.count({ where: { orgId } }),
    prisma.auditLog.count({ where: { orgId } })
  ]);

  const trialDaysRemaining = Math.max(
    0,
    Math.ceil((organization.trialEndAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  );

  return {
    organization,
    metrics: [
      { label: "Today attendance", value: String(todayAttendance), delta: `${pendingAttendanceApprovals} pending approvals` },
      { label: "Active members", value: String(activeMembers || members), delta: `${joinRequests.length} join requests` },
      { label: "Expiring soon", value: String(expiringMemberships), delta: "next 7 days" },
      {
        label: "Cash collected",
        value: `₹${((manualPaymentsToday._sum.amountPaise ?? 0) / 100).toFixed(0)}`,
        delta: "manual/offline today"
      },
      {
        label: "Revenue",
        value: `₹${((successfulPaymentsToday._sum.amountPaise ?? 0) / 100).toFixed(0)}`,
        delta: "successful payments today"
      },
      { label: "Low stock", value: String(lowStockProducts.length), delta: "pickup inventory" },
      { label: "AI usage", value: String(aiUsage.length), delta: "this month snapshot" },
      { label: "Trial days", value: String(trialDaysRemaining), delta: organization.status }
    ],
    joinRequests,
    products: lowStockProducts,
    notifications,
    aiUsage,
    auditLogCount
  };
}

export async function getOrganizationMembers(orgId: string) {
  const profiles = await prisma.memberProfile.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  const users = await prisma.user.findMany({
    where: { id: { in: profiles.map((profile) => profile.userId) } }
  });
  const usersById = new Map(users.map((user) => [user.id, user]));

  return profiles.map((profile) => ({
    profile,
    user: usersById.get(profile.userId) ?? null
  }));
}

export async function getMemberHomeData(userId: string, preferredOrgId?: string) {
  const subscription =
    (preferredOrgId
      ? await prisma.memberSubscription.findFirst({
          where: { memberUserId: userId, orgId: preferredOrgId, status: "ACTIVE" },
          orderBy: { createdAt: "desc" }
        })
      : await prisma.memberSubscription.findFirst({
          where: { memberUserId: userId, status: "ACTIVE" },
          orderBy: { createdAt: "desc" }
        })) ?? null;

  const activeOrgId = preferredOrgId ?? subscription?.orgId ?? undefined;

  const [organization, plan, attendance, notificationsUnread, goalsCount, plansCount] = await Promise.all([
    activeOrgId ? prisma.organization.findUnique({ where: { id: activeOrgId } }) : Promise.resolve(null),
    subscription ? prisma.membershipPlan.findUnique({ where: { id: subscription.planId } }) : Promise.resolve(null),
    prisma.attendanceRecord.findMany({
      where: { userId, ...(activeOrgId ? { orgId: activeOrgId } : {}) },
      orderBy: { checkedInAt: "desc" },
      take: 10
    }),
    prisma.notificationRecipient.count({ where: { userId, readAt: null } }),
    prisma.userGoal.count({ where: { userId, active: true } }),
    prisma.planAssignment.count({ where: { assignedToUserId: userId, active: true } })
  ]);

  return {
    activeOrganization: organization,
    activeMembership: subscription,
    activePlan: plan,
    recentAttendance: attendance,
    unreadNotifications: notificationsUnread,
    activeGoals: goalsCount,
    assignedPlans: plansCount
  };
}

export async function getMyShopOrders(userId: string) {
  const orders = await prisma.shopOrder.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20
  });
  const items = await prisma.shopOrderItem.findMany({
    where: { orderId: { in: orders.map((order) => order.id) } }
  });

  return orders.map((order) => ({
    ...order,
    items: items.filter((item) => item.orderId === order.id)
  }));
}
