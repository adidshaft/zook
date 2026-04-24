import { prisma } from "@zook/db";
import { getOrganizationDashboardData, getPlatformDashboardData } from "@/server/read-models";

export async function getDashboardData(orgId?: string) {
  try {
    if (orgId) {
      const data = await getOrganizationDashboardData(orgId);
      return {
        connected: true,
        metrics: data.metrics,
        orgs: [data.organization],
        products: data.products,
        notifications: data.notifications,
        attendance: data.joinRequests,
        aiUsage: data.aiUsage,
        summary: data.summary
      };
    }
    const data = await getPlatformDashboardData();
    return {
      connected: true,
      metrics: data.metrics,
      orgs: data.orgs,
      products: [],
      notifications: [],
      attendance: [],
      aiUsage: [],
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
      connected: false,
      metrics: zeroMetrics,
      orgs: [],
      products: [],
      notifications: [],
      attendance: [],
      aiUsage: []
    };
  }
}
