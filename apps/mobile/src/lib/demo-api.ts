import { zookDemoFixtures } from "@zook/core/demo-fixtures";
import { demoMemberHomePayload } from "./demo-member-home";
import { DEMO_MEMBER_EMAIL, DEMO_MEMBER_PHONE, getOfflineDemoSession } from "./demo-mode";

const DEMO_SEEDED_IDENTIFIERS = new Set([
  DEMO_MEMBER_EMAIL,
  "member@zook.local",
  "owner@zook.local",
  "admin@zook.local",
  "reception@zook.local",
  "trainer@zook.local",
  "platform@zook.local",
]);

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

function nowIso() {
  return new Date().toISOString();
}

function activeOrg() {
  return zookDemoFixtures.organizations[0];
}

function activeMembership() {
  return (
    zookDemoFixtures.memberships.find(
      (membership) => membership.id === "membership-aarav-hybrid",
    ) ?? null
  );
}

function activeTrainingPlan() {
  return (
    zookDemoFixtures.trainingPlans.find((plan) => plan.id === "plan-push-day") ??
    zookDemoFixtures.trainingPlans[0] ??
    null
  );
}

function demoMemberEngagementPayload() {
  const membership = activeMembership();
  const streakDays = membership?.streakDays ?? 0;
  const latestBadge = {
    id: "offline-badge-first",
    badgeId: "badge-first-checkin",
    code: "first_checkin",
    name: "First check-in",
    description: "Completed the first gym check-in.",
    icon: "checkmark-circle-outline",
    awardedAt: zookDemoFixtures.attendanceAttempts[0]?.checkedInAt ?? nowIso(),
    metadata: { totalCheckIns: zookDemoFixtures.attendanceAttempts.length },
  };
  return {
    streakDays,
    totalCheckIns: zookDemoFixtures.attendanceAttempts.length,
    badges: [latestBadge],
    latestBadge,
    nextMilestone: {
      code: "streak_7",
      name: "7-day streak",
      description: "Checked in for 7 days in a row.",
      icon: "flame-outline",
      metric: "streakDays",
      target: 7,
      current: streakDays,
      remaining: Math.max(0, 7 - streakDays),
      progress: Math.min(1, streakDays / 7),
    },
  };
}

function demoProfile() {
  const session = getOfflineDemoSession();
  const profile = zookDemoFixtures.memberProfiles.find((item) => item.userId === session.user.id);
  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      phone: session.user.phone,
      dateOfBirth:
        zookDemoFixtures.users.find((user) => user.id === session.user.id)?.dateOfBirth ?? null,
      fitnessGoal: profile?.goal ?? null,
    },
    profile: profile
      ? {
          id: profile.id,
          notes: profile.goal,
          profilePhotoUrl: null,
          publicVisibility: true,
        }
      : null,
    wellness: {
      weightKg: 78,
      dietPreference: profile?.dietPreference ?? "Vegetarian",
      allergies: profile?.allergyNote ?? "None added",
      summaryNote: "Sample profile saved on this device.",
      latestMeasurementAt: nowIso(),
    },
  };
}

function demoBody(init: { body?: unknown }) {
  return init.body && typeof init.body === "object" ? (init.body as Record<string, unknown>) : {};
}

function demoGymProfile(username: string) {
  const org =
    zookDemoFixtures.organizations.find((candidate) => candidate.username === username) ??
    activeOrg();
  if (!org) {
    return { org: null, plans: [] };
  }

  return {
    org: {
      id: org.id,
      name: org.name,
      username: org.username,
      city: org.city,
      state: org.state,
      joinMode: org.joinMode,
      visibility: "PUBLIC",
      amenities: org.amenities,
      address: org.address,
      tagline: "Premium strength, PT, and recovery operations in one gym cockpit.",
      gallery: [],
      equipment: ["Dumbbells", "Power racks", "Treadmills", "Cable crossover machine"],
    },
    branches: zookDemoFixtures.branches.filter((branch) => branch.orgId === org.id),
    trainers: zookDemoFixtures.users
      .filter((user) => user.id === "user-rhea" || user.id === "user-kabir")
      .map((user) => ({
        userId: user.id,
        name: user.name,
        bio: "Strength, hypertrophy, and habit coaching.",
        specialties: ["Strength", "Form checks"],
        visibleToMembers: true,
      })),
    plans: zookDemoFixtures.membershipPlans
      .filter((plan) => plan.orgId === org.id && plan.publicVisible)
      .map((plan) => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        type: plan.type,
        pricePaise: plan.pricePaise,
        durationDays: plan.durationDays,
        visitLimit: plan.visitLimit,
      })),
    viewerState: {
      activeMembership: activeMembership(),
      pendingJoinRequest: null,
      approvedJoinRequest: null,
    },
    referral: zookDemoFixtures.referralCodes[0]
      ? {
          code: zookDemoFixtures.referralCodes[0].code,
          couponId: zookDemoFixtures.referralCodes[0].id,
          status: zookDemoFixtures.referralCodes[0].status,
        }
      : null,
  };
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
        { label: "Monthly", value: 72, tone: "lime" },
        { label: "Quarterly", value: 38, tone: "sky" },
        { label: "Annual", value: 18, tone: "amber" },
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

