import { zookDemoFixtures } from "@zook/core/demo-fixtures";
import {
  clearDemoCheckIn,
  demoMemberHomePayload,
  getDemoActiveCheckIn,
  startDemoCheckIn,
} from "./demo-member-home";
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

// Attach the resolved plan + organization so cards can show the real plan
// name ("Hybrid Pro") instead of the generic "Membership" fallback.
function enrichMembership<
  T extends { planId?: string | null; orgId?: string | null; daysLeft?: number | null },
>(membership: T | null) {
  if (!membership) return membership;
  const plan = zookDemoFixtures.membershipPlans.find((entry) => entry.id === membership.planId);
  const org =
    zookDemoFixtures.organizations.find((entry) => entry.id === membership.orgId) ?? activeOrg();
  const endsAt =
    typeof membership.daysLeft === "number"
      ? new Date(Date.now() + membership.daysLeft * 24 * 60 * 60 * 1000).toISOString()
      : null;
  return {
    ...membership,
    ...(endsAt ? { endsAt, expiresAt: endsAt } : {}),
    plan: plan
      ? {
          id: plan.id,
          name: plan.name,
          description: plan.description,
          type: plan.type,
          pricePaise: plan.pricePaise,
          durationDays: plan.durationDays,
          visitLimit: plan.visitLimit,
        }
      : null,
    organization: org ? { id: org.id, name: org.name, username: org.username } : null,
  };
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
      summaryNote: "Local test profile saved on this device.",
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
      tagline: "Strength, PT, and recovery operations in one gym cockpit.",
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

// Personal Training (offline demo): a trainer's own packages + PT clients.
// Lets a trainer take clients independently — create packages persists.
type DemoPtPlan = {
  id: string;
  orgId: string;
  trainerUserId: string;
  name: string;
  description: string | null;
  durationDays: number | null;
  sessionCount: number | null;
  pricePaise: number;
  active: boolean;
  createdAt: string;
};

const demoPtPlans: DemoPtPlan[] = [
  {
    id: "pt-plan-strength-12",
    orgId: "org-aarogya-strength",
    trainerUserId: "user-rhea",
    name: "1-on-1 Strength · 12 sessions",
    description: "Personalised strength coaching with form checks and progressive overload.",
    durationDays: 45,
    sessionCount: 12,
    pricePaise: 1200000,
    active: true,
    createdAt: hoursAgoIso(24 * 20),
  },
  {
    id: "pt-plan-transform-8",
    orgId: "org-aarogya-strength",
    trainerUserId: "user-rhea",
    name: "Transformation · 8 sessions",
    description: "Fat-loss focused coaching with weekly check-ins and a nutrition plan.",
    durationDays: 30,
    sessionCount: 8,
    pricePaise: 800000,
    active: true,
    createdAt: hoursAgoIso(24 * 8),
  },
];

type DemoPtSubscription = {
  id: string;
  orgId: string;
  memberUserId: string;
  memberName: string;
  trainerUserId: string;
  ptPlanId: string | null;
  planName: string | null;
  status: string;
  totalSessions: number | null;
  remainingSessions: number | null;
  amountPaise: number;
  startsAt: string;
  endsAt: string;
  createdAt: string;
};

const demoPtSubscriptions: DemoPtSubscription[] = [
  {
    id: "pt-sub-1",
    orgId: "org-aarogya-strength",
    memberUserId: "user-aarav",
    memberName: "Nisha Menon",
    trainerUserId: "user-rhea",
    ptPlanId: "pt-plan-strength-12",
    planName: "1-on-1 Strength · 12 sessions",
    status: "ACTIVE",
    totalSessions: 12,
    remainingSessions: 7,
    amountPaise: 1200000,
    startsAt: hoursAgoIso(24 * 15),
    endsAt: hoursAgoIso(-24 * 30),
    createdAt: hoursAgoIso(24 * 15),
  },
  {
    id: "pt-sub-2",
    orgId: "org-aarogya-strength",
    memberUserId: "user-riya",
    memberName: "Ira Shah",
    trainerUserId: "user-rhea",
    ptPlanId: "pt-plan-transform-8",
    planName: "Transformation · 8 sessions",
    status: "ACTIVE",
    totalSessions: 8,
    remainingSessions: 8,
    amountPaise: 800000,
    startsAt: hoursAgoIso(24 * 3),
    endsAt: hoursAgoIso(-24 * 27),
    createdAt: hoursAgoIso(24 * 3),
  },
];

function demoCreatePtPlan(trainerUserId: string, body: Record<string, unknown>) {
  const toNumber = (value: unknown) => {
    const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const plan: DemoPtPlan = {
    id: `pt-plan-${Date.now()}`,
    orgId: activeOrg()?.id ?? "org-demo",
    trainerUserId,
    name: String(body.name ?? "PT package").trim() || "PT package",
    description: body.description ? String(body.description) : null,
    durationDays: toNumber(body.durationDays),
    sessionCount: toNumber(body.sessionCount),
    pricePaise: toNumber(body.pricePaise) ?? 0,
    active: true,
    createdAt: nowIso(),
  };
  demoPtPlans.unshift(plan);
  return { plan };
}

type DemoPayout = {
  id: string;
  trainerId: string;
  trainerName: string;
  totalPaise: number;
  status: string;
  period: string;
  paidAt: string | null;
  lines: Array<{
    id: string;
    kind: string;
    description: string;
    amountPaise: number;
    createdAt: string;
  }>;
};

const demoOrgPayouts: DemoPayout[] = [
  {
    id: "payout-rohan",
    trainerId: "user-rhea",
    trainerName: "Coach Rohan",
    totalPaise: 4250000,
    status: "ACCRUING",
    period: new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
    paidAt: null,
    lines: [
      { id: "payout-line-pt", kind: "Personal training", description: "PT sessions · 8 completed", amountPaise: 2400000, createdAt: nowIso() },
      { id: "payout-line-plans", kind: "Plan assignments", description: "Coached plans · 12 members", amountPaise: 1200000, createdAt: nowIso() },
      { id: "payout-line-classes", kind: "Group classes", description: "Class instruction · 6 sessions", amountPaise: 650000, createdAt: nowIso() },
    ],
  },
  {
    id: "payout-kavya",
    trainerId: "user-kabir",
    trainerName: "Coach Kavya",
    totalPaise: 2850000,
    status: "ACCRUING",
    period: new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
    paidAt: null,
    lines: [
      { id: "payout-line-kavya-pt", kind: "Personal training", description: "PT sessions · 5 completed", amountPaise: 1500000, createdAt: nowIso() },
      { id: "payout-line-kavya-classes", kind: "Group classes", description: "Class instruction · 9 sessions", amountPaise: 1350000, createdAt: nowIso() },
    ],
  },
];

function demoRecordPtSubscription(body: Record<string, unknown>) {
  const memberUserId = String(body.memberUserId ?? "");
  const member = zookDemoFixtures.users.find((user) => user.id === memberUserId);
  const planId = body.ptPlanId ? String(body.ptPlanId) : null;
  const plan = demoPtPlans.find((entry) => entry.id === planId);
  const totalSessions =
    typeof body.totalSessions === "number"
      ? body.totalSessions
      : (plan?.sessionCount ?? null);
  const subscription = {
    id: `pt-sub-${Date.now()}`,
    orgId: activeOrg()?.id ?? "org-demo",
    memberUserId,
    memberName: member?.name ?? "New client",
    trainerUserId: String(body.trainerUserId ?? "user-rhea"),
    ptPlanId: planId,
    planName: plan?.name ?? null,
    status: "ACTIVE",
    totalSessions,
    remainingSessions: totalSessions,
    amountPaise:
      typeof body.amountPaise === "number" ? body.amountPaise : (plan?.pricePaise ?? 0),
    startsAt: nowIso(),
    endsAt: hoursAgoIso(-24 * (plan?.durationDays ?? 30)),
    createdAt: nowIso(),
  };
  demoPtSubscriptions.unshift(subscription);
  return { subscription };
}

type DemoPtSessionLog = { id: string; subscriptionId: string; sessionAt: string; notes: string | null };

const demoPtSessionLogs: DemoPtSessionLog[] = [
  { id: "pt-log-seed-1", subscriptionId: "pt-sub-1", sessionAt: hoursAgoIso(24 * 12), notes: "Lower body · squat form" },
  { id: "pt-log-seed-2", subscriptionId: "pt-sub-1", sessionAt: hoursAgoIso(24 * 9), notes: "Upper body push" },
  { id: "pt-log-seed-3", subscriptionId: "pt-sub-1", sessionAt: hoursAgoIso(24 * 6), notes: "Deadlift progression" },
  { id: "pt-log-seed-4", subscriptionId: "pt-sub-1", sessionAt: hoursAgoIso(24 * 3), notes: "Conditioning + core" },
  { id: "pt-log-seed-5", subscriptionId: "pt-sub-1", sessionAt: hoursAgoIso(24 * 1), notes: "Full body · check-in" },
];

function demoLogPtSession(body: Record<string, unknown>) {
  const subscription = demoPtSubscriptions.find(
    (entry) => entry.id === String(body.subscriptionId ?? ""),
  );
  if (!subscription) {
    throw new Error("PT subscription not found.");
  }
  if (typeof subscription.remainingSessions === "number" && subscription.remainingSessions > 0) {
    subscription.remainingSessions -= 1;
  }
  const session: DemoPtSessionLog = {
    id: `pt-session-${Date.now()}`,
    subscriptionId: subscription.id,
    sessionAt: nowIso(),
    notes: body.notes ? String(body.notes) : null,
  };
  demoPtSessionLogs.unshift(session);
  return { subscription, session: { ...session, loggedAt: session.sessionAt } };
}

function demoMemberCoaching() {
  const memberUserId = "user-aarav";
  const subscription = demoPtSubscriptions.find(
    (entry) => entry.memberUserId === memberUserId && entry.status === "ACTIVE",
  );
  if (!subscription) {
    return { subscription: null, trainer: null, plan: null, sessions: [] };
  }
  const trainer = zookDemoFixtures.users.find((user) => user.id === subscription.trainerUserId);
  const plan = demoPtPlans.find((entry) => entry.id === subscription.ptPlanId);
  const sessions = demoPtSessionLogs
    .filter((log) => log.subscriptionId === subscription.id)
    .sort((a, b) => new Date(b.sessionAt).getTime() - new Date(a.sessionAt).getTime());
  return {
    subscription: {
      id: subscription.id,
      status: subscription.status,
      planName: subscription.planName,
      totalSessions: subscription.totalSessions,
      remainingSessions: subscription.remainingSessions,
      amountPaise: subscription.amountPaise,
      startsAt: subscription.startsAt,
      endsAt: subscription.endsAt,
    },
    trainer: trainer ? { id: trainer.id, name: trainer.name } : null,
    plan: plan
      ? { id: plan.id, name: plan.name, description: plan.description, sessionCount: plan.sessionCount }
      : null,
    sessions,
  };
}

const demoPayoutConfigs: Record<
  string,
  { baseMonthlyPaise: number; ptCommissionPercent: number; perSessionFeePaise: number; payDay: number }
> = {
  "user-rhea": { baseMonthlyPaise: 1500000, ptCommissionPercent: 40, perSessionFeePaise: 30000, payDay: 5 },
};

function demoGetPayoutConfig(trainerId: string) {
  return { config: demoPayoutConfigs[trainerId] ?? null };
}

function demoSetPayoutConfig(trainerId: string, body: Record<string, unknown>) {
  const toNumber = (value: unknown, fallback: number) => {
    const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const config = {
    baseMonthlyPaise: toNumber(body.baseMonthlyPaise, 0),
    ptCommissionPercent: toNumber(body.ptCommissionPercent, 0),
    perSessionFeePaise: toNumber(body.perSessionFeePaise, 0),
    payDay: toNumber(body.payDay, 5),
  };
  demoPayoutConfigs[trainerId] = config;
  return { config };
}

function demoTrainerPayouts(trainerId?: string) {
  return trainerId
    ? demoOrgPayouts.filter((payout) => payout.trainerId === trainerId)
    : demoOrgPayouts;
}

function demoMarkPayoutPaid(payoutId: string, body: Record<string, unknown>) {
  const payout = demoOrgPayouts.find((entry) => entry.id === payoutId);
  if (!payout) {
    throw new Error("Payout not found.");
  }
  payout.status = "PAID";
  payout.paidAt = nowIso();
  return { payout: { id: payout.id, status: payout.status, method: String(body.method ?? "") } };
}

const demoExtraTrainerClients = [
  {
    id: "assign-rohan-ira",
    orgId: "org-aarogya-strength",
    trainerUserId: "user-rhea",
    memberUserId: "user-riya",
    active: true,
  },
];

function demoTrainerClients() {
  return {
    clients: [...zookDemoFixtures.trainerClientAssignments, ...demoExtraTrainerClients].map((assignment) => {
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
          summaryNote: "Consistent attendance with progressive training load.",
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

// --- Group classes (offline demo) ------------------------------------------
// Booking state persists for the life of the JS runtime so the booking flow
// works end to end without a backend: book a class, the list updates, the
// status sticks across refetches and on the Home strip.
const demoClassEnrollments = new Map<string, "confirmed" | "waitlisted">();

type DemoClassTemplate = {
  id: string;
  name: string;
  description: string;
  classType: string;
  trainerId: string;
  trainerName: string;
  dayOffset: number;
  startHour: number;
  startMinute: number;
  durationMin: number;
  maxCapacity: number;
  enrolledCount: number;
  defaultEnrollment?: "confirmed" | "waitlisted";
};

const DEMO_CLASS_TEMPLATES: DemoClassTemplate[] = [
  {
    id: "class-hiit",
    name: "HIIT Burn",
    description: "45 minutes of high-intensity intervals to torch calories and build conditioning.",
    classType: "HIIT",
    trainerId: "user-rhea",
    trainerName: "Rohan",
    dayOffset: 0,
    startHour: 7,
    startMinute: 0,
    durationMin: 45,
    maxCapacity: 16,
    enrolledCount: 11,
  },
  {
    id: "class-strength-am",
    name: "Strength Foundations",
    description: "Coached barbell basics — squat, hinge and press with form cues for every level.",
    classType: "Strength",
    trainerId: "user-kabir",
    trainerName: "Kavya",
    dayOffset: 0,
    startHour: 9,
    startMinute: 30,
    durationMin: 60,
    maxCapacity: 12,
    enrolledCount: 8,
  },
  {
    id: "class-yoga",
    name: "Sunset Yoga Flow",
    description: "A calming vinyasa flow to unwind, improve mobility and breathe better.",
    classType: "Yoga",
    trainerId: "user-kabir",
    trainerName: "Kavya",
    dayOffset: 0,
    startHour: 18,
    startMinute: 30,
    durationMin: 60,
    maxCapacity: 20,
    enrolledCount: 14,
  },
  {
    id: "class-spin",
    name: "Spin Express",
    description: "A fast, music-driven indoor cycling session. Clip in and ride.",
    classType: "Cycling",
    trainerId: "user-rhea",
    trainerName: "Rohan",
    dayOffset: 0,
    startHour: 20,
    startMinute: 0,
    durationMin: 45,
    maxCapacity: 14,
    enrolledCount: 14,
  },
  {
    id: "class-push-power",
    name: "Push Day Power",
    description: "Chest, shoulders and triceps with progressive overload. Pairs with your plan.",
    classType: "Strength",
    trainerId: "user-rhea",
    trainerName: "Rohan",
    dayOffset: 1,
    startHour: 7,
    startMinute: 0,
    durationMin: 60,
    maxCapacity: 12,
    enrolledCount: 5,
    defaultEnrollment: "confirmed",
  },
  {
    id: "class-zumba",
    name: "Zumba Dance Fit",
    description: "Dance your way fit with high-energy choreography. No experience needed.",
    classType: "Dance",
    trainerId: "user-kabir",
    trainerName: "Kavya",
    dayOffset: 1,
    startHour: 18,
    startMinute: 0,
    durationMin: 60,
    maxCapacity: 25,
    enrolledCount: 18,
  },
  {
    id: "class-mobility",
    name: "Mobility & Stretch",
    description: "Release tight hips and shoulders with guided stretching and foam rolling.",
    classType: "Mobility",
    trainerId: "user-kabir",
    trainerName: "Kavya",
    dayOffset: 2,
    startHour: 8,
    startMinute: 0,
    durationMin: 45,
    maxCapacity: 16,
    enrolledCount: 6,
  },
  {
    id: "class-boxing",
    name: "Boxing Basics",
    description: "Learn the fundamentals — stance, jab, cross and footwork on the bags.",
    classType: "Boxing",
    trainerId: "user-rhea",
    trainerName: "Rohan",
    dayOffset: 2,
    startHour: 19,
    startMinute: 0,
    durationMin: 60,
    maxCapacity: 12,
    enrolledCount: 9,
  },
];

function classStartDate(template: DemoClassTemplate) {
  const date = new Date();
  date.setHours(template.startHour, template.startMinute, 0, 0);
  date.setDate(date.getDate() + template.dayOffset);
  return date;
}

function demoClassRecord(template: DemoClassTemplate) {
  const branch = zookDemoFixtures.branches[0];
  const start = classStartDate(template);
  const end = new Date(start.getTime() + template.durationMin * 60 * 1000);
  const userStatus = demoClassEnrollments.get(template.id) ?? template.defaultEnrollment ?? null;
  const baseHasSeat = template.defaultEnrollment === "confirmed";
  const userTakesSeat = userStatus === "confirmed" && !baseHasSeat;
  const enrollmentCount = template.enrolledCount + (userTakesSeat ? 1 : 0);
  const remainingCapacity = Math.max(0, template.maxCapacity - enrollmentCount);
  return {
    id: template.id,
    orgId: activeOrg()?.id ?? "org-demo",
    branchId: branch?.id ?? "branch-default",
    branchName: branch?.name ?? null,
    trainerId: template.trainerId,
    trainerName: template.trainerName,
    name: template.name,
    description: template.description,
    classType: template.classType,
    maxCapacity: template.maxCapacity,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    recurrenceRule: null,
    status: "SCHEDULED",
    createdAt: nowIso(),
    enrollmentCount,
    remainingCapacity,
    myEnrollmentStatus: userStatus,
  };
}

// Classes scheduled in-app (by a trainer/owner) appear in the member class list
// — closing the loop: schedule a class, members can book it.
type DemoScheduledClass = {
  id: string;
  orgId: string;
  branchId: string;
  branchName: string | null;
  trainerId: string;
  trainerName: string;
  name: string;
  description: string | null;
  classType: string;
  maxCapacity: number;
  startTime: string;
  endTime: string;
  recurrenceRule: string | null;
  status: string;
  createdAt: string;
  enrollmentCount: number;
  remainingCapacity: number;
  myEnrollmentStatus: string | null;
};

const demoScheduledClasses: DemoScheduledClass[] = [];

function demoClasses() {
  return [...DEMO_CLASS_TEMPLATES.map(demoClassRecord), ...demoScheduledClasses].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
}

function demoCreateClass(body: Record<string, unknown>) {
  const toNumber = (value: unknown, fallback: number) => {
    const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const branch = zookDemoFixtures.branches[0];
  const trainerId = String(body.trainerId ?? "user-rhea");
  const trainerUser = zookDemoFixtures.users.find((user) => user.id === trainerId);
  const start = body.startTime ? new Date(String(body.startTime)) : new Date(Date.now() + 86_400_000);
  const durationMin = toNumber(body.durationMin, 60);
  const end = new Date(start.getTime() + durationMin * 60 * 1000);
  const maxCapacity = toNumber(body.maxCapacity, 16);
  const cls: DemoScheduledClass = {
    id: `class-custom-${Date.now()}`,
    orgId: activeOrg()?.id ?? "org-demo",
    branchId: branch?.id ?? "branch-default",
    branchName: branch?.name ?? null,
    trainerId,
    trainerName: (trainerUser?.name ?? "Coach").replace(/^Coach\s+/i, ""),
    name: String(body.name ?? "New class").trim() || "New class",
    description: body.description ? String(body.description) : null,
    classType: String(body.classType ?? "Strength"),
    maxCapacity,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    recurrenceRule: null,
    status: "SCHEDULED",
    createdAt: nowIso(),
    enrollmentCount: 0,
    remainingCapacity: maxCapacity,
    myEnrollmentStatus: null as string | null,
  };
  demoScheduledClasses.unshift(cls);
  return { class: cls };
}

function demoEnrollInClass(classId: string) {
  const template = DEMO_CLASS_TEMPLATES.find((entry) => entry.id === classId);
  if (!template) {
    const scheduled = demoScheduledClasses.find((entry) => entry.id === classId);
    if (!scheduled) {
      throw new Error("That class could not be found.");
    }
    if (!scheduled.myEnrollmentStatus) {
      const full = scheduled.remainingCapacity <= 0;
      scheduled.myEnrollmentStatus = full ? "waitlisted" : "confirmed";
      if (!full) {
        scheduled.enrollmentCount += 1;
        scheduled.remainingCapacity = Math.max(0, scheduled.remainingCapacity - 1);
      }
    }
    return {
      enrollment: { id: `enroll-${classId}`, status: scheduled.myEnrollmentStatus },
      remainingCapacity: scheduled.remainingCapacity,
    };
  }
  const existing = demoClassEnrollments.get(classId) ?? template.defaultEnrollment ?? null;
  if (existing) {
    const record = demoClassRecord(template);
    return { enrollment: { id: `enroll-${classId}`, status: existing }, remainingCapacity: record.remainingCapacity };
  }
  const isFull = template.maxCapacity - template.enrolledCount <= 0;
  const status: "confirmed" | "waitlisted" = isFull ? "waitlisted" : "confirmed";
  demoClassEnrollments.set(classId, status);
  const record = demoClassRecord(template);
  return {
    enrollment: { id: `enroll-${classId}`, status },
    remainingCapacity: record.remainingCapacity,
  };
}

// --- Diet (offline demo) ---------------------------------------------------
// Logged meals persist for the life of the JS runtime so meal logging works
// end to end: log a meal and the day's calorie roll-up updates immediately.
type DemoMealLog = {
  id: string;
  mealName: string;
  loggedAt: string;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatsG: number | null;
  notes: string | null;
};

const demoMealLogs: DemoMealLog[] = [
  {
    id: "meal-log-seed-breakfast",
    mealName: "Paneer bhurji + multigrain toast",
    loggedAt: new Date(new Date().setHours(8, 15, 0, 0)).toISOString(),
    calories: 420,
    proteinG: 28,
    carbsG: 38,
    fatsG: 16,
    notes: null,
  },
];

function demoDietPlan() {
  return {
    id: "diet-plan-aarav",
    title: "Muscle Gain · Vegetarian",
    calorieTarget: 2400,
    proteinG: 150,
    carbsG: 260,
    fatsG: 70,
    status: "ACTIVE",
    meals: [
      {
        id: "diet-meal-breakfast",
        name: "Breakfast",
        timeOfDay: "8:00 AM",
        items: ["Paneer bhurji", "Multigrain toast", "Black coffee"],
        calories: 420,
        proteinG: 28,
        carbsG: 38,
        fatsG: 16,
        order: 1,
      },
      {
        id: "diet-meal-midmorning",
        name: "Mid-morning",
        timeOfDay: "11:00 AM",
        items: ["Greek yogurt", "Almonds", "Apple"],
        calories: 240,
        proteinG: 18,
        carbsG: 22,
        fatsG: 10,
        order: 2,
      },
      {
        id: "diet-meal-lunch",
        name: "Lunch",
        timeOfDay: "1:30 PM",
        items: ["Rajma", "Brown rice", "Mixed salad", "Curd"],
        calories: 560,
        proteinG: 24,
        carbsG: 82,
        fatsG: 12,
        order: 3,
      },
      {
        id: "diet-meal-snack",
        name: "Pre-workout",
        timeOfDay: "5:00 PM",
        items: ["Whey protein shake", "Banana"],
        calories: 320,
        proteinG: 30,
        carbsG: 38,
        fatsG: 4,
        order: 4,
      },
      {
        id: "diet-meal-dinner",
        name: "Dinner",
        timeOfDay: "8:30 PM",
        items: ["Tofu stir-fry", "Two rotis", "Sauteed greens"],
        calories: 480,
        proteinG: 32,
        carbsG: 46,
        fatsG: 16,
        order: 5,
      },
    ],
  };
}

// When a trainer publishes a diet plan for a client it replaces the member's
// active plan, so the member's Diet tab shows it — closing the trainer→member
// diet loop.
let demoOverrideDietPlan: ReturnType<typeof demoDietPlan> | null = null;

function demoCurrentDietPlan() {
  return demoOverrideDietPlan ?? demoDietPlan();
}

function demoCreateClientDietPlan(body: Record<string, unknown>) {
  const toNumber = (value: unknown) => {
    const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const rawMeals = Array.isArray(body.meals) ? body.meals : [];
  const meals = rawMeals.map((entry, index) => {
    const meal = (entry ?? {}) as Record<string, unknown>;
    return {
      id: `diet-meal-${Date.now()}-${index}`,
      name: String(meal.name ?? `Meal ${index + 1}`),
      timeOfDay: meal.timeOfDay ? String(meal.timeOfDay) : null,
      items: Array.isArray(meal.items) ? (meal.items as string[]) : [],
      calories: toNumber(meal.calories),
      proteinG: toNumber(meal.proteinG),
      carbsG: toNumber(meal.carbsG),
      fatsG: toNumber(meal.fatsG),
      order: index + 1,
    };
  });
  const plan = {
    id: `diet-plan-${Date.now()}`,
    title: String(body.title ?? "Coached diet plan").trim() || "Coached diet plan",
    calorieTarget: toNumber(body.calorieTarget) ?? 2000,
    proteinG: toNumber(body.proteinG) ?? 0,
    carbsG: toNumber(body.carbsG) ?? 0,
    fatsG: toNumber(body.fatsG) ?? 0,
    status: "ACTIVE",
    meals,
  };
  demoOverrideDietPlan = plan as ReturnType<typeof demoDietPlan>;
  return { plan };
}

function demoLogMeal(body: Record<string, unknown>) {
  const toNumber = (value: unknown) => {
    const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const log: DemoMealLog = {
    id: `meal-log-${Date.now()}`,
    mealName: String(body.mealName ?? "Meal").trim() || "Meal",
    loggedAt: nowIso(),
    calories: toNumber(body.calories),
    proteinG: toNumber(body.proteinG),
    carbsG: toNumber(body.carbsG),
    fatsG: toNumber(body.fatsG),
    notes: body.notes ? String(body.notes) : null,
  };
  demoMealLogs.unshift(log);
  return { log };
}

// --- Tracking (offline demo) -----------------------------------------------
// Workout + body-progress logs persist for the life of the JS runtime so the
// log flows work end to end: log a workout and Progress / history update, with
// the Home stats roll-up kept consistent with the list.
function hoursAgoIso(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

type DemoWorkoutLog = {
  id: string;
  title: string;
  workoutType: string;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
  intensity: string | null;
  notes: string | null;
  exercises: Array<{
    id: string;
    exerciseName: string;
    setsCompleted?: number | null;
    reps?: number | null;
    weightKg?: number | null;
    completed: boolean;
  }>;
};

const demoWorkoutLogs: DemoWorkoutLog[] = [
  {
    id: "workout-log-push",
    title: "Push Day",
    workoutType: "STRENGTH",
    startedAt: hoursAgoIso(6),
    endedAt: hoursAgoIso(5),
    durationMinutes: 55,
    intensity: "HARD",
    notes: "Hit a new top set on bench.",
    exercises: [
      { id: "wl-1", exerciseName: "Bench Press", setsCompleted: 4, reps: 8, weightKg: 60, completed: true },
      { id: "wl-2", exerciseName: "Incline Dumbbell Press", setsCompleted: 3, reps: 10, weightKg: 22, completed: true },
      { id: "wl-3", exerciseName: "Shoulder Press", setsCompleted: 3, reps: 10, weightKg: 18, completed: true },
    ],
  },
  {
    id: "workout-log-legs",
    title: "Leg Day",
    workoutType: "STRENGTH",
    startedAt: hoursAgoIso(54),
    endedAt: hoursAgoIso(53),
    durationMinutes: 48,
    intensity: "MODERATE",
    notes: null,
    exercises: [
      { id: "wl-4", exerciseName: "Back Squat", setsCompleted: 4, reps: 6, weightKg: 80, completed: true },
      { id: "wl-5", exerciseName: "Romanian Deadlift", setsCompleted: 3, reps: 10, weightKg: 60, completed: true },
    ],
  },
  {
    id: "workout-log-cardio",
    title: "Zone 2 Cardio",
    workoutType: "CARDIO",
    startedAt: hoursAgoIso(78),
    endedAt: hoursAgoIso(77),
    durationMinutes: 30,
    intensity: "EASY",
    notes: "Treadmill incline walk.",
    exercises: [],
  },
];

type DemoBodyProgress = {
  id: string;
  userId: string;
  measuredAt: string;
  weightKg: number | null;
  waistCm: number | null;
  chestCm: number | null;
  armCm: number | null;
  bodyFatPercent: number | null;
  notes: string | null;
};

const demoBodyProgress: DemoBodyProgress[] = [
  {
    id: "body-progress-1",
    userId: "user-aarav",
    measuredAt: hoursAgoIso(6),
    weightKg: 78,
    waistCm: 84,
    chestCm: 102,
    armCm: 37,
    bodyFatPercent: 18,
    notes: null,
  },
  {
    id: "body-progress-2",
    userId: "user-aarav",
    measuredAt: hoursAgoIso(24 * 14),
    weightKg: 79.5,
    waistCm: 86,
    chestCm: 101,
    armCm: 36,
    bodyFatPercent: 19.5,
    notes: "Start of the cut.",
  },
];

type DemoHabitLog = {
  id: string;
  habitId: string;
  loggedAt: string;
  value: number | null;
  notes: string | null;
  completed: boolean;
};

type DemoHabit = {
  id: string;
  title: string;
  category: string;
  targetValue: number | null;
  unit: string | null;
  frequency: string;
  visibility: string;
  active: boolean;
  createdAt: string;
  logs: DemoHabitLog[];
};

const demoHabits: DemoHabit[] = [
  {
    id: "habit-water",
    title: "Drink 3L water",
    category: "HYDRATION",
    targetValue: 3,
    unit: "L",
    frequency: "DAILY",
    visibility: "PRIVATE",
    active: true,
    createdAt: hoursAgoIso(24 * 9),
    logs: [
      {
        id: "habit-water-log-1",
        habitId: "habit-water",
        loggedAt: hoursAgoIso(3),
        value: null,
        notes: null,
        completed: true,
      },
      {
        id: "habit-water-log-2",
        habitId: "habit-water",
        loggedAt: hoursAgoIso(27),
        value: null,
        notes: null,
        completed: true,
      },
    ],
  },
  {
    id: "habit-steps",
    title: "10,000 steps",
    category: "STEPS",
    targetValue: 10000,
    unit: "steps",
    frequency: "DAILY",
    visibility: "PRIVATE",
    active: true,
    createdAt: hoursAgoIso(24 * 5),
    logs: [],
  },
];

function isToday(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

function demoCreateHabit(body: Record<string, unknown>) {
  const toNumber = (value: unknown) => {
    const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const habit: DemoHabit = {
    id: `habit-${Date.now()}`,
    title: String(body.title ?? "Habit").trim() || "Habit",
    category: String(body.category ?? "CUSTOM"),
    targetValue: toNumber(body.targetValue),
    unit: body.unit ? String(body.unit) : null,
    frequency: String(body.frequency ?? "DAILY"),
    visibility: String(body.visibility ?? "PRIVATE"),
    active: true,
    createdAt: nowIso(),
    logs: [],
  };
  demoHabits.unshift(habit);
  return { habit };
}

function demoLogHabit(habitId: string, body: Record<string, unknown>) {
  const habit = demoHabits.find((entry) => entry.id === habitId);
  if (!habit) {
    throw new Error("Habit not found.");
  }
  const completed = body.completed !== false;
  // Toggle today's log so tapping a completed habit clears it.
  const existingTodayIndex = habit.logs.findIndex((log) => isToday(log.loggedAt));
  if (existingTodayIndex >= 0 && !completed) {
    habit.logs.splice(existingTodayIndex, 1);
    return { log: { id: `habit-log-${Date.now()}` } };
  }
  const log: DemoHabitLog = {
    id: `habit-log-${Date.now()}`,
    habitId: habit.id,
    loggedAt: nowIso(),
    value: null,
    notes: null,
    completed: true,
  };
  if (existingTodayIndex < 0) {
    habit.logs.unshift(log);
  }
  return { log };
}

function startOfThisWeek() {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function demoTrackingSummary() {
  const weekStart = startOfThisWeek();
  const weeklyCount = demoWorkoutLogs.filter(
    (workout) => new Date(workout.startedAt).getTime() >= weekStart,
  ).length;
  // totalDuration is in minutes (backend sums durationMinutes).
  const totalDurationMinutes = demoWorkoutLogs.reduce(
    (total, workout) => total + (workout.durationMinutes ?? 0),
    0,
  );
  return {
    summary: {
      weeklyCount,
      totalDuration: totalDurationMinutes,
      recentCount: demoWorkoutLogs.length,
    },
    recentWorkouts: demoWorkoutLogs.slice(0, 3),
    latestBodyProgress: demoBodyProgress[0] ?? { weightKg: 78, measuredAt: nowIso() },
    habits: demoHabits,
  };
}

function demoCreateWorkout(body: Record<string, unknown>) {
  const toNumber = (value: unknown) => {
    const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const exercisesInput = Array.isArray(body.exercises) ? body.exercises : [];
  const startedAt = body.startedAt ? String(body.startedAt) : nowIso();
  const durationMinutes = toNumber(body.durationMinutes);
  const workout: DemoWorkoutLog = {
    id: `workout-log-${Date.now()}`,
    title: String(body.title ?? "Workout").trim() || "Workout",
    workoutType: String(body.workoutType ?? "STRENGTH"),
    startedAt,
    endedAt: body.endedAt ? String(body.endedAt) : nowIso(),
    durationMinutes,
    intensity: body.intensity ? String(body.intensity) : null,
    notes: body.notes ? String(body.notes) : null,
    exercises: exercisesInput.map((entry, index) => {
      const item = (entry ?? {}) as Record<string, unknown>;
      return {
        id: `wl-new-${Date.now()}-${index}`,
        exerciseName: String(item.exerciseName ?? item.name ?? "Exercise"),
        setsCompleted: toNumber(item.setsCompleted ?? item.sets),
        reps: toNumber(item.reps),
        weightKg: toNumber(item.weightKg),
        completed: item.completed !== false,
      };
    }),
  };
  demoWorkoutLogs.unshift(workout);
  return { workout };
}

function demoRecordBodyProgress(body: Record<string, unknown>) {
  const toNumber = (value: unknown) => {
    const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
    return Number.isFinite(parsed) ? parsed : null;
  };
  const entry: DemoBodyProgress = {
    id: `body-progress-${Date.now()}`,
    userId: "user-aarav",
    measuredAt: body.measuredAt ? String(body.measuredAt) : nowIso(),
    weightKg: toNumber(body.weightKg),
    waistCm: toNumber(body.waistCm),
    chestCm: toNumber(body.chestCm),
    armCm: toNumber(body.armCm),
    bodyFatPercent: toNumber(body.bodyFatPercent),
    notes: body.notes ? String(body.notes) : null,
  };
  demoBodyProgress.unshift(entry);
  return { entry: { id: entry.id } };
}

// Gym referral program customisations (offline demo, stateful).
const demoReferralPolicy: Record<string, unknown> = {
  id: "referral-policy-demo",
  orgId: "org-aarogya-strength",
  enabled: true,
  referrerRewardType: "DAYS",
  referrerRewardValue: 7,
  referredDiscountType: "PERCENTAGE",
  referredDiscountValue: 1000,
  maxDiscountCapBps: 3000,
  maxReferralsPerMonth: 10,
  referralCodeExpiryDays: 90,
  trainerReferralEnabled: true,
  staffReferralEnabled: false,
  trainerRewardType: "DAYS",
  trainerRewardValue: 14,
  memberGymReferralRewardPaise: 250000,
};

function demoUpdateReferralPolicy(body: Record<string, unknown>) {
  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined) demoReferralPolicy[key] = value;
  }
  return { policy: demoReferralPolicy };
}

function demoReferralCodes() {
  // Seed real referral activity so the referrer side shows friends joined +
  // credits earned instead of an empty, dead-feeling card.
  const referralCodes = zookDemoFixtures.referralCodes.map((code) => ({
    ...code,
    redemptionCount: 3,
    maxUses: 10,
  }));
  const rewards = [
    { id: "reward-1", status: "applied", rewardType: "CREDIT", rewardValue: 25000, createdAt: hoursAgoIso(24 * 12) },
    { id: "reward-2", status: "applied", rewardType: "CREDIT", rewardValue: 25000, createdAt: hoursAgoIso(24 * 6) },
    { id: "reward-3", status: "pending", rewardType: "CREDIT", rewardValue: 25000, createdAt: hoursAgoIso(24 * 2) },
  ];
  return {
    referralCodes,
    rewards,
    links: {
      web: "https://zookfit.in/r/ROHAN500",
      short: "zook.fit/r/ROHAN500",
      app: "zook://r/ROHAN500",
    },
    policy: { rewardValuePaise: 25000, rewardType: "CREDIT" },
  };
}

// Orders placed during the session persist so checkout → pickup → history
// works end to end (newest first, ahead of the seeded fixture order).
type DemoCreatedOrder = {
  id: string;
  orgId: string;
  memberUserId: string;
  status: string;
  totalPaise: number;
  pickupCode: string;
  createdAt: string;
  items: Array<{ productId: string; quantity: number; unitPaise: number }>;
};

const demoCreatedOrders: DemoCreatedOrder[] = [];

function enrichOrder<
  T extends {
    memberUserId: string;
    items: Array<{ productId: string; quantity: number; unitPaise: number }>;
  },
>(order: T) {
  return {
    ...order,
    user: zookDemoFixtures.users.find((user) => user.id === order.memberUserId) ?? null,
    userId: order.memberUserId,
    items: order.items.map((item) => ({
      ...item,
      product:
        zookDemoFixtures.shopProducts.find((product) => product.id === item.productId) ?? null,
    })),
  };
}

function demoCreateShopOrder(body: Record<string, unknown>) {
  const session = getOfflineDemoSession();
  const rawItems = Array.isArray(body.items) ? body.items : [];
  const items = rawItems
    .map((entry) => {
      const item = (entry ?? {}) as Record<string, unknown>;
      const productId = String(item.productId ?? "");
      const product = zookDemoFixtures.shopProducts.find((candidate) => candidate.id === productId);
      const quantity = Math.max(1, Number(item.quantity) || 1);
      return product
        ? { productId, quantity, unitPaise: product.pricePaise }
        : null;
    })
    .filter((item): item is { productId: string; quantity: number; unitPaise: number } =>
      Boolean(item),
    );
  const totalPaise = items.reduce((total, item) => total + item.unitPaise * item.quantity, 0);
  const order: DemoCreatedOrder = {
    id: `order-${Date.now()}`,
    orgId: activeOrg()?.id ?? "org-demo",
    memberUserId: session.user.id,
    status: "READY_FOR_PICKUP",
    totalPaise,
    pickupCode: `PU-${String(1000 + Math.floor(Math.random() * 9000))}`,
    createdAt: nowIso(),
    items: items.length
      ? items
      : [{ productId: zookDemoFixtures.shopProducts[0]?.id ?? "product", quantity: 1, unitPaise: 14900 }],
  };
  demoCreatedOrders.unshift(order);
  return enrichOrder(order);
}

// --- Invoicing (offline demo) ----------------------------------------------
function demoSucceededPayment() {
  return {
    id: "payment-hybrid-success",
    orgId: activeOrg()?.id ?? "org-demo",
    purpose: "MEMBERSHIP",
    amountPaise: 249900,
    status: "SUCCEEDED",
    mode: "DIRECT_UPI",
    paymentMode: "DIRECT_UPI",
    receiptNumber: "RC-2026-0042",
    recordedAt: hoursAgoIso(24 * 5),
    createdAt: hoursAgoIso(24 * 5),
  };
}

function demoInvoices() {
  return [
    {
      id: "invoice-hybrid",
      orgId: activeOrg()?.id ?? "org-demo",
      paymentId: "payment-hybrid-success",
      invoiceNumber: "INV-2026-0042",
      invoiceNo: "INV-2026-0042",
      invoiceUrl: "/api/me/invoices/invoice-hybrid/pdf",
      issueDate: hoursAgoIso(24 * 5),
      issuedAt: hoursAgoIso(24 * 5),
      subtotalPaise: 211780,
      gstPaise: 38120,
      totalPaise: 249900,
      amountPaise: 249900,
      status: "ISSUED",
      invoiceStatus: "ISSUED",
    },
  ];
}

// Recent org payments (stateful) so refunds work end to end: refund flips the
// payment status to REFUNDED and it shows as refunded in the revenue list.
const demoRecentPayments: Array<Record<string, unknown>> = [
  {
    id: "payment-hybrid-success",
    orgId: "org-aarogya-strength",
    memberUserId: "user-aarav",
    user: { id: "user-aarav", name: "Nisha Menon" },
    purpose: "MEMBERSHIP",
    amountPaise: 249900,
    status: "SUCCEEDED",
    mode: "DIRECT_UPI",
    receiptNumber: "RC-2026-0042",
    createdAt: hoursAgoIso(24 * 5),
    recordedAt: hoursAgoIso(24 * 5),
  },
  {
    id: "payment-trial-success",
    orgId: "org-aarogya-strength",
    memberUserId: "user-riya",
    user: { id: "user-riya", name: "Ira Shah" },
    purpose: "MEMBERSHIP",
    amountPaise: 19900,
    status: "SUCCEEDED",
    mode: "CASH",
    receiptNumber: "RC-2026-0043",
    createdAt: hoursAgoIso(24 * 2),
    recordedAt: hoursAgoIso(24 * 2),
  },
  ...(zookDemoFixtures.payments.map((payment) => ({ ...payment })) as unknown as Array<
    Record<string, unknown>
  >),
];

function demoRefundPayment(paymentId: string, body: Record<string, unknown>) {
  const payment = demoRecentPayments.find((entry) => entry.id === paymentId);
  if (!payment) {
    throw new Error("Payment not found.");
  }
  payment.status = "REFUNDED";
  payment.refundedAt = nowIso();
  payment.refundReason = body.reason ? String(body.reason) : null;
  return { payment, refund: { id: `refund-${Date.now()}`, status: "REFUNDED" } };
}

function demoPaymentDocument(paymentId: string, kind: "receipt" | "invoice") {
  if (kind === "receipt") {
    return {
      receiptNumber: "RC-2026-0042",
      receiptUrl: `/api/me/payments/${paymentId}/receipt/pdf`,
      payment: demoSucceededPayment(),
    };
  }
  const invoice = demoInvoices()[0];
  return {
    invoice,
    invoiceUrl: invoice.invoiceUrl,
    payment: demoSucceededPayment(),
  };
}

// --- Membership plans management (owner, offline demo, stateful) -----------
type DemoMembershipPlan = {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  type: string;
  pricePaise: number;
  durationDays: number | null;
  visitLimit: number | null;
  validityDays: number | null;
  publicVisible: boolean;
  active: boolean;
};

const demoMembershipPlans: DemoMembershipPlan[] = zookDemoFixtures.membershipPlans.map((plan) => ({
  id: plan.id,
  orgId: plan.orgId,
  name: plan.name,
  description: plan.description ?? null,
  type: plan.type,
  pricePaise: plan.pricePaise,
  durationDays: plan.durationDays ?? null,
  visitLimit: plan.visitLimit ?? null,
  validityDays: null,
  publicVisible: plan.publicVisible ?? true,
  active: true,
}));

function demoPlanFromBody(body: Record<string, unknown>, base?: DemoMembershipPlan): DemoMembershipPlan {
  const toNumber = (value: unknown) => {
    const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
    return Number.isFinite(parsed) ? parsed : null;
  };
  return {
    id: base?.id ?? `plan-${Date.now()}`,
    orgId: activeOrg()?.id ?? "org-demo",
    name: body.name !== undefined ? String(body.name) : (base?.name ?? "Plan"),
    description: body.description !== undefined ? String(body.description) || null : (base?.description ?? null),
    type: body.type !== undefined ? String(body.type) : (base?.type ?? "DURATION"),
    pricePaise: body.pricePaise !== undefined ? (toNumber(body.pricePaise) ?? 0) : (base?.pricePaise ?? 0),
    durationDays: body.durationDays !== undefined ? toNumber(body.durationDays) : (base?.durationDays ?? null),
    visitLimit: body.visitLimit !== undefined ? toNumber(body.visitLimit) : (base?.visitLimit ?? null),
    validityDays: body.validityDays !== undefined ? toNumber(body.validityDays) : (base?.validityDays ?? null),
    publicVisible: body.publicVisible !== undefined ? Boolean(body.publicVisible) : (base?.publicVisible ?? true),
    active: true,
  };
}

function demoCreateMembershipPlan(body: Record<string, unknown>) {
  const plan = demoPlanFromBody(body);
  demoMembershipPlans.unshift(plan);
  return { plan };
}

function demoUpdateMembershipPlan(planId: string, body: Record<string, unknown>) {
  const index = demoMembershipPlans.findIndex((plan) => plan.id === planId);
  if (index < 0) throw new Error("Plan not found.");
  const updated = demoPlanFromBody(body, demoMembershipPlans[index]);
  demoMembershipPlans[index] = updated;
  return { plan: updated };
}

function demoDeleteMembershipPlan(planId: string) {
  const index = demoMembershipPlans.findIndex((plan) => plan.id === planId);
  if (index >= 0) demoMembershipPlans.splice(index, 1);
  return { ok: true };
}

// --- Staff management (owner, offline demo, stateful) ----------------------
type DemoStaffRow = {
  id: string;
  userId: string;
  role: string;
  branchId: string | null;
  pending: boolean;
  user: { id: string; name: string | null; email: string };
};

const demoStaff: DemoStaffRow[] = [
  {
    id: "role-owner-owner",
    userId: "user-owner",
    role: "OWNER",
    branchId: null,
    pending: false,
    user: { id: "user-owner", name: "Aditya Rao", email: "owner@zook.local" },
  },
  {
    id: "role-rohan-trainer",
    userId: "user-rhea",
    role: "TRAINER",
    branchId: null,
    pending: false,
    user: { id: "user-rhea", name: "Coach Rohan", email: "trainer@zook.local" },
  },
  {
    id: "role-priya-reception",
    userId: "user-priya",
    role: "RECEPTIONIST",
    branchId: null,
    pending: false,
    user: { id: "user-priya", name: "Farah Khan", email: "reception@zook.local" },
  },
];

function demoStaffPayload() {
  return {
    staff: demoStaff.map((row) => ({
      id: row.id,
      userId: row.userId,
      role: row.role,
      branchId: row.branchId,
      pending: row.pending,
    })),
    users: demoStaff.map((row) => row.user),
  };
}

function demoInviteStaff(body: Record<string, unknown>) {
  const email = String(body.email ?? "").trim().toLowerCase();
  const role = String(body.role ?? "TRAINER");
  const id = `invite-${Date.now()}`;
  const userId = `pending-${Date.now()}`;
  demoStaff.push({
    id,
    userId,
    role,
    branchId: body.branchId ? String(body.branchId) : null,
    pending: true,
    user: { id: userId, name: email.split("@")[0] ?? email, email },
  });
  return { invite: { id, email, role } };
}

function demoUpdateStaffRole(assignmentId: string, body: Record<string, unknown>) {
  const row = demoStaff.find((entry) => entry.id === assignmentId);
  if (!row) throw new Error("Staff member not found.");
  row.role = String(body.role ?? row.role);
  row.branchId = body.branchId ? String(body.branchId) : null;
  return { assignment: { id: row.id, userId: row.userId, role: row.role, branchId: row.branchId } };
}

function demoRemoveStaff(assignmentId: string) {
  const index = demoStaff.findIndex((entry) => entry.id === assignmentId);
  if (index >= 0) demoStaff.splice(index, 1);
  return { ok: true };
}

// --- Coupons & offers (owner, offline demo, stateful) ----------------------
type DemoCoupon = {
  id: string;
  orgId: string;
  code: string;
  type: "FIXED_AMOUNT" | "PERCENTAGE";
  valuePaise: number | null;
  valuePercentBps: number | null;
  active: boolean;
  maxRedemptions: number | null;
  redemptionCount: number;
  perUserLimit: number | null;
  applicablePlanId: string | null;
  createdAt: string;
};

const demoCoupons: DemoCoupon[] = [
  {
    id: "coupon-welcome",
    orgId: "org-aarogya-strength",
    code: "WELCOME15",
    type: "PERCENTAGE",
    valuePaise: null,
    valuePercentBps: 1500,
    active: true,
    maxRedemptions: 100,
    redemptionCount: 23,
    perUserLimit: 1,
    applicablePlanId: null,
    createdAt: hoursAgoIso(24 * 30),
  },
  {
    id: "coupon-festive",
    orgId: "org-aarogya-strength",
    code: "FESTIVE500",
    type: "FIXED_AMOUNT",
    valuePaise: 50000,
    valuePercentBps: null,
    active: true,
    maxRedemptions: null,
    redemptionCount: 8,
    perUserLimit: 1,
    applicablePlanId: null,
    createdAt: hoursAgoIso(24 * 6),
  },
];

function demoCouponFromBody(body: Record<string, unknown>, base?: DemoCoupon): DemoCoupon {
  const toNumber = (value: unknown) => {
    const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const type = (body.type !== undefined ? String(body.type) : base?.type ?? "PERCENTAGE") as DemoCoupon["type"];
  return {
    id: base?.id ?? `coupon-${Date.now()}`,
    orgId: activeOrg()?.id ?? "org-demo",
    code: body.code !== undefined ? String(body.code).toUpperCase() : base?.code ?? "CODE",
    type,
    valuePaise: type === "FIXED_AMOUNT" ? (body.valuePaise !== undefined ? toNumber(body.valuePaise) : base?.valuePaise ?? null) : null,
    valuePercentBps: type === "PERCENTAGE" ? (body.valuePercentBps !== undefined ? toNumber(body.valuePercentBps) : base?.valuePercentBps ?? null) : null,
    active: body.active !== undefined ? Boolean(body.active) : base?.active ?? true,
    maxRedemptions: body.maxRedemptions !== undefined ? toNumber(body.maxRedemptions) : base?.maxRedemptions ?? null,
    redemptionCount: base?.redemptionCount ?? 0,
    perUserLimit: body.perUserLimit !== undefined ? toNumber(body.perUserLimit) : base?.perUserLimit ?? null,
    applicablePlanId: body.applicablePlanId !== undefined ? (String(body.applicablePlanId) || null) : base?.applicablePlanId ?? null,
    createdAt: base?.createdAt ?? nowIso(),
  };
}

function demoCreateCoupon(body: Record<string, unknown>) {
  const coupon = demoCouponFromBody(body);
  demoCoupons.unshift(coupon);
  return { coupon };
}

function demoUpdateCoupon(couponId: string, body: Record<string, unknown>) {
  const index = demoCoupons.findIndex((coupon) => coupon.id === couponId);
  if (index < 0) throw new Error("Coupon not found.");
  const updated = demoCouponFromBody(body, demoCoupons[index]);
  demoCoupons[index] = updated;
  return { coupon: updated };
}

function demoDeleteCoupon(couponId: string) {
  const index = demoCoupons.findIndex((coupon) => coupon.id === couponId);
  if (index >= 0) demoCoupons.splice(index, 1);
  return { ok: true };
}

function demoShopOrders() {
  return [...demoCreatedOrders, ...zookDemoFixtures.shopOrders].map((order) => enrichOrder(order));
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
        "Use a seeded @zook.local account or +91 98765 43210 with OTP 000000 for local test mode.",
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

  if (pathname === "/me/coaching") {
    return demoMemberCoaching() as T;
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

  if (pathname === "/me/membership/active")
    return { membership: enrichMembership(activeMembership()) } as T;
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
      subscriptions: zookDemoFixtures.memberships.map((membership) =>
        enrichMembership(membership),
      ),
      payments: [demoSucceededPayment(), ...zookDemoFixtures.payments],
    } as T;
  }
  if (pathname === "/me/invoices") {
    return { invoices: demoInvoices() } as T;
  }
  {
    const docMatch = pathname.match(/^\/me\/payments\/([^/]+)\/(receipt|invoice)$/);
    if (docMatch && method === "POST") {
      return demoPaymentDocument(docMatch[1], docMatch[2] as "receipt" | "invoice") as T;
    }
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
  const checkoutMatch = pathname.match(/^\/me\/attendance\/([^/]+)\/checkout$/);
  if (checkoutMatch && method === "POST") {
    const active = getDemoActiveCheckIn();
    clearDemoCheckIn();
    return {
      attendance: {
        ...(active ?? {}),
        id: checkoutMatch[1],
        checkedOutAt: nowIso(),
        checkoutReason: (init.body as { reason?: string } | undefined)?.reason ?? "manual",
        status: "APPROVED",
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
  if (pathname.match(/^\/orgs\/[^/]+\/attendance\/qr-token$/)) {
    const nonce = Math.random().toString(36).slice(2, 14);
    const letters = String.fromCharCode(65 + Math.floor(Math.random() * 26), 65 + Math.floor(Math.random() * 26));
    const digits = String(Math.floor(1000 + Math.random() * 9000));
    return {
      qrPayload: `demo.${activeOrg()?.id ?? "org-demo"}.${nonce}`,
      checkInCode: `${letters}-${digits}`,
      expiresAt: new Date(Date.now() + 180000).toISOString(),
    } as T;
  }
  if (pathname === "/attendance/scan" || pathname === "/attendance/dev-scan") {
    const existing = getDemoActiveCheckIn();
    if (existing) {
      return {
        attendance: existing,
        status: existing.status,
        duplicate: true,
        suspiciousFlags: [],
      } as T;
    }
    const checkIn = startDemoCheckIn(activeOrg()?.name ?? null);
    return {
      attendance: checkIn,
      status: checkIn.status,
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
  if (pathname === "/me/tracking/workouts") {
    if (method === "POST") {
      return demoCreateWorkout(demoBody(init)) as T;
    }
    return { workouts: demoWorkoutLogs } as T;
  }
  const habitLogMatch = pathname.match(/^\/me\/tracking\/habits\/([^/]+)\/log$/);
  if (habitLogMatch && method === "POST") {
    return demoLogHabit(habitLogMatch[1], demoBody(init)) as T;
  }
  if (pathname === "/me/tracking/habits") {
    if (method === "POST") {
      return demoCreateHabit(demoBody(init)) as T;
    }
    return { habits: demoHabits } as T;
  }
  if (pathname === "/me/tracking/body-progress") {
    if (method === "POST") {
      return demoRecordBodyProgress(demoBody(init)) as T;
    }
    return { entries: demoBodyProgress } as T;
  }
  if (pathname === "/me/tracking/summary") {
    return demoTrackingSummary() as T;
  }
  if (pathname === "/me/referral-codes") {
    return demoReferralCodes() as T;
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

  const refundMatch = pathname.match(/^\/orgs\/[^/]+\/payments\/([^/]+)\/refund$/);
  if (refundMatch && method === "POST") {
    return demoRefundPayment(refundMatch[1], demoBody(init)) as T;
  }

  if (pathname.endsWith("/payments/recent")) {
    return { payments: demoRecentPayments } as T;
  }

  if (pathname.endsWith("/shop/orders/active")) {
    return {
      orders: demoShopOrders().filter(
        (order) => order.status === "READY_FOR_PICKUP" || order.status === "PAID",
      ),
    } as T;
  }

  if (pathname === "/shop/orders") {
    const order = demoCreateShopOrder(demoBody(init));
    return {
      order,
      checkoutUrl: "",
      checkoutData: null,
      session: { id: `offline-payment-${order.id}`, status: "SUCCEEDED", provider: "mock" },
    } as T;
  }

  if (pathname.startsWith("/payments/mock/")) {
    return {
      session: { id: "offline-payment-session", status: "SUCCEEDED" },
      payment: zookDemoFixtures.payments[0],
    } as T;
  }

  if (pathname === "/me/diet/meal-logs" && method === "POST") {
    return demoLogMeal(demoBody(init)) as T;
  }

  if (pathname === "/me/diet") {
    return { plan: demoCurrentDietPlan(), logs: demoMealLogs } as T;
  }

  const clientDietPlanMatch = pathname.match(
    /^\/orgs\/[^/]+\/trainers\/[^/]+\/clients\/([^/]+)\/diet-plans$/,
  );
  if (clientDietPlanMatch) {
    if (method === "POST") {
      return demoCreateClientDietPlan(demoBody(init)) as T;
    }
    return { plans: [demoCurrentDietPlan()] } as T;
  }

  const enrollMatch = pathname.match(/^\/orgs\/[^/]+\/classes\/([^/]+)\/enroll$/);
  if (enrollMatch && method === "POST") {
    return demoEnrollInClass(enrollMatch[1]) as T;
  }

  if (pathname.match(/^\/orgs\/[^/]+\/classes$/)) {
    if (method === "POST") {
      return demoCreateClass(demoBody(init)) as T;
    }
    return { classes: demoClasses() } as T;
  }

  if (pathname.match(/^\/orgs\/[^/]+\/setup-status$/)) {
    return {
      hasMembershipPlans: true,
      hasQrDisplayed: true,
      staffCount: 4,
      memberCount: 128,
      hasShopProducts: true,
    } as T;
  }

  const trainerPayoutMatch = pathname.match(/^\/orgs\/[^/]+\/trainers\/([^/]+)\/payouts$/);
  if (trainerPayoutMatch) {
    return { payouts: demoTrainerPayouts(trainerPayoutMatch[1]) } as T;
  }

  const markPaidMatch = pathname.match(/^\/orgs\/[^/]+\/payouts\/([^/]+)\/mark-paid$/);
  if (markPaidMatch && method === "POST") {
    return demoMarkPayoutPaid(markPaidMatch[1], demoBody(init)) as T;
  }

  if (pathname.match(/^\/orgs\/[^/]+\/payouts$/)) {
    return { payouts: demoOrgPayouts } as T;
  }

  if (pathname.match(/^\/orgs\/[^/]+\/pt-subscriptions$/) && method === "POST") {
    return demoRecordPtSubscription(demoBody(init)) as T;
  }
  if (pathname.match(/^\/orgs\/[^/]+\/pt-sessions$/) && method === "POST") {
    return demoLogPtSession(demoBody(init)) as T;
  }

  if (pathname.match(/^\/orgs\/[^/]+\/referral-policy$/)) {
    if (method === "PATCH" || method === "POST" || method === "PUT") {
      return demoUpdateReferralPolicy(demoBody(init)) as T;
    }
    return { policy: demoReferralPolicy } as T;
  }

  const planEditMatch = pathname.match(/^\/orgs\/[^/]+\/membership-plans\/([^/]+)$/);
  if (planEditMatch) {
    if (method === "DELETE") {
      return demoDeleteMembershipPlan(planEditMatch[1]) as T;
    }
    if (method === "PATCH" || method === "PUT") {
      return demoUpdateMembershipPlan(planEditMatch[1], demoBody(init)) as T;
    }
  }
  if (pathname.match(/^\/orgs\/[^/]+\/membership-plans$/)) {
    if (method === "POST") {
      return demoCreateMembershipPlan(demoBody(init)) as T;
    }
    return { plans: demoMembershipPlans } as T;
  }

  if (pathname.match(/^\/orgs\/[^/]+\/staff\/invite$/) && method === "POST") {
    return demoInviteStaff(demoBody(init)) as T;
  }
  const staffEditMatch = pathname.match(/^\/orgs\/[^/]+\/staff\/([^/]+)$/);
  if (staffEditMatch && staffEditMatch[1] !== "invite") {
    if (method === "DELETE") {
      return demoRemoveStaff(staffEditMatch[1]) as T;
    }
    if (method === "PATCH" || method === "PUT") {
      return demoUpdateStaffRole(staffEditMatch[1], demoBody(init)) as T;
    }
  }
  if (pathname.match(/^\/orgs\/[^/]+\/staff$/)) {
    return demoStaffPayload() as T;
  }

  const couponEditMatch = pathname.match(/^\/orgs\/[^/]+\/coupons\/([^/]+)$/);
  if (couponEditMatch && couponEditMatch[1] !== "validate") {
    if (method === "DELETE") {
      return demoDeleteCoupon(couponEditMatch[1]) as T;
    }
    if (method === "PATCH" || method === "PUT") {
      return demoUpdateCoupon(couponEditMatch[1], demoBody(init)) as T;
    }
  }
  if (pathname.match(/^\/orgs\/[^/]+\/coupons$/)) {
    if (method === "POST") {
      return demoCreateCoupon(demoBody(init)) as T;
    }
    return { coupons: demoCoupons } as T;
  }

  const payoutConfigMatch = pathname.match(
    /^\/orgs\/[^/]+\/trainers\/([^/]+)\/payout-config$/,
  );
  if (payoutConfigMatch) {
    if (method === "PUT" || method === "POST") {
      return demoSetPayoutConfig(payoutConfigMatch[1], demoBody(init)) as T;
    }
    return demoGetPayoutConfig(payoutConfigMatch[1]) as T;
  }

  const ptPlanMatch = pathname.match(/^\/orgs\/[^/]+\/trainers\/([^/]+)\/pt-plans$/);
  if (ptPlanMatch) {
    if (method === "POST") {
      return demoCreatePtPlan(ptPlanMatch[1], demoBody(init)) as T;
    }
    return { plans: demoPtPlans } as T;
  }

  if (pathname.match(/^\/orgs\/[^/]+\/trainers\/[^/]+\/pt-subscriptions$/)) {
    return { subscriptions: demoPtSubscriptions } as T;
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
      createdPlan: { id: "offline-ai-plan", title: "Local workout draft" },
    } as T;
  }

  if (pathname === "/ai/chat") {
    return {
      answer:
        "Local answer: keep the workout moderate today, hydrate, and ask your trainer to review any pain or fatigue before increasing load.",
      response:
        "Local answer: keep the workout moderate today, hydrate, and ask your trainer to review any pain or fatigue before increasing load.",
      usage: {
        provider: "offline-demo",
        requestType: "CHAT",
        quotaConsumed: 1,
      },
    } as T;
  }

  throw new Error("This action is not available in local test mode.");
}
