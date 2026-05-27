import { Prisma, prisma } from "@zook/db";
import { endOfWindow, startOfToday } from "@/server/domains/shared/date";
import type { DashboardBranchFilter } from "@/server/domains/shared/filters";
import { getBranchScope } from "@/server/domains/shared/org-context";
import { serializeOrganizationForReadModel } from "@/server/domains/shared/read-serialization";
import { cachedJson } from "@/server/server-cache";
import { buildOrganizationDashboardCharts, dayWindow } from "./chart-series";

export async function getOrganizationDashboardData(
  orgId: string,
  filters: DashboardBranchFilter = {},
) {
  return cachedJson(
    `org-dashboard:${orgId}:${filters.allBranches ? "all" : (filters.branchId ?? "default")}`,
    45,
    () => getOrganizationDashboardDataUncached(orgId, filters),
  );
}

export type OrganizationDashboardReadModel = Awaited<
  ReturnType<typeof getOrganizationDashboardData>
>;

export async function getOrganizationDashboardFastData(
  orgId: string,
  filters: DashboardBranchFilter = {},
) {
  return cachedJson(
    `org-dashboard-fast:${orgId}:${filters.allBranches ? "all" : (filters.branchId ?? "default")}`,
    10,
    () => getOrganizationDashboardFastDataUncached(orgId, filters),
  );
}

