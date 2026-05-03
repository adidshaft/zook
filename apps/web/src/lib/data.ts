import { getAppEnv, isTruthy, zookDemoFixtures } from "@zook/core";
import { getOrganizationDashboardData, getPlatformDashboardData } from "@/server/read-models";

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
  trialDaysRemaining: 0
};

const demoOrg = zookDemoFixtures.organizations[0];
const demoProducts = zookDemoFixtures.shopProducts.filter((product) => product.stock <= product.lowStockThreshold);
const demoNotifications = zookDemoFixtures.notifications.map((notification) => ({
  id: notification.id,
  title: notification.title,
  type: notification.type,
  status: "SENT",
  createdAt: notification.createdAt
}));
const demoAiUsage = zookDemoFixtures.aiUsageRecords.map((usage) => ({
  id: usage.id,
  role: usage.actorRole,
  provider: "MOCK",
  requestType: usage.requestType,
  promptSummary: usage.promptSummary,
  responseSummary: "Mock draft generated for trainer review",
  tokenEstimate: 420,
  costEstimatePaise: 0,
  quotaConsumed: usage.quotaConsumed,
  imageCount: 0,
  safetyFlags: {},
  createdAt: usage.createdAt
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
    trialDaysRemaining: 21
  };
  const org = {
    id: demoOrg?.id ?? "org-iron-temple",
    name: demoOrg?.name ?? "Iron Temple Gym",
    username: demoOrg?.username ?? "iron-temple",
    city: demoOrg?.city ?? "Pune",
    state: demoOrg?.state ?? "Maharashtra",
    status: "ACTIVE",
    joinMode: demoOrg?.joinMode ?? "OPEN_JOIN",
    attendanceMode: "EXCEPTION_APPROVAL",
    trialEndAt: new Date("2026-05-17T00:00:00.000Z"),
    createdAt: new Date("2026-04-01T00:00:00.000Z"),
    contactEmail: "owner@zook.local",
    contactPhone: "+91 99887 77665"
  };
  return {
    scope,
    connected: false,
    fallbackMode: "demo" as const,
    metrics:
      scope === "org"
        ? [
            { label: "Active Members", value: "412", delta: "Iron Temple Gym" },
            { label: "Today's Check-ins", value: "48", delta: "3 pending approval" },
            { label: "Revenue", value: "₹82,450", delta: "Includes manual records" },
            { label: "Pending Join Requests", value: "7", delta: "Approval queue" },
            { label: "Low Stock", value: "2", delta: "Protein bar and shaker" },
            { label: "AI Usage", value: "18", delta: "Trainer drafts this month" }
          ]
        : [
            { label: "Organizations", value: "1", delta: "Demo mode" },
            { label: "Active orgs", value: "1", delta: "0 suspended" },
            { label: "Provider health", value: "5", delta: "Mock/provider-ready" },
            { label: "Abuse flags", value: "0", delta: "No open flags" }
          ],
    orgs: [org],
    products: demoProducts,
    notifications: demoNotifications,
    attendance: zookDemoFixtures.joinRequests,
    aiUsage: demoAiUsage,
    joinRequests: zookDemoFixtures.joinRequests,
    auditLogCount: zookDemoFixtures.auditLogs.length,
    branchScope: {
      branches: [{ id: "branch-default", name: "Default Branch", isDefault: true, active: true }],
      defaultBranch: { id: "branch-default", name: "Default Branch", isDefault: true, active: true },
      selectedBranch: { id: "branch-default", name: "Default Branch", isDefault: true, active: true },
      mode: "default_branch",
      inventoryScope: "ORG_WIDE"
    },
    summary,
    platform: {
      aiUsageThisMonth: 18,
      abuseFlags: []
    }
  };
}

function canUseDemoDashboardFallback() {
  return getAppEnv() === "local" && (process.env.API_MODE === "offline-demo" || isTruthy(process.env.WEB_DEMO_FALLBACK));
}

export async function getDashboardData(orgId?: string) {
  try {
    if (orgId) {
      const data = await getOrganizationDashboardData(orgId);
      return {
        scope: "org" as const,
        connected: true,
        fallbackMode: null,
        metrics: data.metrics,
        orgs: [data.organization],
        products: data.products,
        notifications: data.notifications,
        attendance: data.joinRequests,
        aiUsage: data.aiUsage,
        joinRequests: data.joinRequests,
        auditLogCount: data.auditLogCount,
        branchScope: data.branchScope,
        summary: data.summary,
        platform: {
          aiUsageThisMonth: 0,
          abuseFlags: []
        }
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
        mode: "org_wide_missing_default",
        inventoryScope: "ORG_WIDE"
      },
      summary: zeroSummary,
      platform: {
        aiUsageThisMonth: data.aiUsageThisMonth,
        abuseFlags: data.abuseFlags
      }
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
      return getEmptyDashboardData(orgId);
    }
    return getEmptyDashboardData();
  }
}

export async function getEmptyDashboardData(orgId?: string) {
    const zeroMetrics = orgId
      ? [
          { label: "Today attendance", value: "0", delta: "database unavailable" },
          { label: "Active members", value: "0", delta: "database unavailable" },
          { label: "Expiring soon", value: "0", delta: "database unavailable" },
          { label: "Cash collected", value: "₹0", delta: "database unavailable" },
          { label: "Revenue", value: "₹0", delta: "database unavailable" },
          { label: "Low stock", value: "0", delta: "database unavailable" },
          { label: "Notification queue", value: "0", delta: "database unavailable" },
          { label: "AI usage", value: "0", delta: "database unavailable" },
          { label: "Trial days", value: "0", delta: "database unavailable" }
        ]
      : [
          { label: "Organizations", value: "0", delta: "database unavailable" },
          { label: "Trial gyms", value: "0", delta: "database unavailable" },
          { label: "Suspended", value: "0", delta: "database unavailable" },
          { label: "AI usage", value: "0", delta: "database unavailable" },
          { label: "Abuse flags", value: "0", delta: "database unavailable" }
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
        mode: "org_wide_missing_default",
        inventoryScope: "ORG_WIDE"
      },
      summary: zeroSummary,
      platform: {
        aiUsageThisMonth: 0,
        abuseFlags: []
      }
    };
}
