import { Prisma, prisma } from "@zook/db";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function endOfWindow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function daysUntil(date?: Date | null) {
  if (!date) {
    return null;
  }
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export interface PlanExerciseSummary {
  id: string;
  name: string;
  sets?: string | null;
  equipment?: string | null;
  reps?: string | null;
  day?: string | null;
  raw?: string | null;
  orderIndex: number;
  completed: boolean;
}

type DashboardBranchFilter = {
  branchId?: string;
};

async function getBranchScope(orgId: string, filters: DashboardBranchFilter = {}) {
  const branches = await prisma.branch.findMany({
    where: { orgId, active: true },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    select: { id: true, name: true, isDefault: true, active: true }
  });
  const defaultBranch = branches.find((branch) => branch.isDefault) ?? null;
  const selectedBranch = filters.branchId
    ? branches.find((branch) => branch.id === filters.branchId) ?? null
    : defaultBranch;

  return {
    branches,
    defaultBranch,
    selectedBranch,
    mode: selectedBranch
      ? selectedBranch.isDefault
        ? "default_branch"
        : "selected_branch"
      : "org_wide_missing_default",
    inventoryScope: "ORG_WIDE" as const
  };
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function exerciseFromRecord(input: Record<string, unknown>, index: number, day?: string | null): PlanExerciseSummary | null {
  const name = optionalString(input.name) ?? optionalString(input.title) ?? optionalString(input.exerciseName);
  if (!name) {
    return null;
  }
  return {
    id: optionalString(input.id) ?? `${day ?? "exercise"}-${index}`,
    name,
    sets: optionalString(input.sets),
    equipment: optionalString(input.equipment),
    reps: optionalString(input.reps),
    day: day ?? optionalString(input.day),
    raw: optionalString(input.raw),
    orderIndex: index,
    completed: false
  };
}

function exerciseFromText(raw: string, index: number, day?: string | null): PlanExerciseSummary {
  const match = raw.match(/^(.+?)(?:\s+\d+x|\s+\d+\s*x|\s+-|$)/i);
  const name = match?.[1]?.trim() || raw.trim();
  return {
    id: `${day ?? "exercise"}-${index}`,
    name,
    sets: null,
    equipment: null,
    reps: null,
    day: day ?? null,
    raw,
    orderIndex: index,
    completed: false
  };
}

export function extractPlanExercises(content: Prisma.JsonValue): PlanExerciseSummary[] {
  if (!isRecord(content)) {
    return [];
  }

  const directExercises = Array.isArray(content.exercises)
    ? content.exercises
        .map((item, index) =>
          isRecord(item)
            ? exerciseFromRecord(item, index)
            : typeof item === "string"
              ? exerciseFromText(item, index)
              : null,
        )
        .filter((item): item is PlanExerciseSummary => Boolean(item))
    : [];

  const dayExercises = Array.isArray(content.days)
    ? content.days.flatMap((day, dayIndex) => {
        if (!isRecord(day)) {
          return [];
        }
        const dayName = optionalString(day.name) ?? `Day ${dayIndex + 1}`;
        const work = Array.isArray(day.work) ? day.work : Array.isArray(day.exercises) ? day.exercises : [];
        return work
          .map((item, itemIndex) =>
            isRecord(item)
              ? exerciseFromRecord(item, directExercises.length + itemIndex, dayName)
              : typeof item === "string"
                ? exerciseFromText(item, directExercises.length + itemIndex, dayName)
                : null,
          )
          .filter((item): item is PlanExerciseSummary => Boolean(item));
      })
    : [];

  return [...directExercises, ...dayExercises].map((exercise, index) => ({
    ...exercise,
    id: exercise.id || `exercise-${index}`,
    orderIndex: index
  }));
}

function completedExerciseNames(progressJson: Prisma.JsonValue | null | undefined) {
  if (!isRecord(progressJson)) {
    return new Set<string>();
  }
  const values: string[] = [];
  for (const key of ["completedExercises", "completed", "done"]) {
    const field = progressJson[key];
    if (Array.isArray(field)) {
      values.push(...field.filter((item): item is string => typeof item === "string"));
    }
  }
  if (isRecord(progressJson.exercises)) {
    for (const [name, value] of Object.entries(progressJson.exercises)) {
      if (value === true || (isRecord(value) && value.completed === true)) {
        values.push(name);
      }
    }
  }
  return new Set(values.map((value) => value.toLowerCase()));
}

async function enrichAttendanceRecords(records: Awaited<ReturnType<typeof prisma.attendanceRecord.findMany>>, orgId: string) {
  const subscriptionIds = records.map((record) => record.subscriptionId).filter((id): id is string => Boolean(id));
  const [users, profiles, subscriptions] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: records.map((record) => record.userId) } } }),
    prisma.memberProfile.findMany({ where: { orgId, userId: { in: records.map((record) => record.userId) } } }),
    subscriptionIds.length
      ? prisma.memberSubscription.findMany({ where: { id: { in: subscriptionIds } } })
      : Promise.resolve([])
  ]);
  const plans = subscriptions.length
    ? await prisma.membershipPlan.findMany({
        where: { id: { in: subscriptions.map((subscription) => subscription.planId) } }
      })
    : [];
  const usersById = new Map(users.map((user) => [user.id, user]));
  const profilesByUserId = new Map(profiles.map((profile) => [profile.userId, profile]));
  const subscriptionsById = new Map(subscriptions.map((subscription) => [subscription.id, subscription]));
  const plansById = new Map(plans.map((plan) => [plan.id, plan]));

  return records.map((record) => {
    const subscription = record.subscriptionId ? subscriptionsById.get(record.subscriptionId) ?? null : null;
    return {
      ...record,
      user: usersById.get(record.userId) ?? null,
      profile: profilesByUserId.get(record.userId) ?? null,
      subscription,
      plan: subscription ? plansById.get(subscription.planId) ?? null : null
    };
  });
}