function demoTrainerClients() {
  return {
    clients: zookDemoFixtures.trainerClientAssignments.map((assignment) => {
      const user = zookDemoFixtures.users.find(
        (candidate) => candidate.id === assignment.memberUserId,
      );
      const profile = zookDemoFixtures.memberProfiles.find(
        (candidate) => candidate.userId === assignment.memberUserId,
      );
      return {
        ...assignment,
        user: user
          ? {
              name: user.name,
              email: user.email,
              phone: user.phone,
              dateOfBirth: user.dateOfBirth,
              fitnessGoal: profile?.goal,
            }
          : null,
        profile: profile
          ? { fitnessGoal: profile.goal, notes: profile.goal, profilePhotoUrl: null }
          : null,
        summary: {
          fitnessGoal: profile?.goal,
          dateOfBirth: user?.dateOfBirth,
          weightKg: 78,
          dietPreference: profile?.dietPreference,
          allergies: profile?.allergyNote,
          summaryNote: "Consistent attendance and ready for progressive overload.",
          activePlans: zookDemoFixtures.trainingPlans.filter(
            (plan) => plan.memberUserId === assignment.memberUserId,
          ).length,
        },
      };
    }),
  };
}

function demoPlanAssignments() {
  return zookDemoFixtures.trainingPlans.map((trainingPlan) => ({
    id: trainingPlan.id,
    orgId: trainingPlan.orgId,
    planId: trainingPlan.id,
    assignedById: trainingPlan.trainerUserId,
    assignedToUserId: trainingPlan.memberUserId,
    audience: "selected_member",
    active: true,
    createdAt: nowIso(),
    plan: {
      id: trainingPlan.id,
      orgId: trainingPlan.orgId,
      creatorUserId: trainingPlan.trainerUserId,
      type: trainingPlan.type,
      title: trainingPlan.title,
      description: trainingPlan.durationLabel,
      content: { exercises: trainingPlan.exercises },
      aiGenerated: trainingPlan.aiGenerated,
      reviewed: trainingPlan.reviewed,
      status: trainingPlan.status,
      visibility: "assigned",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    progress: {
      id: `${trainingPlan.id}-progress`,
      orgId: trainingPlan.orgId,
      assignmentId: trainingPlan.id,
      userId: trainingPlan.memberUserId,
      progressJson: {
        completedExercises: trainingPlan.exercises.slice(0, 2).map((exercise) => exercise.name),
      },
      completionPct: 33,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  }));
}

function demoMembers() {
  return zookDemoFixtures.memberProfiles.map((profile) => {
    const user =
      zookDemoFixtures.users.find((candidate) => candidate.id === profile.userId) ?? null;
    const activeSubscription =
      zookDemoFixtures.memberships.find(
        (membership) => membership.memberUserId === profile.userId,
      ) ?? null;
    const lastCheckIn =
      zookDemoFixtures.attendanceAttempts.find(
        (attempt) => attempt.memberUserId === profile.userId,
      ) ?? null;
    const trainer =
      zookDemoFixtures.users.find((candidate) => candidate.id === profile.assignedTrainerId) ??
      null;
    return {
      profile: {
        id: profile.id,
        userId: profile.userId,
        orgId: activeOrg()?.id ?? "org-demo",
        fitnessGoal: profile.goal,
        notes: profile.goal,
        profilePhotoUrl: null,
        createdAt: nowIso(),
      },
      user,
      activeSubscription,
      lastCheckIn,
      assignedTrainer: trainer,
    };
  });
}

function demoShopOrders() {
  return zookDemoFixtures.shopOrders.map((order) => ({
    ...order,
    user: zookDemoFixtures.users.find((user) => user.id === order.memberUserId) ?? null,
    userId: order.memberUserId,
    items: order.items.map((item) => ({
      ...item,
      product:
        zookDemoFixtures.shopProducts.find((product) => product.id === item.productId) ?? null,
    })),
  }));
}

type DemoTransport = {
  request<T>(
    path: string,
    init?: { body?: unknown; method?: string } & Record<string, unknown>,
  ): Promise<T>;
};

export function createDemoTransport(): DemoTransport {
  return {
    request: demoMobileApiFetch,
  };
}

export async function demoMobileApiFetch<T>(
  path: string,
  init: { body?: unknown; method?: string } & Record<string, unknown> = {},
): Promise<T> {
  const parsed = new URL(normalizePath(path), "https://offline.zook.local");
  const pathname = parsed.pathname;
  const method = (init.method ?? "GET").toUpperCase();
  const session = getOfflineDemoSession();
  const membership = activeMembership();

  if (pathname === "/auth/request-otp") {
    return {
      challengeId: "offline-demo-otp",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      devOtp: "000000",
    } as T;
  }

  if (pathname === "/auth/verify-otp") {
    const body = demoBody(init);
    const identifier = String(body.identifier ?? "")
      .trim()
      .toLowerCase();
    const phoneIdentifier = String(body.identifier ?? "").replace(/\D/g, "");
    if (
      body.code !== "000000" ||
      !(
        DEMO_SEEDED_IDENTIFIERS.has(identifier) ||
        phoneIdentifier === DEMO_MEMBER_PHONE.replace(/\D/g, "")
      )
    ) {
      throw new Error(
        "Use a seeded @zook.local account or +91 98765 43210 with OTP 000000 for demo mode.",
      );
    }
    return {
      token: "offline-demo-session",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      session,
    } as T;
  }

  if (pathname === "/auth/me") return session as T;
  if (pathname === "/auth/logout") return { ok: true } as T;
  if (pathname === "/support/feedback") return { submitted: true } as T;
  if (pathname === "/me/orgs")
    return { organizations: session.organizations, activeOrgId: session.activeOrgId } as T;
  if (pathname === "/me/profile") return demoProfile() as T;
  if (pathname === "/me/notification-preferences") return { preferences: [] } as T;
  if (pathname === "/me/push-devices") return { devices: [] } as T;

  if (pathname === "/me/dashboard") {
    return {
      home: demoMemberHomePayload(),
      engagement: demoMemberEngagementPayload(),
      referral: {
        referralCodes: zookDemoFixtures.referralCodes,
        rewards: [],
        links: {
          web: "https://zookfit.in/r/ROHAN500",
          short: "zook.fit/r/ROHAN500",
          app: "zook://r/ROHAN500",
        },
        policy: null,
      },
      preferences: [],
    } as T;
  }

  if (pathname === "/me/home") {
    return demoMemberHomePayload() as T;
  }

  if (pathname === "/me/badges") {
    return {
      badges: [
        {
          id: "offline-badge-first",
          badgeId: "badge-first-checkin",
          code: "first_checkin",
          name: "First check-in",
          description: "Completed the first gym check-in.",
          icon: "checkmark-circle-outline",
          awardedAt: zookDemoFixtures.attendanceAttempts[0]?.checkedInAt ?? nowIso(),
          metadata: { totalCheckIns: zookDemoFixtures.attendanceAttempts.length },
        },
      ],
    } as T;
  }

  if (pathname === "/me/engagement") {
    const streakDays = membership?.streakDays ?? 0;
    const latestBadge = {
      id: "offline-badge-first",
      badgeId: "badge-first-checkin",
      code: "first_checkin",
      name: "First check-in",
      description: "Completed the first gym check-in.",
      icon: "checkmark-circle-outline",
      awardedAt: zookDemoFixtures.attendanceAttempts[0]?.checkedInAt ?? nowIso(),
      metadata: { totalCheckIns: zookDemoFixtures.attendanceAttempts.length },
    };
    return {
      streakDays,
      totalCheckIns: zookDemoFixtures.attendanceAttempts.length,
      badges: [latestBadge],
      latestBadge,
      nextMilestone: {
        code: "streak_7",
        name: "7-day streak",
        description: "Checked in for 7 days in a row.",
        icon: "flame-outline",
        metric: "streakDays",
        target: 7,
        current: streakDays,
        remaining: Math.max(0, 7 - streakDays),
        progress: Math.max(0, Math.min(1, streakDays / 7)),
      },
    } as T;
  }

  if (pathname === "/me/membership/active") return { membership: activeMembership() } as T;
  if (pathname.startsWith("/r/")) {
    const referralCode = pathname.split("/").at(-1)?.toUpperCase();
    const referral = zookDemoFixtures.referralCodes.find(
      (candidate) => candidate.code === referralCode,
    );
    return {
      referral: referral ?? null,
      org: referral ? activeOrg() : null,
    } as T;
  }
  if (pathname === "/me/memberships") {
    return {
      subscriptions: zookDemoFixtures.memberships,
      payments: zookDemoFixtures.payments,
    } as T;
  }
  if (pathname.match(/^\/me\/memberships\/[^/]+\/renew$/)) {
    return {
      checkoutUrl: "/checkout/mock/offline-renewal",
      session: { id: "offline-renewal", status: "CREATED", provider: "mock" },
      subscription: {
        ...(activeMembership() ?? {}),
        renewedAt: nowIso(),
        planId: (init.body as { planId?: string } | undefined)?.planId,
      },
    } as T;
  }
  if (pathname.match(/^\/me\/memberships\/[^/]+\/autopay$/) && method === "POST") {
    return {
      checkoutUrl: null,
      session: null,
      mandate: {
        id: "offline-autopay",
        provider: "mock",
        status: "ACTIVE",
        nextChargeAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    } as T;
  }
  if (pathname.match(/^\/me\/memberships\/[^/]+\/autopay$/) && method === "DELETE") {
    return {
      mandate: {
        id: "offline-autopay",
        provider: "mock",
        status: "CANCELLED",
        cancelledAt: nowIso(),
      },
    } as T;
  }
  if (pathname === "/me/attendance")
    return { attendance: zookDemoFixtures.attendanceAttempts } as T;
  if (pathname.match(/^\/me\/attendance\/[^/]+$/)) {
    const attendanceRecordId = pathname.split("/").at(-1);
    const rejectedAttendance =
      attendanceRecordId === "attendance-rejected"
        ? {
            ...zookDemoFixtures.attendanceAttempts[1],
            id: "attendance-rejected",
            status: "REJECTED",
            entryCode: "RJ-2048",
            reason: "Desk rejected this scan after branch review.",
            auditTrail: ["QR token valid", "Desk review required", "Rejected by reception"],
          }
        : undefined;
    const attendance =
      rejectedAttendance ??
      zookDemoFixtures.attendanceAttempts.find((record) => record.id === attendanceRecordId) ??
      zookDemoFixtures.attendanceAttempts[0];
    return { attendance } as T;
  }
  if (pathname === "/attendance/scan" || pathname === "/attendance/dev-scan") {
    const attempt =
      zookDemoFixtures.attendanceAttempts.find((record) => record.status === "APPROVED") ??
      zookDemoFixtures.attendanceAttempts[0];
    return {
      attendance: attempt,
      status: attempt?.status ?? "APPROVED",
      duplicate: false,
      suspiciousFlags: [],
    } as T;
  }
  if (pathname === "/me/plans") return { plans: demoPlanAssignments() } as T;
  if (pathname.match(/^\/me\/plans\/[^/]+\/exercises$/)) {
    const assignmentId = pathname.split("/")[3];
    const assignment =
      demoPlanAssignments().find((candidate) => candidate.id === assignmentId) ??
      demoPlanAssignments()[0];
    const planRecord =
      zookDemoFixtures.trainingPlans.find((candidate) => candidate.id === assignment?.planId) ??
      activeTrainingPlan();
    return {
      assignment,
      plan: assignment?.plan ?? null,
      progress: assignment?.progress ?? null,
      exercises: (planRecord?.exercises ?? []).map((exercise, index) => ({
        ...exercise,
        id: `${planRecord?.id ?? "plan"}-${index}`,
        orderIndex: index,
        completed: index < 2,
      })),
    } as T;
  }
  if (pathname.match(/^\/me\/plans\/[^/]+\/complete$/)) {
    return {
      progress: { completionPct: 100, progressJson: init.body ?? {} },
      completedExercises: [],
    } as T;
  }
  if (pathname.match(/^\/orgs\/[^/]+\/plan-feedback$/)) {
    return { ok: true } as T;
  }
  if (pathname === "/me/notifications")
    // Match the real API envelope: each row wraps a `notification` whose
    // `body` is sourced from the stored `message` (see apps/web .../data.ts).
    return {
      notifications: zookDemoFixtures.notifications.map((n) => ({
        id: n.id,
        readAt: n.readAt,
        deliveredAt: n.createdAt,
        notification: {
          id: n.id,
          title: n.title,
          body: n.message,
          type: n.type,
          status: "SENT",
          createdAt: n.createdAt,
          metadata: { targetRoute: n.targetRoute },
        },
      })),
    } as T;
  if (pathname === "/me/notifications/read") {
    const body = init.body as { ids?: string[] } | undefined;
    return { count: body?.ids?.length ?? 0 } as T;
  }
  if (pathname === "/me/consents") {
    return {
      exportRequests: [],
      deletionRequests: [],
      exportJobs: [],
      deletionJobs: [],
    } as T;
  }
  if (pathname === "/me/data-export-request") {
    return {
      request: {
        id: "offline-export-request",
        status: "PENDING",
        createdAt: nowIso(),
      },
    } as T;
  }
  if (pathname === "/me/account-deletion-request") {
    return {
      request: {
        id: "offline-deletion-request",
        status: "PENDING",
        createdAt: nowIso(),
        scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    } as T;
  }
  if (pathname === "/me/goals") return { goals: [] } as T;
  if (pathname === "/me/shop-orders") return { orders: demoShopOrders() } as T;
  if (pathname === "/me/tracking/workouts") return { workouts: [] } as T;
  if (pathname === "/me/tracking/habits") return { habits: [] } as T;
  if (pathname === "/me/tracking/summary") {
    return {
      summary: { weeklyCount: 3, totalDuration: 185, recentCount: 4 },
      recentWorkouts: [],
      latestBodyProgress: { weightKg: 78, measuredAt: nowIso() },
      habits: [],
    } as T;
  }

  if (pathname === "/orgs/public/search") {
    return {
      gyms: zookDemoFixtures.organizations.map((candidate) => ({
        id: candidate.id,
        username: candidate.username,
        name: candidate.name,
        city: candidate.city,
        state: candidate.state,
        joinMode: candidate.joinMode,
        visibility: "PUBLIC",
        amenities: candidate.amenities,
      })),
    } as T;
  }

  if (pathname.startsWith("/orgs/public/")) {
    return demoGymProfile(pathname.replace("/orgs/public/", "")) as T;
  }

  if (pathname.endsWith("/products")) {
    return { products: zookDemoFixtures.shopProducts } as T;
  }

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
    } as T;
  }

  if (pathname.endsWith("/dashboard")) {
    return demoOwnerDashboard() as T;
  }

  if (pathname.endsWith("/billing/subscription")) {
    return {
      subscription: {
        orgStatus: "TRIAL_ACTIVE",
        trialStartAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        trialEndAt: new Date(Date.now() + 48 * 24 * 60 * 60 * 1000).toISOString(),
        status: "TRIAL_ACTIVE",
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
        STARTER: { monthly: 149900, yearly: 1499000, memberLimit: 100 },
        GROWTH: { monthly: 399900, yearly: 3999000, memberLimit: 500 },
        PRO: { monthly: 799900, yearly: 7999000, memberLimit: null },
      },
      mandate: {
        id: "offline-saas-mandate",
        status: "AUTHENTICATED",
        provider: "mock",
        providerMandateId: "offline-provider-mandate",
        amountPaise: 149900,
        currency: "INR",
        billingPeriod: "monthly",
        billingInterval: 1,
        paidCount: 0,
        totalCount: 120,
        nextChargeAt: new Date(Date.now() + 48 * 24 * 60 * 60 * 1000).toISOString(),
        currentEndAt: null,
        authenticatedAt: nowIso(),
        activatedAt: null,
        cancelledAt: null,
        checkoutUrl: "/checkout/mock/offline-saas",
      },
      platformReferral: {
        code: activeOrg()?.username.toUpperCase() ?? "AAROGYA",
        referredCount: 0,
        recent: [],
      },
    } as T;
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
    } as T;
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
    } as T;
  }

  if (pathname.endsWith("/saas-subscription/cancel")) {
    return {
      subscription: { status: "ACTIVE", cancelAtPeriodEnd: true, cancelledAt: nowIso() },
      mandate: { id: "offline-saas-mandate", status: "CANCELLED" },
    } as T;
  }

  if (pathname.endsWith("/members")) {
    return { members: demoMembers() } as T;
  }

  if (pathname.match(/^\/orgs\/[^/]+\/members\/[^/]+$/)) {
    const memberUserId = pathname.split("/").at(-1);
    const member = demoMembers().find((candidate) => candidate.profile.userId === memberUserId);
    return { member: member ?? demoMembers()[0] } as T;
  }

  if (pathname.endsWith("/attendance/live") || pathname.endsWith("/attendance/pending")) {
    return { records: zookDemoFixtures.attendanceAttempts } as T;
  }

  if (pathname.endsWith("/attendance/today")) {
    return { records: zookDemoFixtures.attendanceAttempts } as T;
  }

  if (pathname.endsWith("/reception/verify-code")) {
    const body = init.body as { code?: string } | undefined;
    const normalized = body?.code?.trim().toUpperCase();
    const attendance = zookDemoFixtures.attendanceAttempts.find(
      (attempt) => attempt.entryCode === normalized,
    );
    if (attendance) {
      return {
        match: {
          type: "attendance",
          valid: attendance.status === "APPROVED",
          record: { status: attendance.status, entryCode: attendance.entryCode },
          user: zookDemoFixtures.users.find((user) => user.id === attendance.memberUserId) ?? null,
        },
      } as T;
    }

    const order = demoShopOrders().find((candidate) => candidate.pickupCode === normalized);
    if (order) {
      return {
        match: {
          type: "pickup",
          valid: order.status === "READY_FOR_PICKUP" || order.status === "PAID",
          pickupCode: { status: order.status, code: order.pickupCode },
          order: { status: order.status, totalPaise: order.totalPaise },
          user: order.user,
        },
      } as T;
    }

    return { match: null } as T;
  }

  if (pathname.endsWith("/payments/recent")) {
    return { payments: zookDemoFixtures.payments } as T;
  }

  if (pathname.endsWith("/shop/orders/active")) {
    return {
      orders: demoShopOrders().filter(
        (order) => order.status === "READY_FOR_PICKUP" || order.status === "PAID",
      ),
    } as T;
  }

  if (pathname === "/shop/orders") {
    const order = demoShopOrders()[0];
    return {
      order,
      checkoutUrl: "",
      checkoutData: null,
      session: { id: "offline-payment-session", status: "CREATED", provider: "mock" },
    } as T;
  }

  if (pathname.startsWith("/payments/mock/")) {
    return {
      session: { id: "offline-payment-session", status: "SUCCEEDED" },
      payment: zookDemoFixtures.payments[0],
    } as T;
  }

  if (pathname.includes("/trainers/") && pathname.endsWith("/clients")) {
    return demoTrainerClients() as T;
  }

  if (pathname.match(/^\/orgs\/[^/]+\/trainers\/[^/]+\/clients\/[^/]+\/note$/)) {
    const body = init.body as { note?: string } | undefined;
    return { note: body?.note ?? "" } as T;
  }

  if (pathname.match(/\/join-requests\/[^/]+\/approve$/)) {
    return { joinRequest: { id: "offline-join-request", status: "approved" } } as T;
  }

  if (pathname.match(/\/join-requests\/[^/]+\/reject$/)) {
    return { joinRequest: { id: "offline-join-request", status: "rejected" } } as T;
  }

  if (pathname.endsWith("/join-requests")) {
    if (init.body) {
      return {
        id: "offline-join-request",
        status: "PENDING",
        ...(init.body as object | undefined),
      } as T;
    }
    return { joinRequests: zookDemoFixtures.joinRequests } as T;
  }

  if (pathname === "/ai/generate-plan") {
    return {
      response: {
        sections: [
          { title: "Workout A", body: "Coach-reviewed strength plan draft." },
          { title: "Recovery", body: "Keep effort moderate and review discomfort." },
        ],
      },
      createdPlan: { id: "offline-ai-plan", title: "Sample workout draft" },
    } as T;
  }

  if (pathname === "/ai/chat") {
    return {
      answer:
        "Sample answer: keep the workout moderate today, hydrate, and ask your trainer to review any pain or fatigue before increasing load.",
      response:
        "Sample answer: keep the workout moderate today, hydrate, and ask your trainer to review any pain or fatigue before increasing load.",
      usage: {
        provider: "offline-demo",
        requestType: "CHAT",
        quotaConsumed: 1,
      },
    } as T;
  }

  throw new Error("This action is not available in offline demo mode.");
}
