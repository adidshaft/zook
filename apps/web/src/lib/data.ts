import { getAppEnv, isTruthy, zookDemoFixtures } from "@zook/core";
import { prisma } from "@zook/db";
import { getOrganizationDashboardData, getPlatformDashboardData } from "@/server/domains/overview";
import type { DashboardBranchFilter } from "@/server/domains/shared/filters";
import { getBranchScope } from "@/server/domains/shared/org-context";
import { serializeOrganizationForReadModel } from "@/server/domains/shared/read-serialization";

const zeroSummary = {
  activeMembers: 0,
  joinRequests: 0,
  expiringMemberships: 0,
  todayAttendance: 0,
  pendingAttendanceApprovals: 0,
  cashCollectedPaise: 0,
  revenuePaise: 0,
  lowStockProducts: 0,
  notificationQueueCount: 0,
  aiUsageThisMonth: 0,
  trialDaysRemaining: 0,
  staffCount: 0,
  plansCount: 0,
};

const zeroCharts = {
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
};

const demoOrg = zookDemoFixtures.organizations[0];
const demoProducts = zookDemoFixtures.shopProducts.filter(
  (product) => product.stock <= product.lowStockThreshold,
);
const demoNotifications = zookDemoFixtures.notifications.map((notification) => ({
  id: notification.id,
  title: notification.title,
  body: notification.message,
  type: notification.type,
  status: "SENT",
  audience: "single_member",
  pushEnabled: true,
  createdAt: notification.createdAt,
}));
const demoAiUsage = zookDemoFixtures.aiUsageRecords.map((usage) => ({
  id: usage.id,
  role: usage.actorRole,
  provider: "demo",
  requestType: usage.requestType,
  promptSummary: usage.promptSummary,
  responseSummary: "Draft ready for trainer review",
  tokenEstimate: 420,
  costEstimatePaise: 0,
  quotaConsumed: usage.quotaConsumed,
  imageCount: 0,
  safetyFlags: {},
  createdAt: usage.createdAt,
}));

function getDemoDashboardData(scope: "org" | "platform") {
  const summary = {
    activeMembers: 412,
    joinRequests: 7,
    expiringMemberships: 5,
    todayAttendance: 48,
    pendingAttendanceApprovals: 3,
    cashCollectedPaise: 1860000,
    revenuePaise: 8245000,
    lowStockProducts: 2,
    notificationQueueCount: 4,
    aiUsageThisMonth: 18,
    trialDaysRemaining: 21,
    staffCount: 4,
    plansCount: 3,
  };
  const org = {
    id: demoOrg?.id ?? "org-demo",
    name: demoOrg?.name ?? "[Your gym name]",
    username: demoOrg?.username ?? "your-gym",
    city: demoOrg?.city ?? "[City]",
    state: demoOrg?.state ?? "[State]",
    status: "ACTIVE",
    joinMode: demoOrg?.joinMode ?? "OPEN_JOIN",
    attendanceMode: "EXCEPTION_APPROVAL",
    trialEndAt: new Date("2026-05-17T00:00:00.000Z"),
    createdAt: new Date("2026-04-01T00:00:00.000Z"),
    contactEmail: null,
    contactPhone: "+91 99887 77665",
  };
  return {
    scope,
    connected: false,
    fallbackMode: "demo" as const,
    metrics:
      scope === "org"
        ? [
            { label: "Active Members", value: "412", delta: null },
            { label: "Today's Check-ins", value: "48", delta: null },
            { label: "Revenue", value: "₹82,450", delta: null },
            { label: "Pending Join Requests", value: "7", delta: null },
            { label: "Low Stock", value: "2", delta: null },
            { label: "Assistant drafts", value: "18", delta: null },
          ]
        : [
            { label: "Organizations", value: "1", delta: null },
            { label: "Active orgs", value: "1", delta: null },
            { label: "Service status", value: "5", delta: null },
            { label: "Safety reviews", value: "0", delta: null },
          ],
    orgs: [org],
    products: demoProducts,
    notifications: demoNotifications,
    attendance: zookDemoFixtures.joinRequests,
    aiUsage: demoAiUsage,
    joinRequests: zookDemoFixtures.joinRequests,
    auditLogCount: zookDemoFixtures.auditLogs.length,
    branchScope: {
      branches: [{ id: "branch-default", name: "[Primary branch]", isDefault: true, active: true }],
      defaultBranch: {
        id: "branch-default",
        name: "[Primary branch]",
        isDefault: true,
        active: true,
      },
      selectedBranch: {
        id: "branch-default",
        name: "[Primary branch]",
        isDefault: true,
        active: true,
      },
      allBranches: false,
      allBranchesAllowed: true,
      mode: "default_branch",
      inventoryScope: "BRANCH",
    },
    summary,
    charts: {
      revenue7d: [
        1280, 1540, 1180, 1760, 2210, 1890, Math.round(summary.revenuePaise / 100),
      ].map((value, index) => ({
        date: `demo-7-${index}`,
        label: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index] ?? "",
        value,
      })),
      revenue30d: Array.from({ length: 30 }, (_, index) => ({
        date: `demo-30-${index}`,
        label: index === 0 ? "30d" : index === 29 ? "Today" : (index + 1) % 5 === 0 ? `D-${30 - index}` : "",
        value: Math.round(900 + index * 55 + (index % 4) * 120),
      })),
      attendance7d: [42, 51, 39, 58, 62, 47, summary.todayAttendance].map((value, index) => ({
        date: `demo-att-${index}`,
        label: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index] ?? "",
        value,
      })),
      memberGrowth30d: Array.from({ length: 30 }, (_, index) => ({
        date: `demo-member-${index}`,
        label: index === 0 ? "30d" : index === 29 ? "Today" : (index + 1) % 5 === 0 ? `D-${30 - index}` : "",
        value: Math.max(0, summary.activeMembers - 28 + index),
      })),
      planMix: [
        { label: "Monthly Unlimited", value: 226, tone: "lime" as const },
        { label: "Quarterly", value: 91, tone: "sky" as const },
        { label: "Visit pack", value: 62, tone: "amber" as const },
        { label: "Trial", value: 33, tone: "violet" as const },
      ],
      deltas: {
        revenue7d: 8.4,
        revenue30d: 14.1,
        attendance7d: 5.6,
        memberGrowth30d: 7.3,
      },
    },
    platform: {
      aiUsageThisMonth: 18,
      abuseFlags: [],
    },
  };
}

