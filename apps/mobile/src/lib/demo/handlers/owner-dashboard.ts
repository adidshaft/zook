import { zookDemoFixtures } from "@zook/core/demo-fixtures";

function nowIso() {
  return new Date().toISOString();
}

function activeOrg() {
  return zookDemoFixtures.organizations[0];
}

function demoOwnerDashboard() {
  const org = activeOrg();
  const pendingAttendance = zookDemoFixtures.attendanceAttempts.filter(
    (attempt) => attempt.status === "PENDING_APPROVAL",
  );
  const lowStock = zookDemoFixtures.shopProducts.filter(
    (product) => product.stock <= product.lowStockThreshold,
  );
  return {
    organization: org ? { id: org.id, name: org.name, status: org.status, trialEndAt: null } : null,
    metrics: [
      { label: "Active members", value: "128", delta: "+12%" },
      { label: "Revenue today", value: "₹82.4k", delta: "+8%" },
      { label: "Check-ins", value: "46", delta: "+6" },
    ],
    summary: {
      activeMembers: 128,
      joinRequests: zookDemoFixtures.joinRequests.length,
      expiringMemberships: 9,
      todayAttendance: 46,
      pendingAttendanceApprovals: pendingAttendance.length,
      cashCollectedPaise: 249900,
      revenuePaise: 8240000,
      lowStockProducts: lowStock.length,
      notificationQueueCount: zookDemoFixtures.notifications.length,
      aiUsageThisMonth: zookDemoFixtures.aiUsageRecords.length,
      trialDaysRemaining: 18,
    },
    charts: {
      revenue7d: [1400, 1800, 1600, 2200, 2400, 2100, 2600].map((value, index) => ({
        date: `2026-05-${19 + index}`,
        label: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index],
        value,
      })),
      revenue30d: Array.from({ length: 30 }, (_, index) => ({
        date: `2026-05-${String(index + 1).padStart(2, "0")}`,
        label:
          index === 0 ? "30d" : index === 29 ? "Today" : index % 5 === 0 ? `D-${30 - index}` : "",
        value: 900 + ((index * 137) % 1600),
      })),
      attendance7d: [32, 41, 38, 45, 47, 43, 52].map((value, index) => ({
        date: `2026-05-${19 + index}`,
        label: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index],
        value,
      })),
      memberGrowth30d: Array.from({ length: 30 }, (_, index) => ({
        date: `2026-05-${String(index + 1).padStart(2, "0")}`,
        label:
          index === 0 ? "30d" : index === 29 ? "Today" : index % 5 === 0 ? `D-${30 - index}` : "",
        value: 104 + index,
      })),
      planMix: [
        { label: "Monthly", value: 72 },
        { label: "Quarterly", value: 38 },
        { label: "Annual", value: 18 },
      ],
      deltas: {
        revenue7d: 18.2,
        revenue30d: 11.4,
        attendance7d: 9.6,
        memberGrowth30d: 28.2,
      },
    },
    joinRequests: zookDemoFixtures.joinRequests,
    products: zookDemoFixtures.shopProducts,
    notifications: zookDemoFixtures.notifications,
    aiUsage: zookDemoFixtures.aiUsageRecords.map((record) => ({
      id: record.id,
      role: record.actorRole,
      requestType: record.requestType,
      promptSummary: record.promptSummary,
      quotaConsumed: record.quotaConsumed,
      createdAt: record.createdAt,
    })),
    auditLogCount: zookDemoFixtures.auditLogs.length,
  };
}

