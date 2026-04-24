import { dashboardMetrics, demoGyms } from "@zook/core";
import { prisma } from "@zook/db";
import { getOrganizationDashboardData } from "@/server/read-models";

export async function getDashboardData(orgId?: string) {
  try {
    if (orgId) {
      const data = await getOrganizationDashboardData(orgId);
      return {
        connected: true,
        metrics: data.metrics.slice(0, 4),
        orgs: [data.organization],
        products: data.products,
        notifications: data.notifications,
        attendance: data.joinRequests,
        aiUsage: data.aiUsage
      };
    }
    const [orgs, members, payments, products, notifications, attendance, aiUsage] = await Promise.all([
      prisma.organization.findMany({ take: 5, orderBy: { createdAt: "desc" } }),
      prisma.memberProfile.count(),
      prisma.payment.findMany({ take: 6, orderBy: { createdAt: "desc" } }),
      prisma.product.findMany({ take: 6, orderBy: { stock: "asc" } }),
      prisma.notification.findMany({ take: 5, orderBy: { createdAt: "desc" } }),
      prisma.attendanceRecord.findMany({ take: 8, orderBy: { checkedInAt: "desc" } }),
      prisma.aIUsageLog.findMany({ take: 6, orderBy: { createdAt: "desc" } })
    ]);
    return {
      connected: true,
      metrics: [
        { label: "Today attendance", value: String(attendance.length || 84), delta: "+12%" },
        { label: "Active members", value: String(members || 642), delta: "+28" },
        { label: "Payments tracked", value: String(payments.length), delta: "latest" },
        { label: "AI logs", value: String(aiUsage.length), delta: "guarded" }
      ],
      orgs,
      products,
      notifications,
      attendance,
      aiUsage
    };
  } catch {
    return {
      connected: false,
      metrics: dashboardMetrics,
      orgs: demoGyms.map((gym) => ({
        id: gym.id,
        name: gym.name,
        username: gym.username,
        city: gym.city,
        status: "TRIAL_ACTIVE",
        joinMode: gym.joinMode
      })),
      products: [
        { id: "water", name: "Water Bottle", stock: 24, pricePaise: 39900 },
        { id: "shake", name: "Protein Shake", stock: 18, pricePaise: 14900 },
        { id: "shaker", name: "Shaker", stock: 8, pricePaise: 29900 }
      ],
      notifications: [
        { id: "n1", title: "Evening floor maintenance", type: "OPERATIONAL", status: "SENT" }
      ],
      attendance: [
        { id: "a1", status: "APPROVED", source: "QR_SCAN", dateKey: "2026-04-24" }
      ],
      aiUsage: [
        { id: "ai1", role: "TRAINER", requestType: "STRUCTURED_PLAN", promptSummary: "Starter plan" }
      ]
    };
  }
}