function canUseDemoDashboardFallback() {
  return (
    getAppEnv() === "local" &&
    (process.env.API_MODE === "offline-demo" || isTruthy(process.env.WEB_DEMO_FALLBACK))
  );
}

function branchFilterFromParam(branchId?: string): DashboardBranchFilter {
  return branchId === "all"
    ? { allBranches: true, allBranchesAllowed: true }
    : branchId
      ? { branchId }
      : {};
}

async function getUnavailableOrgDashboardData(
  orgId: string,
  filters: DashboardBranchFilter = {},
) {
  const emptyData = await getEmptyDashboardData(orgId);
  const organization = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!organization) {
    return emptyData;
  }
  const branchScope = await getBranchScope(orgId, filters).catch(() => emptyData.branchScope);
  return {
    ...emptyData,
    orgs: [serializeOrganizationForReadModel(organization)],
    branchScope,
    metrics: emptyData.metrics.map((metric) =>
      metric.label === "Trial days" ? { ...metric, delta: organization.status } : metric,
    ),
  };
}

async function getDashboardShellData(
  orgId?: string,
  filters: DashboardBranchFilter = {},
) {
  try {
    if (orgId) {
      const data = await getOrganizationDashboardData(orgId, filters);
      return {
        scope: "org" as const,
        connected: true,
        fallbackMode: null,
        metrics: data.metrics,
        orgs: [data.organization],
        products: data.products,
        notifications: data.notifications,
        attendance: [],
        aiUsage: data.aiUsage,
        joinRequests: data.joinRequests,
        auditLogCount: data.auditLogCount,
        branchScope: data.branchScope,
        summary: data.summary,
        charts: data.charts,
        platform: {
          aiUsageThisMonth: 0,
          abuseFlags: [],
        },
      };
    }
    const data = await getPlatformDashboardData();
    return {
      scope: "platform" as const,
      connected: true,
      fallbackMode: null,
      metrics: data.metrics,
      orgs: data.orgs,
      products: [],
      notifications: [],
      attendance: [],
      aiUsage: [],
      joinRequests: [],
      auditLogCount: 0,
      branchScope: {
        branches: [],
        defaultBranch: null,
        selectedBranch: null,
        allBranches: false,
        allBranchesAllowed: false,
        mode: "org_wide_missing_default",
        inventoryScope: "ORG_WIDE",
      },
      summary: zeroSummary,
      charts: zeroCharts,
      platform: {
        aiUsageThisMonth: data.aiUsageThisMonth,
        abuseFlags: data.abuseFlags,
      },
    };
  } catch (error) {
    if (canUseDemoDashboardFallback()) {
      if (orgId) {
        return getDemoDashboardData("org");
      }
      return getDemoDashboardData("platform");
    }
    console.error("Dashboard data read failed", error);
    if (orgId) {
      return getUnavailableOrgDashboardData(orgId, filters);
    }
    return getEmptyDashboardData();
  }
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardShellData>>;

export async function getOrganizationDashboardShellData(orgId: string, branchId?: string) {
  return getDashboardShellData(orgId, branchFilterFromParam(branchId));
}

export async function getPlatformDashboardShellData() {
  return getDashboardShellData();
}

export async function getEmptyDashboardData(orgId?: string) {
  const zeroMetrics = orgId
    ? [
        { label: "Today attendance", value: "0", delta: "—" },
        { label: "Active members", value: "0", delta: "—" },
        { label: "Expiring soon", value: "0", delta: "—" },
        { label: "Cash collected", value: "₹0", delta: "—" },
        { label: "Revenue", value: "₹0", delta: "—" },
        { label: "Low stock", value: "0", delta: "—" },
        { label: "Notification queue", value: "0", delta: "—" },
        { label: "Assistant drafts", value: "0", delta: "—" },
        { label: "Trial days", value: "0", delta: "—" },
      ]
    : [
        { label: "Organizations", value: "0", delta: "—" },
        { label: "Trial gyms", value: "0", delta: "—" },
        { label: "Suspended", value: "0", delta: "—" },
        { label: "Assistant drafts", value: "0", delta: "—" },
        { label: "Safety reviews", value: "0", delta: "—" },
      ];
  return {
    scope: orgId ? ("org" as const) : ("platform" as const),
    connected: false,
    fallbackMode: "unavailable" as const,
    metrics: zeroMetrics,
    orgs: [],
    products: [],
    notifications: [],
    attendance: [],
    aiUsage: [],
    joinRequests: [],
    auditLogCount: 0,
    branchScope: {
      branches: [],
      defaultBranch: null,
      selectedBranch: null,
      allBranches: false,
      allBranchesAllowed: false,
      mode: "org_wide_missing_default",
      inventoryScope: "ORG_WIDE",
    },
    summary: zeroSummary,
    charts: zeroCharts,
    platform: {
      aiUsageThisMonth: 0,
      abuseFlags: [],
    },
  };
}