async function getOrganizationDashboardFastDataUncached(
  orgId: string,
  filters: DashboardBranchFilter = {},
) {
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
    aiUsageThisMonth,
    staffCount,
    plansCount,
  ] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: orgId } }),
    prisma.memberSubscription.count({ where: { orgId, status: "ACTIVE", ...branchWhere } }),
    prisma.membershipJoinRequest.count({
      where: { orgId, status: "pending", ...branchWhere },
    }),
    prisma.memberSubscription.count({
      where: { orgId, status: "ACTIVE", endsAt: { gte: today, lte: nextWeek }, ...branchWhere },
    }),
    prisma.attendanceRecord.count({
      where: { orgId, checkedInAt: { gte: today }, ...branchWhere },
    }),
    prisma.attendanceRecord.count({ where: { orgId, status: "PENDING_APPROVAL", ...branchWhere } }),
    prisma.payment.aggregate({
      where: {
        orgId,
        status: "SUCCEEDED",
        mode: { in: ["CASH", "DIRECT_UPI", "BANK_TRANSFER", "OTHER"] },
        recordedAt: { gte: today },
        ...branchWhere,
      },
      _sum: { amountPaise: true },
    }),
    prisma.payment.aggregate({
      where: { orgId, status: "SUCCEEDED", createdAt: { gte: today }, ...branchWhere },
      _sum: { amountPaise: true },
    }),
    prisma.aIUsageLog.count({ where: { orgId, createdAt: { gte: monthStart } } }),
    prisma.organizationRoleAssignment.count({
      where: { orgId, role: { in: ["OWNER", "ADMIN", "TRAINER", "RECEPTIONIST"] } },
    }),
    prisma.membershipPlan.count({ where: { orgId } }),
  ]);

  const trialDaysRemaining = Math.max(
    0,
    Math.ceil((organization.trialEndAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
  );

  return {
    organization: serializeOrganizationForReadModel(organization),
    branchScope,
    metrics: [
      {
        label: "Today attendance",
        value: String(todayAttendance),
        delta: branchScope.selectedBranch
          ? `${branchScope.selectedBranch.name} QR check-ins`
          : "Main branch unavailable",
      },
      {
        label: "Active members",
        value: String(activeMembers),
        delta: `${joinRequests} join requests`,
      },
      { label: "Expiring soon", value: String(expiringMemberships), delta: "next 7 days" },
      {
        label: "Cash collected",
        value: `₹${((manualPaymentsToday._sum.amountPaise ?? 0) / 100).toFixed(0)}`,
        delta: "collected at desk today",
      },
      {
        label: "Revenue",
        value: `₹${((successfulPaymentsToday._sum.amountPaise ?? 0) / 100).toFixed(0)}`,
        delta: "successful payments today",
      },
      { label: "Low stock", value: "0", delta: "loading inventory" },
      { label: "Notification queue", value: "0", delta: "loading messages" },
      { label: "Assistant drafts", value: String(aiUsageThisMonth), delta: "this month" },
      { label: "Trial days", value: String(trialDaysRemaining), delta: organization.status },
    ],
    joinRequests: [],
    products: [],
    notifications: [],
    aiUsage: [],
    auditLogCount: 0,
    charts: {
      revenue7d: [],
      revenue30d: [],
      attendance7d: [],
      memberGrowth30d: [],
      planMix: [],
      deltas: {
        revenue7d: 0,
        revenue30d: 0,
        attendance7d: 0,
        memberGrowth30d: 0,
      },
    },
    summary: {
      activeMembers,
      joinRequests,
      expiringMemberships,
      todayAttendance,
      pendingAttendanceApprovals,
      cashCollectedPaise: manualPaymentsToday._sum.amountPaise ?? 0,
      revenuePaise: successfulPaymentsToday._sum.amountPaise ?? 0,
      lowStockProducts: 0,
      notificationQueueCount: 0,
      aiUsageThisMonth,
      trialDaysRemaining,
      staffCount,
      plansCount,
    },
  };
}

async function getOrganizationDashboardDataUncached(
  orgId: string,
  filters: DashboardBranchFilter = {},
) {
  const today = startOfToday();
  const nextWeek = endOfWindow(7);
  const sevenDayWindow = dayWindow(7);
  const thirtyDayWindow = dayWindow(30);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const branchScope = await getBranchScope(orgId, filters);
  const branchWhere = branchScope.selectedBranch ? { branchId: branchScope.selectedBranch.id } : {};
  const productWhere: Prisma.ProductWhereInput = {};

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
    auditLogCount,
    staffCount,
    plansCount,
    revenueRows30d,
    attendanceRows7d,
    memberSubscriptions30d,
    planGroups,
  ] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: orgId } }),
    prisma.memberSubscription.count({ where: { orgId, status: "ACTIVE", ...branchWhere } }),
    prisma.membershipJoinRequest.findMany({
      where: { orgId, status: "pending", ...branchWhere },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.memberSubscription.count({
      where: { orgId, status: "ACTIVE", endsAt: { gte: today, lte: nextWeek }, ...branchWhere },
    }),
    prisma.attendanceRecord.count({
      where: { orgId, checkedInAt: { gte: today }, ...branchWhere },
    }),
    prisma.attendanceRecord.count({ where: { orgId, status: "PENDING_APPROVAL", ...branchWhere } }),
    prisma.payment.aggregate({
      where: {
        orgId,
        status: "SUCCEEDED",
        mode: { in: ["CASH", "DIRECT_UPI", "BANK_TRANSFER", "OTHER"] },
        recordedAt: { gte: today },
        ...branchWhere,
      },
      _sum: { amountPaise: true },
    }),
    prisma.payment.aggregate({
      where: { orgId, status: "SUCCEEDED", createdAt: { gte: today }, ...branchWhere },
      _sum: { amountPaise: true },
    }),
    prisma.product.findMany({
      where: { orgId, active: true, ...productWhere },
      orderBy: { stock: "asc" },
      take: 20,
    }),
    prisma.notification.findMany({ where: { orgId }, take: 8, orderBy: { createdAt: "desc" } }),
    prisma.aIUsageLog.findMany({ where: { orgId }, take: 8, orderBy: { createdAt: "desc" } }),
    prisma.aIUsageLog.count({ where: { orgId, createdAt: { gte: monthStart } } }),
    prisma.notification.count({ where: { orgId, status: { in: ["FAILED", "SCHEDULED"] } } }),
    prisma.auditLog.count({ where: { orgId } }),
    prisma.organizationRoleAssignment.count({
      where: { orgId, role: { in: ["OWNER", "ADMIN", "TRAINER", "RECEPTIONIST"] } },
    }),
    prisma.membershipPlan.count({ where: { orgId } }),
    prisma.payment.findMany({
      where: {
        orgId,
        status: "SUCCEEDED",
        createdAt: { gte: thirtyDayWindow.start, lt: thirtyDayWindow.end },
        ...branchWhere,
      },
      select: { amountPaise: true, createdAt: true },
    }),
    prisma.attendanceRecord.findMany({
      where: {
        orgId,
        checkedInAt: { gte: sevenDayWindow.start, lt: sevenDayWindow.end },
        ...branchWhere,
      },
      select: { checkedInAt: true },
    }),
    prisma.memberSubscription.findMany({
      where: {
        orgId,
        status: "ACTIVE",
        OR: [
          { startsAt: null },
          { startsAt: { lt: thirtyDayWindow.end } },
        ],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: thirtyDayWindow.start } }] }],
        ...branchWhere,
      },
      select: { startsAt: true, endsAt: true, createdAt: true },
    }),
    prisma.memberSubscription.groupBy({
      by: ["planId"],
      where: { orgId, status: "ACTIVE", ...branchWhere },
      _count: { _all: true },
    }),
  ]);

  const topPlanGroups = [...planGroups].sort((a, b) => b._count._all - a._count._all).slice(0, 6);
  const planIds = topPlanGroups.map((group) => group.planId);
  const planRows = planIds.length
    ? await prisma.membershipPlan.findMany({
        where: { id: { in: planIds }, orgId },
        select: { id: true, name: true },
      })
    : [];
  const planNameById = new Map(planRows.map((plan) => [plan.id, plan.name]));

  const lowStockProducts = lowStockProductsRaw
    .filter((product) => product.stock <= product.lowStockThreshold)
    .slice(0, 8);

  const trialDaysRemaining = Math.max(
    0,
    Math.ceil((organization.trialEndAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
  );

  const charts = buildOrganizationDashboardCharts({
    sevenDayWindow,
    thirtyDayWindow,
    revenueRows30d,
    attendanceRows7d,
    memberSubscriptions30d,
    planGroups,
    planNameById,
  });

  return {
    organization: serializeOrganizationForReadModel(organization),
    branchScope,
    metrics: [
      {
        label: "Today attendance",
        value: String(todayAttendance),
        delta: branchScope.selectedBranch
          ? `${branchScope.selectedBranch.name} QR check-ins`
          : "Main branch unavailable",
      },
      {
        label: "Active members",
        value: String(activeMembers),
        delta: `${joinRequests.length} join requests`,
      },
      { label: "Expiring soon", value: String(expiringMemberships), delta: "next 7 days" },
      {
        label: "Cash collected",
        value: `₹${((manualPaymentsToday._sum.amountPaise ?? 0) / 100).toFixed(0)}`,
        delta: "collected at desk today",
      },
      {
        label: "Revenue",
        value: `₹${((successfulPaymentsToday._sum.amountPaise ?? 0) / 100).toFixed(0)}`,
        delta: "successful payments today",
      },
      { label: "Low stock", value: String(lowStockProducts.length), delta: "pickup inventory" },
      {
        label: "Notification queue",
        value: String(failedNotifications),
        delta: "failed or scheduled",
      },
      { label: "Assistant drafts", value: String(aiUsageThisMonth), delta: "this month" },
      { label: "Trial days", value: String(trialDaysRemaining), delta: organization.status },
    ],
    joinRequests,
    products: lowStockProducts,
    notifications,
    aiUsage,
    auditLogCount,
    charts,
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
      trialDaysRemaining,
      staffCount,
      plansCount,
    },
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
    prisma.organization.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const counts = new Map(statusGroups.map((group) => [group.status, group._count._all]));

  return {
    orgs: orgs.map(serializeOrganizationForReadModel),
    aiUsageThisMonth,
    abuseFlags,
    metrics: [
      {
        label: "Organizations",
        value: String(orgs.length),
        delta: `${counts.get("ACTIVE") ?? 0} active`,
      },
      {
        label: "Trial gyms",
        value: String((counts.get("TRIAL_ACTIVE") ?? 0) + (counts.get("TRIAL_EXPIRING") ?? 0)),
        delta: "free trial window",
      },
      {
        label: "Suspended",
        value: String(counts.get("SUSPENDED") ?? 0),
        delta: "platform action required",
      },
      { label: "Assistant drafts", value: String(aiUsageThisMonth), delta: "this month" },
      { label: "Safety reviews", value: String(abuseFlags.length), delta: "recent signals" },
    ],
  };
}
