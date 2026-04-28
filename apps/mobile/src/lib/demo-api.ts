import { zookDemoFixtures } from "@zook/core";
import { getOfflineDemoSession } from "./demo-mode";

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
  return zookDemoFixtures.memberships.find((membership) => membership.id === "membership-aarav-hybrid") ?? null;
}

function activeTrainingPlan() {
  return zookDemoFixtures.trainingPlans.find((plan) => plan.id === "plan-push-day") ?? zookDemoFixtures.trainingPlans[0] ?? null;
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
      dateOfBirth: zookDemoFixtures.users.find((user) => user.id === session.user.id)?.dateOfBirth ?? null,
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
      summaryNote: "Demo profile stored locally for show-and-tell mode.",
      latestMeasurementAt: nowIso(),
    },
  };
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
  const pendingAttendance = zookDemoFixtures.attendanceAttempts.filter((attempt) => attempt.status === "PENDING_APPROVAL");
  const lowStock = zookDemoFixtures.shopProducts.filter((product) => product.stock <= product.lowStockThreshold);
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
      const user = zookDemoFixtures.users.find((candidate) => candidate.id === assignment.memberUserId);
      const profile = zookDemoFixtures.memberProfiles.find((candidate) => candidate.userId === assignment.memberUserId);
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
        profile: profile ? { fitnessGoal: profile.goal, notes: profile.goal, profilePhotoUrl: null } : null,
        summary: {
          fitnessGoal: profile?.goal,
          dateOfBirth: user?.dateOfBirth,
          weightKg: 78,
          dietPreference: profile?.dietPreference,
          allergies: profile?.allergyNote,
          summaryNote: "Consistent attendance and ready for progressive overload.",
          activePlans: zookDemoFixtures.trainingPlans.filter((plan) => plan.memberUserId === assignment.memberUserId).length,
        },
      };
    }),
  };
}

export async function demoMobileApiFetch<T>(path: string, init: { body?: unknown } = {}): Promise<T> {
  const parsed = new URL(normalizePath(path), "https://offline.zook.local");
  const pathname = parsed.pathname;
  const session = getOfflineDemoSession();
  const membership = activeMembership();
  const plan = activeTrainingPlan();
  const org = activeOrg();

  if (pathname === "/auth/request-otp") {
    return {
      challengeId: "offline-demo-otp",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      devOtp: "000000",
    } as T;
  }

  if (pathname === "/auth/verify-otp") {
    return {
      token: "offline-demo-session",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      session,
    } as T;
  }

  if (pathname === "/auth/me") return session as T;
  if (pathname === "/auth/logout") return { ok: true } as T;
  if (pathname === "/me/orgs") return { organizations: session.organizations, activeOrgId: session.activeOrgId } as T;
  if (pathname === "/me/profile") return demoProfile() as T;
  if (pathname === "/me/notification-preferences") return { preferences: [] } as T;
  if (pathname === "/me/push-devices") return { devices: [] } as T;

  if (pathname === "/me/home") {
    return {
      activeOrganization: org
        ? {
            id: org.id,
            name: org.name,
            status: org.status,
            city: org.city,
            state: org.state,
          }
        : null,
      activeMembership: membership
        ? {
            id: membership.id,
            status: membership.status,
            endsAt: null,
            remainingVisits: membership.remainingVisits,
          }
        : null,
      activePlan: plan
        ? {
            id: plan.id,
            name: plan.title,
            type: plan.type,
            durationDays: 30,
            visitLimit: 12,
          }
        : null,
      recentAttendance: zookDemoFixtures.attendanceAttempts.map((attempt) => ({
        id: attempt.id,
        checkedInAt: attempt.checkedInAt,
        status: attempt.status,
        source: "OFFLINE_DEMO",
      })),
      unreadNotifications: zookDemoFixtures.notifications.filter((notification) => !notification.readAt).length,
      activeGoals: 3,
      assignedPlans: zookDemoFixtures.trainingPlans.length,
    } as T;
  }

  if (pathname === "/me/memberships") return { subscriptions: zookDemoFixtures.memberships } as T;
  if (pathname === "/me/attendance") return { attendance: zookDemoFixtures.attendanceAttempts } as T;
  if (pathname === "/me/plans") return { plans: zookDemoFixtures.trainingPlans } as T;
  if (pathname === "/me/notifications") return { notifications: zookDemoFixtures.notifications } as T;
  if (pathname === "/me/goals") return { goals: [] } as T;
  if (pathname === "/me/shop-orders") return { orders: zookDemoFixtures.shopOrders } as T;
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

  if (pathname.endsWith("/dashboard")) {
    return demoOwnerDashboard() as T;
  }

  if (pathname.endsWith("/attendance/live")) {
    return { records: zookDemoFixtures.attendanceAttempts } as T;
  }

  if (pathname.includes("/trainers/") && pathname.endsWith("/clients")) {
    return demoTrainerClients() as T;
  }

  if (pathname.endsWith("/join-requests")) {
    return { id: "offline-join-request", status: "PENDING", ...(init.body as object | undefined) } as T;
  }

  return { ok: true } as T;
}