export async function getOrganizationDashboardData(orgId: string, filters: DashboardBranchFilter = {}) {
  const today = startOfToday();
  const nextWeek = endOfWindow(7);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const branchScope = await getBranchScope(orgId, filters);
  const branchWhere = branchScope.selectedBranch ? { branchId: branchScope.selectedBranch.id } : {};

  const [
    organization,
    activeMembers,
    joinRequests,
    expiringMemberships,
    todayAttendance,
    pendingAttendanceApprovals,
    manualPaymentsToday,
    successfulPaymentsToday,
    lowStockProductsRaw,
    notifications,
    aiUsage,
    aiUsageThisMonth,
    failedNotifications,
    auditLogCount
  ] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: orgId } }),
    prisma.memberSubscription.count({ where: { orgId, status: "ACTIVE", ...branchWhere } }),
    prisma.membershipJoinRequest.findMany({
      where: { orgId, status: "pending", ...branchWhere },
      orderBy: { createdAt: "desc" },
      take: 20
    }),
    prisma.memberSubscription.count({
      where: { orgId, status: "ACTIVE", endsAt: { gte: today, lte: nextWeek }, ...branchWhere }
    }),
    prisma.attendanceRecord.count({ where: { orgId, checkedInAt: { gte: today }, ...branchWhere } }),
    prisma.attendanceRecord.count({ where: { orgId, status: "PENDING_APPROVAL", ...branchWhere } }),
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
    prisma.product.findMany({ where: { orgId, active: true }, orderBy: { stock: "asc" }, take: 20 }),
    prisma.notification.findMany({ where: { orgId }, take: 8, orderBy: { createdAt: "desc" } }),
    prisma.aIUsageLog.findMany({ where: { orgId }, take: 8, orderBy: { createdAt: "desc" } }),
    prisma.aIUsageLog.count({ where: { orgId, createdAt: { gte: monthStart } } }),
    prisma.notification.count({ where: { orgId, status: { in: ["FAILED", "SCHEDULED"] } } }),
    prisma.auditLog.count({ where: { orgId } })
  ]);

  const lowStockProducts = lowStockProductsRaw
    .filter((product) => product.stock <= product.lowStockThreshold)
    .slice(0, 8);

  const trialDaysRemaining = Math.max(
    0,
    Math.ceil((organization.trialEndAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  );

  return {
    organization,
    branchScope,
    metrics: [
      {
        label: "Today attendance",
        value: String(todayAttendance),
        delta: branchScope.selectedBranch
          ? `${branchScope.selectedBranch.name} QR scans`
          : "Default Branch missing"
      },
      {
        label: "Active members",
        value: String(activeMembers),
        delta: `${joinRequests.length} join requests`
      },
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
      { label: "Notification queue", value: String(failedNotifications), delta: "failed or scheduled" },
      { label: "AI usage", value: String(aiUsageThisMonth), delta: "this month" },
      { label: "Trial days", value: String(trialDaysRemaining), delta: organization.status }
    ],
    joinRequests,
    products: lowStockProducts,
    notifications,
    aiUsage,
    auditLogCount,
    summary: {
      activeMembers,
      joinRequests: joinRequests.length,
      expiringMemberships,
      todayAttendance,
      pendingAttendanceApprovals,
      cashCollectedPaise: manualPaymentsToday._sum.amountPaise ?? 0,
      revenuePaise: successfulPaymentsToday._sum.amountPaise ?? 0,
      lowStockProducts: lowStockProducts.length,
      notificationQueueCount: failedNotifications,
      aiUsageThisMonth,
      trialDaysRemaining
    }
  };
}

export async function getPlatformDashboardData() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [orgs, aiUsageThisMonth, abuseFlags, statusGroups] = await Promise.all([
    prisma.organization.findMany({ take: 20, orderBy: { createdAt: "desc" } }),
    prisma.aIUsageLog.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.organizationAbuseFlag.findMany({ take: 20, orderBy: { createdAt: "desc" } }),
    prisma.organization.groupBy({ by: ["status"], _count: { _all: true } })
  ]);

  const counts = new Map(statusGroups.map((group) => [group.status, group._count._all]));

  return {
    orgs,
    aiUsageThisMonth,
    abuseFlags,
    metrics: [
      { label: "Organizations", value: String(orgs.length), delta: `${counts.get("ACTIVE") ?? 0} active` },
      { label: "Trial gyms", value: String((counts.get("TRIAL_ACTIVE") ?? 0) + (counts.get("TRIAL_EXPIRING") ?? 0)), delta: "free trial window" },
      { label: "Suspended", value: String(counts.get("SUSPENDED") ?? 0), delta: "platform action required" },
      { label: "AI usage", value: String(aiUsageThisMonth), delta: "this month" },
      { label: "Abuse flags", value: String(abuseFlags.length), delta: "recent signals" }
    ]
  };
}

