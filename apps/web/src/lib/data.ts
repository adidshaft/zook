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

export async function getDashboardData(orgId?: string) {
  try {
    if (orgId) {
      const data = await getOrganizationDashboardData(orgId);
      return {
        scope: "org" as const,
        connected: true,
        metrics: data.metrics,
        orgs: [data.organization],
        products: data.products,
        notifications: data.notifications,
        attendance: data.joinRequests,
        aiUsage: data.aiUsage,
        joinRequests: data.joinRequests,
        auditLogCount: data.auditLogCount,
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
      metrics: data.metrics,
      orgs: data.orgs,
      products: [],
      notifications: [],
      attendance: [],
      aiUsage: [],
      joinRequests: [],
      auditLogCount: 0,
      summary: zeroSummary,
      platform: {
        aiUsageThisMonth: data.aiUsageThisMonth,
        abuseFlags: data.abuseFlags
      }
    };
  } catch {
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
      metrics: zeroMetrics,
      orgs: [],
      products: [],
      notifications: [],
      attendance: [],
      aiUsage: [],
      joinRequests: [],
      auditLogCount: 0,
      summary: zeroSummary,
      platform: {
        aiUsageThisMonth: 0,
        abuseFlags: []
      }
    };
  }
}