export function ownerDashboardDemoResponse(pathname: string, init: { body?: unknown }) {
  if (pathname === "/platform/subscriptions") {
    return {
      summary: {
        totalOrgs: 4,
        onTrial: 1,
        active: 3,
        suspended: 0,
        cancelled: 0,
        totalReferrals: 7,
      },
      rows: [
        {
          orgId: "demo-org",
          orgName: activeOrg()?.name ?? "Aarogya Fitness",
          username: activeOrg()?.username ?? "aarogya",
          orgStatus: "TRIAL_ACTIVE",
          subscriptionStatus: "TRIAL_ACTIVE",
          tier: "STARTER",
          billingCycle: "MONTHLY",
          priceLockedPaise: 149900,
          creditPaise: 0,
          nextBillingAt: new Date(Date.now() + 48 * 24 * 60 * 60 * 1000).toISOString(),
          mandateStatus: "AUTHENTICATED",
          mandatePaidCount: 0,
          referredCount: 2,
        },
        {
          orgId: "demo-org-growth",
          orgName: "Iron District",
          username: "iron-district",
          orgStatus: "ACTIVE",
          subscriptionStatus: "ACTIVE",
          tier: "GROWTH",
          billingCycle: "MONTHLY",
          priceLockedPaise: 399900,
          creditPaise: 50000,
          nextBillingAt: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
          mandateStatus: "AUTHENTICATED",
          mandatePaidCount: 6,
          referredCount: 4,
        },
        {
          orgId: "demo-org-pro",
          orgName: "Kinetic Club",
          username: "kinetic-club",
          orgStatus: "ACTIVE",
          subscriptionStatus: "ACTIVE",
          tier: "PRO",
          billingCycle: "YEARLY",
          priceLockedPaise: 7999000,
          creditPaise: 0,
          nextBillingAt: new Date(Date.now() + 220 * 24 * 60 * 60 * 1000).toISOString(),
          mandateStatus: "AUTHENTICATED",
          mandatePaidCount: 1,
          referredCount: 1,
        },
      ],
    };
  }

  if (pathname.endsWith("/dashboard") || pathname.endsWith("/reports/summary")) {
    return demoOwnerDashboard();
  }

  if (pathname.endsWith("/billing/subscription")) {
    return {
      subscription: {
        orgStatus: "ACTIVE",
        trialStartAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        trialEndAt: new Date(Date.now() + 48 * 24 * 60 * 60 * 1000).toISOString(),
        status: "ACTIVE",
        tier: "STARTER",
        billingCycle: "MONTHLY",
        priceLockedPaise: 149900,
        nextBillingAt: new Date(Date.now() + 48 * 24 * 60 * 60 * 1000).toISOString(),
        nextRenewalAt: new Date(Date.now() + 78 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
      },
      activeMemberCount: 128,
      entitlements: {
        memberLimit: 100,
        branchLimit: 1,
        staffLimit: 5,
        trainerLimit: 2,
        productLimit: 50,
        notificationMonthlyLimit: 1000,
        aiTextMonthlyLimit: 0,
        aiImageMonthlyLimit: 0,
        reports: "basic",
        referrals: "basic",
        support: "standard",
        onboarding: "self_serve",
        multiBranch: false,
        apiAccess: false,
      },
      usage: {
        activeMemberCount: 128,
        branchCount: 1,
        staffCount: 4,
        trainerCount: 2,
        productCount: 12,
        notificationMonthlyCount: 246,
        aiTextMonthlyCount: 0,
        aiImageMonthlyCount: 0,
      },
      pricing: {
        STARTER: { monthly: 149900, semiannual: 799000, yearly: 1499000, memberLimit: 100 },
        GROWTH: { monthly: 399900, semiannual: 2199000, yearly: 3999000, memberLimit: 500 },
        PRO: { monthly: 799900, semiannual: 4399000, yearly: 7999000, memberLimit: null },
      },
      mandate: {
        id: "offline-saas-mandate",
        status: "ACTIVE",
        provider: "mock",
        providerMandateId: "offline-provider-mandate",
        amountPaise: 149900,
        currency: "INR",
        billingPeriod: "monthly",
        billingInterval: 1,
        paidCount: 1,
        totalCount: 120,
        nextChargeAt: new Date(Date.now() + 48 * 24 * 60 * 60 * 1000).toISOString(),
        currentEndAt: null,
        authenticatedAt: nowIso(),
        activatedAt: nowIso(),
        cancelledAt: null,
        checkoutUrl: "/checkout/mock/offline-saas",
      },
      platformReferral: {
        code: activeOrg()?.username.toUpperCase() ?? "AAROGYA",
        referredCount: 0,
        recent: [],
      },
    };
  }

  if (pathname.endsWith("/billing/mandate")) {
    return {
      mandate: {
        id: "offline-saas-mandate",
        status: "CREATED",
        amountPaise: 149900,
        currency: "INR",
        billingPeriod: "monthly",
        billingInterval: 1,
        paidCount: 0,
        totalCount: 120,
        checkoutUrl: "/checkout/mock/offline-saas",
      },
      checkoutUrl: "/checkout/mock/offline-saas",
      session: { id: "offline-saas", status: "CREATED" },
    };
  }

  if (pathname.endsWith("/saas-subscription/upgrade")) {
    const body = init.body as { tier?: string; billingCycle?: string } | undefined;
    return {
      subscription: {
        status: "TRIAL_ACTIVE",
        tier: body?.tier ?? "STARTER",
        billingCycle: body?.billingCycle ?? "MONTHLY",
        priceLockedPaise: body?.tier === "PRO" ? 799900 : body?.tier === "GROWTH" ? 399900 : 149900,
      },
      mandate: {
        id: "offline-saas-mandate",
        status: "CREATED",
        checkoutUrl: "/checkout/mock/offline-saas",
      },
      checkoutUrl: "/checkout/mock/offline-saas",
      session: { id: "offline-saas", status: "CREATED" },
    };
  }

  if (pathname.endsWith("/saas-subscription/cancel")) {
    return {
      subscription: { status: "ACTIVE", cancelAtPeriodEnd: true, cancelledAt: nowIso() },
      mandate: { id: "offline-saas-mandate", status: "CANCELLED" },
    };
  }

  return undefined;
}