export async function getOrganizationMembers(orgId: string) {
  const profiles = await prisma.memberProfile.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  const memberUserIds = profiles.map((profile) => profile.userId);
  const [users, subscriptions, attendance, trainerAssignments] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: memberUserIds } }
    }),
    prisma.memberSubscription.findMany({
      where: { orgId, memberUserId: { in: memberUserIds } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.attendanceRecord.findMany({
      where: { orgId, userId: { in: memberUserIds } },
      orderBy: { checkedInAt: "desc" },
      take: Math.max(memberUserIds.length * 3, 20)
    }),
    prisma.trainerAssignment.findMany({
      where: { orgId, memberUserId: { in: memberUserIds }, active: true },
      orderBy: { createdAt: "desc" }
    })
  ]);
  const usersById = new Map(users.map((user) => [user.id, user]));
  const trainerIds = Array.from(new Set(trainerAssignments.map((assignment) => assignment.trainerUserId)));
  const trainers = trainerIds.length
    ? await prisma.user.findMany({ where: { id: { in: trainerIds } } })
    : [];
  const trainersById = new Map(trainers.map((trainer) => [trainer.id, trainer]));

  return profiles.map((profile) => ({
    profile,
    user: usersById.get(profile.userId) ?? null,
    lastCheckIn: attendance.find((record) => record.userId === profile.userId) ?? null,
    activeSubscription:
      subscriptions.find((subscription) => subscription.memberUserId === profile.userId && subscription.status === "ACTIVE") ??
      subscriptions.find((subscription) => subscription.memberUserId === profile.userId) ??
      null,
    assignedTrainer:
      trainerAssignments
        .filter((assignment) => assignment.memberUserId === profile.userId)
        .map((assignment) => trainersById.get(assignment.trainerUserId) ?? null)
        .find(Boolean) ?? null
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

  const [organization, plan, attendance, notificationsUnread, goalsCount, plansCount, todayPlanAssignment] = await Promise.all([
    activeOrgId ? prisma.organization.findUnique({ where: { id: activeOrgId } }) : Promise.resolve(null),
    subscription ? prisma.membershipPlan.findUnique({ where: { id: subscription.planId } }) : Promise.resolve(null),
    prisma.attendanceRecord.findMany({
      where: { userId, ...(activeOrgId ? { orgId: activeOrgId } : {}) },
      orderBy: { checkedInAt: "desc" },
      take: 10
    }),
    prisma.notificationRecipient.count({ where: { userId, readAt: null } }),
    prisma.userGoal.count({ where: { userId, active: true } }),
    prisma.planAssignment.count({ where: { assignedToUserId: userId, active: true } }),
    prisma.planAssignment.findFirst({
      where: { assignedToUserId: userId, active: true, ...(activeOrgId ? { orgId: activeOrgId } : {}) },
      orderBy: { createdAt: "desc" }
    })
  ]);
  const todayPlan = todayPlanAssignment
    ? await prisma.planContent.findUnique({ where: { id: todayPlanAssignment.planId } })
    : null;
  const attendanceKeys = new Set(attendance.filter((record) => record.status === "APPROVED").map((record) => record.dateKey));
  let streakDays = 0;
  for (let offset = 0; offset < 365; offset += 1) {
    if (!attendanceKeys.has(toDateKey(addDays(new Date(), -offset)))) {
      break;
    }
    streakDays += 1;
  }
  const checkedInToday = attendanceKeys.has(toDateKey(new Date()));

  return {
    activeOrganization: organization,
    activeMembership: subscription
      ? {
          ...subscription,
          daysLeft: daysUntil(subscription.endsAt),
          nextCheckInEstimate: checkedInToday ? "Tomorrow" : "Available today"
        }
      : null,
    activePlan: plan,
    recentAttendance: attendance,
    unreadNotifications: notificationsUnread,
    activeGoals: goalsCount,
    assignedPlans: plansCount,
    streakDays,
    todayPlanName: todayPlan?.title ?? null,
    nextCheckInEstimate: checkedInToday ? "Tomorrow" : subscription ? "Available today" : null
  };
}

export async function getActiveMembershipData(userId: string, preferredOrgId?: string) {
  const subscription = await prisma.memberSubscription.findFirst({
    where: { memberUserId: userId, status: "ACTIVE", ...(preferredOrgId ? { orgId: preferredOrgId } : {}) },
    orderBy: { createdAt: "desc" }
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
      take: 10
    })
  ]);
  const checkedInToday = attendance.some((record) => record.dateKey === toDateKey(new Date()));
  return {
    ...subscription,
    plan,
    organization,
    daysLeft: daysUntil(subscription.endsAt),
    nextCheckInEstimate: checkedInToday ? "Tomorrow" : "Available today",
    recentAttendance: attendance
  };
}

export async function getOrganizationAttendanceToday(orgId: string, filters: DashboardBranchFilter = {}) {
  const today = startOfToday();
  const records = await prisma.attendanceRecord.findMany({
    where: { orgId, checkedInAt: { gte: today }, ...(filters.branchId ? { branchId: filters.branchId } : {}) },
    take: 100,
    orderBy: { checkedInAt: "desc" }
  });
  return enrichAttendanceRecords(records, orgId);
}

export async function getOrganizationPendingAttendance(orgId: string, filters: DashboardBranchFilter = {}) {
  const records = await prisma.attendanceRecord.findMany({
    where: {
      orgId,
      status: { in: ["PENDING_APPROVAL", "FLAGGED"] },
      ...(filters.branchId ? { branchId: filters.branchId } : {})
    },
    take: 100,
    orderBy: { checkedInAt: "desc" }
  });
  return enrichAttendanceRecords(records, orgId);
}

export async function getOrganizationRecentPayments(orgId: string) {
  const payments = await prisma.payment.findMany({
    where: { orgId },
    orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
    take: 50
  });
  const users = await prisma.user.findMany({
    where: { id: { in: payments.map((payment) => payment.userId).filter((id): id is string => Boolean(id)) } }
  });
  const usersById = new Map(users.map((user) => [user.id, user]));
  return payments.map((payment) => ({
    ...payment,
    user: payment.userId ? usersById.get(payment.userId) ?? null : null
  }));
}

export async function getOrganizationActiveShopOrders(orgId: string) {
  const orders = await prisma.shopOrder.findMany({
    where: { orgId, status: { in: ["PAID", "READY_FOR_PICKUP"] } },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  const [items, users, products] = await Promise.all([
    prisma.shopOrderItem.findMany({ where: { orderId: { in: orders.map((order) => order.id) } } }),
    prisma.user.findMany({ where: { id: { in: orders.map((order) => order.userId) } } }),
    prisma.product.findMany({ where: { orgId } })
  ]);
  const usersById = new Map(users.map((user) => [user.id, user]));
  const productsById = new Map(products.map((product) => [product.id, product]));

  return orders.map((order) => ({
    ...order,
    user: usersById.get(order.userId) ?? null,
    items: items
      .filter((item) => item.orderId === order.id)
      .map((item) => ({
        ...item,
        product: productsById.get(item.productId) ?? null
      }))
  }));
}

export async function getPlanExercisesForUser(userId: string, assignmentId: string) {
  const assignment = await prisma.planAssignment.findFirst({
    where: { id: assignmentId, assignedToUserId: userId, active: true }
  });
  if (!assignment) {
    return null;
  }
  const [plan, progress] = await Promise.all([
    prisma.planContent.findUnique({ where: { id: assignment.planId } }),
    prisma.planProgress.findUnique({ where: { assignmentId_userId: { assignmentId, userId } } })
  ]);
  if (!plan) {
    return null;
  }
  const completed = completedExerciseNames(progress?.progressJson);
  return {
    assignment,
    plan,
    progress,
    exercises: extractPlanExercises(plan.content).map((exercise) => ({
      ...exercise,
      completed: completed.has(exercise.name.toLowerCase()) || completed.has(exercise.id.toLowerCase())
    }))
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
