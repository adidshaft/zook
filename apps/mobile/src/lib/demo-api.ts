import { zookDemoFixtures } from "@zook/core/demo-fixtures";
import {
  clearDemoCheckIn,
  demoMemberHomePayload,
  getDemoActiveCheckIn,
  startDemoCheckIn,
} from "./demo-member-home";
import { DEMO_MEMBER_EMAIL, DEMO_MEMBER_PHONE, getOfflineDemoRoleOverride, getOfflineDemoSession } from "./demo-mode";

const DEMO_SEEDED_IDENTIFIERS = new Set([
  DEMO_MEMBER_EMAIL,
  "member@zook.local",
  "owner@zook.local",
  "admin@zook.local",
  "reception@zook.local",
  "trainer@zook.local",
  "platform@zook.local",
]);

let demoNotificationPreferences = {
  transactional: true,
  operational: true,
  engagement: true,
  promotional: true,
  pushEnabled: false,
};
let demoBranchQrMode: "ROLLING" | "STATIC" = "ROLLING";
let demoStaticQrToken: { qrPayload: string; checkInCode: string; expiresAt: string } | null = null;

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

function demoGymMedia(username?: string | null) {
  if (username === "aarogya-strength" || username === "your-fitness") {
    const base = `/seed/gyms/${username}`;
    return {
      logoUrl: `${base}/logo.svg`,
      coverImageUrl: `${base}/cover.png`,
      gallery: [
        `${base}/gallery-01.png`,
        `${base}/gallery-02.png`,
        `${base}/gallery-03.png`,
        `${base}/gallery-04.png`,
        `${base}/gallery-05.png`,
      ],
    };
  }
  return { logoUrl: null, coverImageUrl: null, gallery: [] };
}

function demoGymProfile(username: string, viewerAuthenticated: boolean) {
  const org =
    zookDemoFixtures.organizations.find((candidate) => candidate.username === username) ??
    activeOrg();
  if (!org) {
    return { org: null, plans: [] };
  }

  const demoMedia = demoGymMedia(org.username);

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
      logoUrl: demoMedia.logoUrl,
      coverImageUrl: demoMedia.coverImageUrl,
      gallery: demoMedia.gallery,
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
      activeMembership: viewerAuthenticated ? activeMembership() : null,
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

function demoUpdatePtPlan(trainerUserId: string, planId: string, body: Record<string, unknown>) {
  const toNumber = (value: unknown, fallback: number | null) => {
    if (value === null) return null;
    const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const index = demoPtPlans.findIndex(
    (plan) => plan.id === planId && plan.trainerUserId === trainerUserId,
  );
  if (index < 0) {
    throw new Error("PT package not found.");
  }
  const existing = demoPtPlans[index]!;
  const updated: DemoPtPlan = {
    ...existing,
    name: body.name !== undefined ? String(body.name).trim() || existing.name : existing.name,
    description:
      body.description !== undefined
        ? body.description === null
          ? null
          : String(body.description)
        : existing.description,
    durationDays:
      body.durationDays !== undefined
        ? toNumber(body.durationDays, existing.durationDays)
        : existing.durationDays,
    sessionCount:
      body.sessionCount !== undefined
        ? toNumber(body.sessionCount, existing.sessionCount)
        : existing.sessionCount,
    pricePaise:
      body.pricePaise !== undefined
        ? toNumber(body.pricePaise, existing.pricePaise) ?? existing.pricePaise
        : existing.pricePaise,
  };
  demoPtPlans[index] = updated;
  return { plan: updated };
}

function demoDeletePtPlan(trainerUserId: string, planId: string) {
  const plan = demoPtPlans.find(
    (entry) => entry.id === planId && entry.trainerUserId === trainerUserId,
  );
  if (!plan) {
    throw new Error("PT package not found.");
  }
  plan.active = false;
  return { ok: true };
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

function demoRecordPtSubscription(body: Record<string, unknown>, status: string = "ACTIVE") {
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
    trainerUserId: String(body.trainerUserId ?? plan?.trainerUserId ?? "user-rhea"),
    ptPlanId: planId,
    planName: plan?.name ?? null,
    status,
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

// Member-facing PT browsing + self-serve requests: lets a member browse all
// trainers' packages org-wide and request enrollment without bypassing
// trainer/owner confirmation of payment.
function demoBrowsePtPlans() {
  const plans = demoPtPlans
    .filter((plan) => plan.active)
    .map((plan) => {
      const trainer = zookDemoFixtures.users.find((user) => user.id === plan.trainerUserId);
      return { ...plan, trainerName: trainer?.name ?? "Trainer" };
    });
  return { plans };
}

function demoRequestPtSubscription(body: Record<string, unknown>) {
  const memberUserId = "user-aarav";
  return demoRecordPtSubscription({ ...body, memberUserId }, "PENDING_APPROVAL");
}

function demoApprovePtSubscription(subscriptionId: string) {
  const subscription = demoPtSubscriptions.find((entry) => entry.id === subscriptionId);
  if (!subscription) {
    throw new Error("PT subscription request not found.");
  }
  subscription.status = "ACTIVE";
  subscription.startsAt = nowIso();
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

const demoTrainerProfiles: Record<string, { bio: string; upiId: string; upiQrUrl: string }> = {
  "user-rhea": {
    bio: "Strength & conditioning coach. 8 years experience helping members build sustainable habits.",
    upiId: "rohan.coach@upi",
    upiQrUrl: "",
  },
};

function demoGetTrainerProfile(trainerId: string) {
  return {
    profile: demoTrainerProfiles[trainerId] ?? { bio: "", upiId: "", upiQrUrl: "" },
  };
}

function demoUpdateTrainerProfile(trainerId: string, body: Record<string, unknown>) {
  const toText = (value: unknown, fallback: string) =>
    typeof value === "string" ? value : fallback;
  const existing = demoTrainerProfiles[trainerId] ?? { bio: "", upiId: "", upiQrUrl: "" };
  const profile = {
    bio: toText(body.bio, existing.bio),
    upiId: toText(body.upiId, existing.upiId),
    upiQrUrl: toText(body.upiQrUrl, existing.upiQrUrl),
  };
  demoTrainerProfiles[trainerId] = profile;
  return { profile };
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

// --- Exercise templates (offline demo) -------------------------------------
type DemoExerciseTemplate = {
  id: string;
  orgId?: string | null;
  scope: "STARTER" | "ORG" | "TRAINER";
  createdByUserId?: string | null;
  name: string;
  muscleGroup?: string | null;
  equipment?: string | null;
  defaultSets?: number | null;
  defaultReps?: number | null;
  defaultRestSeconds?: number | null;
  tempo?: string | null;
  notes?: string | null;
  featured?: boolean;
  active?: boolean;
  readOnly?: boolean;
};

const demoExerciseStarters: DemoExerciseTemplate[] = [
  { id: "starter-bench-press", scope: "STARTER", name: "Bench Press", muscleGroup: "Chest", equipment: "Barbell", defaultSets: 4, defaultReps: 8, defaultRestSeconds: 120, featured: true, active: true, readOnly: true },
  { id: "starter-back-squat", scope: "STARTER", name: "Back Squat", muscleGroup: "Legs", equipment: "Barbell", defaultSets: 4, defaultReps: 6, defaultRestSeconds: 150, featured: true, active: true, readOnly: true },
  { id: "starter-deadlift", scope: "STARTER", name: "Deadlift", muscleGroup: "Posterior chain", equipment: "Barbell", defaultSets: 3, defaultReps: 5, defaultRestSeconds: 180, featured: true, active: true, readOnly: true },
  { id: "starter-pull-up", scope: "STARTER", name: "Pull-up", muscleGroup: "Back", equipment: "Pull-up bar", defaultSets: 3, defaultReps: 8, defaultRestSeconds: 120, featured: true, active: true, readOnly: true },
  { id: "starter-plank", scope: "STARTER", name: "Plank", muscleGroup: "Core", equipment: "Bodyweight", defaultSets: 3, defaultReps: 1, defaultRestSeconds: 60, tempo: "hold", featured: true, active: true, readOnly: true },
];

const demoExerciseTemplates: DemoExerciseTemplate[] = [
  { id: "exercise-org-leg-press", orgId: "org-demo", scope: "ORG", name: "Leg Press", muscleGroup: "Legs", equipment: "Machine", defaultSets: 4, defaultReps: 12, defaultRestSeconds: 90, featured: true, active: true },
];

function demoExerciseTemplatePayload(body: Record<string, unknown>, existing?: DemoExerciseTemplate) {
  const starter = demoExerciseStarters.find((template) => template.id === body.starterId);
  return {
    ...existing,
    id: existing?.id ?? `exercise-template-${Date.now()}`,
    orgId: "org-demo",
    scope: (body.scope === "ORG" || body.scope === "TRAINER" ? body.scope : existing?.scope ?? "TRAINER") as "ORG" | "TRAINER",
    createdByUserId: body.scope === "ORG" ? null : "user-trainer-demo",
    name: String(body.name ?? starter?.name ?? existing?.name ?? "Custom exercise"),
    muscleGroup: (body.muscleGroup as string | null | undefined) ?? starter?.muscleGroup ?? existing?.muscleGroup ?? null,
    equipment: (body.equipment as string | null | undefined) ?? starter?.equipment ?? existing?.equipment ?? null,
    defaultSets: Number(body.defaultSets ?? starter?.defaultSets ?? existing?.defaultSets ?? 3) || null,
    defaultReps: Number(body.defaultReps ?? starter?.defaultReps ?? existing?.defaultReps ?? 10) || null,
    defaultRestSeconds: Number(body.defaultRestSeconds ?? starter?.defaultRestSeconds ?? existing?.defaultRestSeconds ?? 90) || null,
    tempo: (body.tempo as string | null | undefined) ?? starter?.tempo ?? existing?.tempo ?? null,
    notes: (body.notes as string | null | undefined) ?? starter?.notes ?? existing?.notes ?? null,
    featured: Boolean(body.featured ?? starter?.featured ?? existing?.featured ?? false),
    active: body.active !== false,
    readOnly: false,
  };
}

function demoExerciseTemplatesResponse() {
  return {
    templates: [
      ...demoExerciseStarters,
      ...demoExerciseTemplates.filter((template) => template.active !== false),
    ],
  };
}

// --- Group classes (offline demo) ------------------------------------------
// Booking state persists for the life of the JS runtime so the booking flow
// works end to end without a backend: book a class, the list updates, the
// status sticks across refetches and on the Home strip.
const demoClassEnrollments = new Map<string, "confirmed" | "waitlisted" | "cancelled">();

// Edits/cancellations applied by a trainer to a fixed template class are kept
// in this overlay so the templates themselves stay the canonical seed data.
type DemoClassOverlay = {
  name?: string;
  description?: string | null;
  classType?: string;
  maxCapacity?: number;
  pricePaise?: number;
  startTime?: string;
  endTime?: string;
  status?: "SCHEDULED" | "CANCELLED";
};
const demoClassOverlays = new Map<string, DemoClassOverlay>();

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
  // A member who cancelled a pre-booked (default-confirmed) class frees that seat.
  const cancelledDefaultSeat = userStatus === "cancelled" && baseHasSeat;
  const overlay = demoClassOverlays.get(template.id);
  const maxCapacity = overlay?.maxCapacity ?? template.maxCapacity;
  const enrollmentCount =
    template.enrolledCount + (userTakesSeat ? 1 : 0) - (cancelledDefaultSeat ? 1 : 0);
  const remainingCapacity = Math.max(0, maxCapacity - enrollmentCount);
  return {
    id: template.id,
    orgId: activeOrg()?.id ?? "org-demo",
    branchId: branch?.id ?? "branch-default",
    branchName: branch?.name ?? null,
    trainerId: template.trainerId,
    trainerName: template.trainerName,
    name: overlay?.name ?? template.name,
    description: overlay?.description ?? template.description,
    classType: overlay?.classType ?? template.classType,
    maxCapacity,
    pricePaise: overlay?.pricePaise ?? null,
    startTime: overlay?.startTime ?? start.toISOString(),
    endTime: overlay?.endTime ?? end.toISOString(),
    recurrenceRule: null,
    status: overlay?.status ?? "SCHEDULED",
    createdAt: nowIso(),
    enrollmentCount,
    remainingCapacity,
    myEnrollmentStatus: userStatus === "cancelled" ? null : userStatus,
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
  pricePaise: number;
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
  const pricePaise = toNumber(body.pricePaise, 0);
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
    pricePaise,
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

// Trainers can edit a scheduled class's details, or cancel it outright. A
// cancellation notifies any member who currently holds a confirmed/waitlisted
// seat (in this offline demo that is the "user-aarav" persona) so the member
// app's notification feed reflects the change end to end.
function demoNotifyClassCancelled(className: string, memberUserId: string) {
  zookDemoFixtures.notifications.unshift({
    id: `notif-class-cancel-${Date.now()}`,
    orgId: activeOrg()?.id ?? "org-demo",
    userId: memberUserId,
    type: "OPERATIONAL",
    title: "Class cancelled",
    message: `${className} has been cancelled by your trainer. Please book another session.`,
    targetRoute: "/member/classes",
    readAt: null,
    createdAt: nowIso(),
  });
}

function demoUpdateClass(classId: string, body: Record<string, unknown>) {
  const toNumber = (value: unknown, fallback: number) => {
    const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const scheduled = demoScheduledClasses.find((entry) => entry.id === classId);
  if (scheduled) {
    if (scheduled.status === "CANCELLED") {
      throw new Error("Cancelled classes cannot be edited.");
    }
    if (body.name !== undefined) scheduled.name = String(body.name).trim() || scheduled.name;
    if (body.description !== undefined) scheduled.description = body.description ? String(body.description) : null;
    if (body.classType !== undefined) scheduled.classType = String(body.classType);
    if (body.pricePaise !== undefined) scheduled.pricePaise = toNumber(body.pricePaise, scheduled.pricePaise);
    if (body.maxCapacity !== undefined) {
      const nextCapacity = toNumber(body.maxCapacity, scheduled.maxCapacity);
      scheduled.maxCapacity = nextCapacity;
      scheduled.remainingCapacity = Math.max(0, nextCapacity - scheduled.enrollmentCount);
    }
    if (body.startTime) {
      const start = new Date(String(body.startTime));
      const durationMin = toNumber(
        body.durationMin,
        (new Date(scheduled.endTime).getTime() - new Date(scheduled.startTime).getTime()) / 60_000,
      );
      scheduled.startTime = start.toISOString();
      scheduled.endTime = new Date(start.getTime() + durationMin * 60 * 1000).toISOString();
    }
    return { class: scheduled };
  }
  const template = DEMO_CLASS_TEMPLATES.find((entry) => entry.id === classId);
  if (!template) {
    throw new Error("That class could not be found.");
  }
  const existing = demoClassOverlays.get(classId) ?? {};
  if (existing.status === "CANCELLED") {
    throw new Error("Cancelled classes cannot be edited.");
  }
  const next: DemoClassOverlay = { ...existing };
  if (body.name !== undefined) next.name = String(body.name).trim() || template.name;
  if (body.description !== undefined) next.description = body.description ? String(body.description) : null;
  if (body.classType !== undefined) next.classType = String(body.classType);
  if (body.pricePaise !== undefined) next.pricePaise = toNumber(body.pricePaise, next.pricePaise ?? 0);
  if (body.maxCapacity !== undefined) next.maxCapacity = toNumber(body.maxCapacity, template.maxCapacity);
  if (body.startTime) {
    const start = new Date(String(body.startTime));
    const currentStart = next.startTime ? new Date(next.startTime) : classStartDate(template);
    const currentEnd = next.endTime
      ? new Date(next.endTime)
      : new Date(currentStart.getTime() + template.durationMin * 60 * 1000);
    const durationMin = toNumber(body.durationMin, (currentEnd.getTime() - currentStart.getTime()) / 60_000);
    next.startTime = start.toISOString();
    next.endTime = new Date(start.getTime() + durationMin * 60 * 1000).toISOString();
  }
  demoClassOverlays.set(classId, next);
  return { class: demoClassRecord(template) };
}

function demoCancelClass(classId: string) {
  const scheduled = demoScheduledClasses.find((entry) => entry.id === classId);
  if (scheduled) {
    if (scheduled.status !== "CANCELLED") {
      const wasEnrolled = scheduled.myEnrollmentStatus === "confirmed" || scheduled.myEnrollmentStatus === "waitlisted";
      scheduled.status = "CANCELLED";
      if (wasEnrolled) {
        demoNotifyClassCancelled(scheduled.name, "user-aarav");
      }
    }
    return { class: scheduled };
  }
  const template = DEMO_CLASS_TEMPLATES.find((entry) => entry.id === classId);
  if (!template) {
    throw new Error("That class could not be found.");
  }
  const existing = demoClassOverlays.get(classId) ?? {};
  if (existing.status !== "CANCELLED") {
    const record = demoClassRecord(template);
    const wasEnrolled = record.myEnrollmentStatus === "confirmed" || record.myEnrollmentStatus === "waitlisted";
    demoClassOverlays.set(classId, { ...existing, status: "CANCELLED" });
    if (wasEnrolled) {
      demoNotifyClassCancelled(record.name, "user-aarav");
    }
  }
  return { class: demoClassRecord(template) };
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
  if (existing && existing !== "cancelled") {
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

function demoCancelEnrollment(classId: string) {
  const scheduled = demoScheduledClasses.find((entry) => entry.id === classId);
  if (scheduled) {
    if (scheduled.myEnrollmentStatus === "confirmed") {
      scheduled.enrollmentCount = Math.max(0, scheduled.enrollmentCount - 1);
      scheduled.remainingCapacity = Math.min(scheduled.maxCapacity, scheduled.remainingCapacity + 1);
    }
    scheduled.myEnrollmentStatus = null;
    return { ok: true };
  }
  // Sentinel so demoClassRecord shows the member as not-enrolled even for
  // templates that were pre-booked (defaultEnrollment === "confirmed").
  demoClassEnrollments.set(classId, "cancelled");
  return { ok: true };
}

const DEMO_ROSTER_NAMES = [
  "Ira Shah", "Rohan Mehta", "Priya Nair", "Arjun Das", "Sara Khan", "Vikram Rao",
  "Neha Joshi", "Karan Singh", "Anjali Verma", "Dev Patel", "Meera Iyer", "Sahil Gupta",
  "Tara Bose", "Yash Shah", "Zoya Ali", "Kabir Roy", "Diya Sen", "Aman Kohli",
];

export type DemoAttendanceStatus = "PENDING" | "ATTENDED" | "NO_SHOW";

// Per-class, per-member attendance marks set by trainers on the roster screen.
// Persists for the life of the JS runtime so marking a member present/no-show
// sticks across refetches, mirroring how class enrollments are tracked above.
const demoRosterAttendance = new Map<string, Map<string, DemoAttendanceStatus>>();

function demoClassRoster(classId: string) {
  const cls = demoClasses().find((entry) => entry.id === classId);
  if (!cls) {
    throw new Error("That class could not be found.");
  }
  const attendanceForClass = demoRosterAttendance.get(classId);
  const roster: Array<{
    memberId: string;
    name: string;
    status: string;
    enrolledAt: string;
    attendanceStatus: DemoAttendanceStatus;
  }> = [];
  const userConfirmed = cls.myEnrollmentStatus === "confirmed";
  const userWaitlisted = cls.myEnrollmentStatus === "waitlisted";
  if (userConfirmed) {
    roster.push({
      memberId: "user-aarav",
      name: "Nisha Menon",
      status: "confirmed",
      enrolledAt: hoursAgoIso(3),
      attendanceStatus: attendanceForClass?.get("user-aarav") ?? "PENDING",
    });
  }
  const confirmedOthers = Math.max(0, cls.enrollmentCount - (userConfirmed ? 1 : 0));
  for (let index = 0; index < confirmedOthers; index += 1) {
    const memberId = `demo-${classId}-${index}`;
    roster.push({
      memberId,
      name: DEMO_ROSTER_NAMES[index % DEMO_ROSTER_NAMES.length] ?? "Member",
      status: "confirmed",
      enrolledAt: hoursAgoIso(8 + index),
      attendanceStatus: attendanceForClass?.get(memberId) ?? "PENDING",
    });
  }
  if (userWaitlisted) {
    roster.push({
      memberId: "user-aarav",
      name: "Nisha Menon",
      status: "waitlisted",
      enrolledAt: hoursAgoIso(1),
      attendanceStatus: attendanceForClass?.get("user-aarav") ?? "PENDING",
    });
  }
  return {
    class: { id: cls.id, name: cls.name, startTime: cls.startTime, maxCapacity: cls.maxCapacity },
    roster,
  };
}

function demoMarkClassAttendance(classId: string, memberId: string, status: unknown) {
  const cls = demoClasses().find((entry) => entry.id === classId);
  if (!cls) {
    throw new Error("That class could not be found.");
  }
  const normalized = typeof status === "string" ? status.toUpperCase() : "";
  if (normalized !== "PENDING" && normalized !== "ATTENDED" && normalized !== "NO_SHOW") {
    throw new Error("That attendance status is not valid.");
  }
  if (!demoRosterAttendance.has(classId)) {
    demoRosterAttendance.set(classId, new Map());
  }
  demoRosterAttendance.get(classId)!.set(memberId, normalized);
  return { ok: true, memberId, attendanceStatus: normalized as DemoAttendanceStatus };
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
  memberUserId: string;
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
    memberUserId: "user-aarav",
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
    memberUserId: "user-aarav",
    measuredAt: hoursAgoIso(24 * 14),
    weightKg: 79.5,
    waistCm: 86,
    chestCm: 101,
    armCm: 36,
    bodyFatPercent: 19.5,
    notes: "Start of the cut.",
  },
  {
    id: "body-progress-3",
    memberUserId: "user-aarav",
    measuredAt: hoursAgoIso(24 * 28),
    weightKg: 81,
    waistCm: 88,
    chestCm: 100,
    armCm: 35.5,
    bodyFatPercent: 21,
    notes: "Baseline measurement.",
  },
  {
    id: "body-progress-riya-1",
    memberUserId: "user-riya",
    measuredAt: hoursAgoIso(10),
    weightKg: 62,
    waistCm: 70,
    chestCm: 88,
    armCm: 27,
    bodyFatPercent: 24,
    notes: null,
  },
  {
    id: "body-progress-riya-2",
    memberUserId: "user-riya",
    measuredAt: hoursAgoIso(24 * 10),
    weightKg: 63.5,
    waistCm: 72,
    chestCm: 87,
    armCm: 26.5,
    bodyFatPercent: 25.5,
    notes: "Start of the programme.",
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
    latestBodyProgress: demoMemberBodyProgress("user-aarav")[0] ?? { weightKg: 78, measuredAt: nowIso() },
    habits: demoHabits,
  };
}

function demoMemberBodyProgress(memberUserId: string) {
  return demoBodyProgress
    .filter((entry) => entry.memberUserId === memberUserId)
    .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime());
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

function demoRecordBodyProgress(body: Record<string, unknown>, memberUserId = "user-aarav") {
  const toNumber = (value: unknown) => {
    const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
    return Number.isFinite(parsed) ? parsed : null;
  };
  const entry: DemoBodyProgress = {
    id: `body-progress-${Date.now()}`,
    memberUserId,
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
  pickupCode: string | null;
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
  const paymentMode = String(body.paymentMode ?? "ONLINE").toUpperCase();
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
    status: paymentMode === "DESK" ? "PENDING_PAYMENT" : "READY_FOR_PICKUP",
    totalPaise,
    pickupCode: paymentMode === "DESK" ? null : `PU-${String(1000 + Math.floor(Math.random() * 9000))}`,
    createdAt: nowIso(),
    items: items.length
      ? items
      : [{ productId: zookDemoFixtures.shopProducts[0]?.id ?? "product", quantity: 1, unitPaise: 14900 }],
  };
  for (const item of order.items) {
    const product = zookDemoFixtures.shopProducts.find((candidate) => candidate.id === item.productId);
    if (product) {
      product.stock = Math.max(0, product.stock - item.quantity);
    }
  }
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

type DemoWorkoutPlan = {
  id: string;
  orgId: string;
  creatorUserId: string | null;
  type: string;
  title: string;
  description: string | null;
  content: Record<string, unknown>;
  aiGenerated: boolean;
  reviewed: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
};

const demoWorkoutPlans: DemoWorkoutPlan[] = zookDemoFixtures.trainingPlans.map((plan) => ({
  id: plan.id,
  orgId: plan.orgId,
  creatorUserId: plan.trainerUserId ?? null,
  type: plan.type,
  title: plan.title,
  description: plan.durationLabel ?? null,
  content: { exercises: plan.exercises },
  aiGenerated: plan.aiGenerated ?? false,
  reviewed: plan.reviewed ?? false,
  status: plan.status ?? "ACTIVE",
  createdAt: nowIso(),
  updatedAt: nowIso(),
}));

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

// --- Gym reviews (offline demo, stateful, member-gated) --------------------
type DemoReview = {
  id: string;
  userId: string;
  name: string;
  rating: number;
  body: string;
  createdAt: string;
};

const demoReviews: DemoReview[] = [
  { id: "rev-1", userId: "user-riya", name: "Ira Shah", rating: 5, body: "Spotless equipment and the trainers actually correct your form. Best gym in Koregaon Park.", createdAt: hoursAgoIso(24 * 9) },
  { id: "rev-2", userId: "user-k1", name: "Rohan Mehta", rating: 4, body: "Great strength section and rarely crowded in the mornings. Wish they had a sauna.", createdAt: hoursAgoIso(24 * 21) },
  { id: "rev-3", userId: "user-k2", name: "Priya Nair", rating: 5, body: "The class schedule is fantastic and the app makes check-in effortless.", createdAt: hoursAgoIso(24 * 34) },
];

function demoReviewSummary() {
  const count = demoReviews.length;
  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>;
  let total = 0;
  for (const review of demoReviews) {
    total += review.rating;
    breakdown[review.rating] = (breakdown[review.rating] ?? 0) + 1;
  }
  return {
    average: count ? Math.round((total / count) * 10) / 10 : 0,
    count,
    breakdown,
  };
}

function demoGymReviews() {
  const myReview = demoReviews.find((review) => review.userId === "user-aarav") ?? null;
  return {
    summary: demoReviewSummary(),
    reviews: [...demoReviews].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    // Demo member is a current member, so they're eligible to review.
    canReview: !myReview,
    myReview,
  };
}

function demoSubmitReview(body: Record<string, unknown>) {
  const rating = Math.max(1, Math.min(5, Number(body.rating) || 5));
  const text = String(body.body ?? "").trim();
  const existing = demoReviews.find((review) => review.userId === "user-aarav");
  if (existing) {
    existing.rating = rating;
    existing.body = text;
    existing.createdAt = nowIso();
    return { review: existing };
  }
  const review: DemoReview = {
    id: `rev-${Date.now()}`,
    userId: "user-aarav",
    name: "Nisha Menon",
    rating,
    body: text,
    createdAt: nowIso(),
  };
  demoReviews.unshift(review);
  return { review };
}

// --- Referral rewards wallet (offline demo, stateful) ----------------------
let demoWithdrawalRequestedPaise = 0;

function demoIsOwnerRole(role?: string | null) {
  const resolved = (role ?? getOfflineDemoRoleOverride()).toUpperCase();
  return resolved === "OWNER" || resolved === "ADMIN";
}

function demoRewardsWallet(role?: string | null) {
  // Gym owners earn Zook subscription days (not cash), so their cash wallet is empty.
  if (demoIsOwnerRole(role)) {
    return { balancePaise: 0, pendingPaise: 0, payablePaise: 0, lifetimePaise: 0, currency: "INR", entries: [] };
  }
  const basePayable = 200000;
  const payablePaise = Math.max(0, basePayable - demoWithdrawalRequestedPaise);
  const entries: Array<Record<string, unknown>> = [
    { id: "rw-1", kind: "GYM_TO_ZOOK_CASH", label: "Referred FitZone Andheri (yearly)", amountPaise: 200000, status: "PAYABLE", createdAt: hoursAgoIso(24 * 20), referredName: "FitZone Andheri" },
    { id: "rw-2", kind: "GYM_TO_ZOOK_CASH", label: "Referred Pulse Gym (6-month)", amountPaise: 100000, status: "QUALIFIED", createdAt: hoursAgoIso(24 * 8), referredName: "Pulse Gym" },
    { id: "rw-3", kind: "MEMBER_TO_GYM_CASH", label: "Referred Aarav (new member)", amountPaise: 50000, status: "PAID", createdAt: hoursAgoIso(24 * 40), referredName: "Aarav S" },
    { id: "rw-4", kind: "GYM_TO_ZOOK_CASH", label: "Iron House (refunded)", amountPaise: 200000, status: "REVERSED", createdAt: hoursAgoIso(24 * 55), referredName: "Iron House" },
  ];
  if (demoWithdrawalRequestedPaise > 0) {
    entries.unshift({ id: "rw-wd", kind: "WITHDRAWAL", label: "Withdrawal requested", amountPaise: -demoWithdrawalRequestedPaise, status: "REQUESTED", createdAt: nowIso() });
  }
  return {
    balancePaise: payablePaise,
    pendingPaise: 100000,
    payablePaise,
    lifetimePaise: 250000,
    currency: "INR",
    entries,
  };
}

function demoGymReferral(role?: string | null) {
  const isOwner = demoIsOwnerRole(role);
  const code = isOwner ? "AAROGYA-GYM" : "NISHA-ZK";
  return {
    code,
    shareUrl: `https://zookfit.in/r/${code}`,
    qualifyingCycles: ["6-month", "Yearly"],
    ...(isOwner ? { rewardDays: 30 } : { rewardPaise: 200000 }),
    terms: isOwner
      ? "Earn 30 free days of Zook when a gym you refer subscribes to a 6-month or yearly plan."
      : "Earn up to ₹2,000 when a gym you refer subscribes to a 6-month or yearly plan. Paid out after a short review window.",
  };
}

function demoRequestWithdrawal(body: Record<string, unknown>) {
  const amount = Number(body.amountPaise) || 0;
  demoWithdrawalRequestedPaise += amount;
  return { withdrawal: { id: `wd-${Date.now()}`, amountPaise: amount, status: "REQUESTED", createdAt: nowIso() } };
}

let demoFreshGym = false;
export function setDemoFreshGym(on: boolean) {
  demoFreshGym = on;
}
export function isDemoFreshGym() {
  return demoFreshGym;
}

/**
 * Empty payloads for the read endpoints that drive list/empty states, so the
 * "fresh gym, no data yet" experience can be exercised. Returns undefined to
 * fall through to normal demo data for anything not listed here (dashboards,
 * profile, catalog, etc. keep working with sensible zeros).
 */
function freshGymEmptyResponse(pathname: string): unknown {
  if (pathname.match(/^\/orgs\/[^/]+\/members$/)) return { members: [] };
  if (pathname.match(/^\/orgs\/[^/]+\/membership-plans$/)) return { plans: [] };
  if (pathname.match(/^\/orgs\/[^/]+\/classes$/)) return { classes: [] };
  if (pathname.match(/^\/orgs\/[^/]+\/coupons$/)) return { coupons: [] };
  if (pathname.match(/^\/orgs\/[^/]+\/join-requests$/)) return { joinRequests: [] };
  if (pathname.match(/^\/orgs\/[^/]+\/payouts$/)) return { payouts: [] };
  if (pathname.match(/^\/orgs\/[^/]+\/products$/)) return { products: [] };
  if (pathname.match(/^\/orgs\/[^/]+\/shop\/orders\/active$/)) return { orders: [] };
  if (pathname.match(/^\/orgs\/[^/]+\/payments\/recent/)) return { payments: [] };
  if (pathname === "/me/notifications") return { notifications: [], unreadCount: 0 };
  if (pathname === "/me/coaching") return { subscription: null, trainer: null, plan: null, sessions: [] };
  return undefined;
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

  // Fresh-gym demo mode: a brand-new gym with no members/plans/activity yet,
  // so the empty states across the app can be seen (and demoed). Only affects
  // read lists; writes still work so you can populate from zero.
  if (isDemoFreshGym() && method === "GET") {
    const fresh = freshGymEmptyResponse(pathname);
    if (fresh !== undefined) {
      return fresh as T;
    }
  }

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
  if (pathname === "/auth/google/callback" || pathname === "/auth/apple/callback") {
    throw new Error("Google / Apple sign-in is not available in local test mode. Use OTP with a seeded @zook.local address.");
  }
  if (pathname === "/auth/refresh") {
    return { token: "offline-demo-session", expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), session: getOfflineDemoSession() } as T;
  }
  if (pathname === "/support/feedback") return { submitted: true } as T;

  if (pathname === "/files/upload" && method === "POST") {
    return {
      file: {
        id: `file-${Date.now()}`,
        url: "https://offline.zook.local/files/demo-upload",
        mimeType: "image/jpeg",
        sizeBytes: 0,
        uploadedAt: nowIso(),
      },
    } as T;
  }

  if (pathname === "/me/contact/request-otp" && method === "POST") {
    return {
      challengeId: "offline-demo-otp",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      devOtp: "000000",
    } as T;
  }

  if (pathname === "/me/contact/verify-otp" && method === "POST") {
    return { ok: true } as T;
  }

  if (pathname === "/me/orgs")
    return { organizations: session.organizations, activeOrgId: session.activeOrgId } as T;
  if (pathname === "/me/profile") return demoProfile() as T;
  if (pathname === "/me/notification-preferences") {
    if (method === "PATCH") {
      const body = demoBody(init);
      const patch =
        Array.isArray(body.preferences) && typeof body.preferences[0] === "object"
          ? (body.preferences[0] as Record<string, unknown>)
          : body;
      demoNotificationPreferences = {
        ...demoNotificationPreferences,
        ...patch,
      };
    }
    return { preferences: [demoNotificationPreferences] } as T;
  }
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

  if (pathname === "/me/pt-subscriptions/request" && method === "POST") {
    return demoRequestPtSubscription(demoBody(init)) as T;
  }

  if (pathname === "/me/rewards/wallet") {
    return demoRewardsWallet(parsed.searchParams.get("role")) as T;
  }
  if (pathname === "/me/rewards/gym-referral") {
    return demoGymReferral(parsed.searchParams.get("role")) as T;
  }
  if (pathname === "/me/rewards/withdrawals" && method === "POST") {
    return demoRequestWithdrawal(demoBody(init)) as T;
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
  {
    const cancelMembershipMatch = pathname.match(/^\/me\/memberships\/([^/]+)\/cancel$/);
    if (cancelMembershipMatch && method === "POST") {
      const target = zookDemoFixtures.memberships.find(
        (membership) => membership.id === cancelMembershipMatch[1],
      );
      if (target) {
        target.status = "CANCELLED";
        target.daysLeft = 0;
        const enriched = enrichMembership(target);
        const planName = enriched?.plan?.name ?? "your membership";
        zookDemoFixtures.notifications.unshift({
          id: `notif-membership-cancelled-${Date.now()}`,
          orgId: target.orgId ?? "org-aarogya-strength",
          userId: "user-aarav",
          type: "TRANSACTIONAL",
          title: "Membership cancelled",
          message: `${planName} has been cancelled. Rejoin this gym or explore a new one to restore your access.`,
          targetRoute: "/membership",
          readAt: null,
          createdAt: nowIso(),
        });
      }
      return {
        subscription: enrichMembership(target ?? activeMembership()) ?? null,
      } as T;
    }
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
    if (demoBranchQrMode === "STATIC" && demoStaticQrToken) {
      return {
        ...demoStaticQrToken,
        branchId: "branch-default",
        isStatic: true,
        qrMode: "STATIC",
      } as T;
    }
    const nonce = Math.random().toString(36).slice(2, 14);
    const letters = String.fromCharCode(65 + Math.floor(Math.random() * 26), 65 + Math.floor(Math.random() * 26));
    const digits = String(Math.floor(1000 + Math.random() * 9000));
    const tokenPayload = {
      qrPayload: `demo.${activeOrg()?.id ?? "org-demo"}.${nonce}`,
      checkInCode: `${letters}-${digits}`,
      expiresAt: new Date(Date.now() + (demoBranchQrMode === "STATIC" ? 30 * 24 * 60 * 60 * 1000 : 180000)).toISOString(),
    };
    if (demoBranchQrMode === "STATIC") {
      demoStaticQrToken = tokenPayload;
    }
    return {
      ...tokenPayload,
      branchId: "branch-default",
      isStatic: demoBranchQrMode === "STATIC",
      qrMode: demoBranchQrMode,
    } as T;
  }
  if (pathname.match(/^\/orgs\/[^/]+\/attendance\/qr-token\/regenerate$/)) {
    demoStaticQrToken = null;
    return { ok: true } as T;
  }
  if (pathname.match(/^\/orgs\/[^/]+\/branches\/[^/]+\/qr-settings$/) && method === "PATCH") {
    const body = demoBody(init);
    demoBranchQrMode = String(body.qrMode ?? "ROLLING").toUpperCase() === "STATIC" ? "STATIC" : "ROLLING";
    demoStaticQrToken = null;
    return {
      branch: {
        id: "branch-default",
        qrMode: demoBranchQrMode,
        staticQrExpiryDays: Number(body.staticQrExpiryDays ?? 30),
      },
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
  if (pathname.match(/^\/me\/notifications\/[^/]+$/) && method === "GET") {
    const notificationId = decodeURIComponent(pathname.split("/").pop() ?? "");
    const notification = zookDemoFixtures.notifications.find((n) => n.id === notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }
    return {
      notification: {
        id: notification.id,
        title: notification.title,
        body: notification.message,
        type: notification.type,
        createdAt: notification.createdAt,
        readAt: notification.readAt,
        metadata: { targetRoute: notification.targetRoute },
      },
    } as T;
  }
  if (pathname === "/me/notifications/read") {
    const body = init.body as { ids?: string[] } | undefined;
    return { count: body?.ids?.length ?? 0 } as T;
  }
  if (pathname.match(/^\/me\/notifications\/[^/]+\/read$/) && method === "POST") {
    return { ok: true } as T;
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
    return { entries: demoMemberBodyProgress("user-aarav") } as T;
  }
  if (pathname === "/me/tracking/summary") {
    return demoTrackingSummary() as T;
  }
  if (pathname === "/me/referral-codes") {
    return demoReferralCodes() as T;
  }

  if (pathname === "/orgs/public/search") {
    return {
      gyms: zookDemoFixtures.organizations.map((candidate) => {
        const media = demoGymMedia(candidate.username);
        return {
          id: candidate.id,
          username: candidate.username,
          name: candidate.name,
          city: candidate.city,
          state: candidate.state,
          address: candidate.address,
          joinMode: candidate.joinMode,
          visibility: "PUBLIC",
          amenities: candidate.amenities,
          logoUrl: media.logoUrl,
          coverImageUrl: media.coverImageUrl,
        };
      }),
    } as T;
  }

  if (pathname.startsWith("/orgs/public/")) {
    return demoGymProfile(pathname.replace("/orgs/public/", ""), Boolean(init.token)) as T;
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
        STARTER: { monthly: 149900, semiannual: 799000, yearly: 1499000, memberLimit: 100 },
        GROWTH: { monthly: 399900, semiannual: 2199000, yearly: 3999000, memberLimit: 500 },
        PRO: { monthly: 799900, semiannual: 4399000, yearly: 7999000, memberLimit: null },
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
        (order) => order.status === "READY_FOR_PICKUP" || order.status === "PAID" || order.status === "PENDING_PAYMENT",
      ),
    } as T;
  }

  if (pathname === "/shop/orders") {
    const body = demoBody(init);
    const order = demoCreateShopOrder(body);
    const paymentMode = String(body.paymentMode ?? "ONLINE").toUpperCase();
    return {
      order,
      checkoutUrl: paymentMode === "DESK" ? null : "",
      checkoutData: null,
      session:
        paymentMode === "DESK"
          ? null
          : { id: `offline-payment-${order.id}`, status: "SUCCEEDED", provider: "mock" },
      paymentMode,
    } as T;
  }

  const shopManualPaymentMatch = pathname.match(/^\/orgs\/[^/]+\/shop\/orders\/([^/]+)\/manual-payment$/);
  if (shopManualPaymentMatch && method === "POST") {
    const order = demoCreatedOrders.find((candidate) => candidate.id === shopManualPaymentMatch[1]);
    if (!order) throw new Error("Shop order not found.");
    order.status = "READY_FOR_PICKUP";
    order.pickupCode = order.pickupCode ?? `PU-${String(1000 + Math.floor(Math.random() * 9000))}`;
    const payment = {
      id: `payment-shop-${Date.now()}`,
      orgId: activeOrg()?.id ?? "org-demo",
      memberUserId: order.memberUserId,
      purpose: "SHOP_ORDER",
      amountPaise: order.totalPaise,
      status: "SUCCEEDED",
      mode: String(demoBody(init).mode ?? "CASH"),
      receiptNumber: `RC-DEMO-${String(Date.now()).slice(-6)}`,
      createdAt: nowIso(),
      recordedAt: nowIso(),
    };
    demoRecentPayments.unshift(payment);
    return { payment, order: enrichOrder(order) } as T;
  }

  if (pathname.startsWith("/payments/mock/")) {
    return {
      session: { id: "offline-payment-session", status: "SUCCEEDED" },
      payment: zookDemoFixtures.payments[0],
    } as T;
  }

  const paymentSessionRefreshMatch = pathname.match(/^\/payments\/session\/([^/]+)\/refresh$/);
  if (paymentSessionRefreshMatch && method === "POST") {
    return { status: "SUCCEEDED" } as T;
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

  const clientBodyProgressMatch = pathname.match(
    /^\/orgs\/[^/]+\/trainers\/[^/]+\/clients\/([^/]+)\/body-progress$/,
  );
  if (clientBodyProgressMatch) {
    const clientId = clientBodyProgressMatch[1];
    if (method === "POST") {
      return demoRecordBodyProgress(demoBody(init), clientId) as T;
    }
    return { entries: demoMemberBodyProgress(clientId) } as T;
  }

  const exerciseTemplateMatch = pathname.match(/^\/orgs\/[^/]+\/exercise-templates(?:\/([^/]+))?$/);
  if (exerciseTemplateMatch) {
    const templateId = exerciseTemplateMatch[1];
    if (method === "POST") {
      const template = demoExerciseTemplatePayload(demoBody(init));
      demoExerciseTemplates.unshift(template);
      return { template } as T;
    }
    if (method === "PATCH" && templateId) {
      const index = demoExerciseTemplates.findIndex((template) => template.id === templateId);
      const template = demoExerciseTemplatePayload(demoBody(init), demoExerciseTemplates[index]);
      if (index >= 0) demoExerciseTemplates[index] = template;
      else demoExerciseTemplates.unshift(template);
      return { template } as T;
    }
    if (method === "DELETE" && templateId) {
      const template = demoExerciseTemplates.find((entry) => entry.id === templateId);
      if (template) template.active = false;
      return { template: template ?? { id: templateId, active: false } } as T;
    }
    return demoExerciseTemplatesResponse() as T;
  }

  const enrollMatch = pathname.match(/^\/orgs\/[^/]+\/classes\/([^/]+)\/enroll$/);
  if (enrollMatch && method === "POST") {
    return demoEnrollInClass(enrollMatch[1]) as T;
  }
  if (enrollMatch && method === "DELETE") {
    return demoCancelEnrollment(enrollMatch[1]) as T;
  }
  const classCancelMatch = pathname.match(/^\/orgs\/[^/]+\/classes\/([^/]+)\/cancel$/);
  if (classCancelMatch && (method === "POST" || method === "DELETE")) {
    return demoCancelClass(classCancelMatch[1]) as T;
  }
  const rosterMatch = pathname.match(/^\/orgs\/[^/]+\/classes\/([^/]+)\/roster$/);
  if (rosterMatch) {
    return demoClassRoster(rosterMatch[1]) as T;
  }
  const rosterAttendanceMatch = pathname.match(
    /^\/orgs\/[^/]+\/classes\/([^/]+)\/roster\/([^/]+)\/attendance$/,
  );
  if (rosterAttendanceMatch && method === "POST") {
    const body = demoBody(init);
    return demoMarkClassAttendance(rosterAttendanceMatch[1], rosterAttendanceMatch[2], body.status) as T;
  }

  const classDetailMatch = pathname.match(/^\/orgs\/[^/]+\/classes\/([^/]+)$/);
  if (classDetailMatch && method === "GET") {
    const entry = demoClasses().find((item) => item.id === classDetailMatch[1]);
    if (!entry) {
      throw new Error("That class could not be found.");
    }
    return { class: entry } as T;
  }
  if (classDetailMatch && method === "PATCH") {
    return demoUpdateClass(classDetailMatch[1], demoBody(init)) as T;
  }
  if (classDetailMatch && method === "DELETE") {
    return demoCancelClass(classDetailMatch[1]) as T;
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
  const ptSubscriptionApproveMatch = pathname.match(
    /^\/orgs\/[^/]+\/pt-subscriptions\/([^/]+)\/approve$/,
  );
  if (ptSubscriptionApproveMatch && method === "POST") {
    return demoApprovePtSubscription(ptSubscriptionApproveMatch[1]) as T;
  }
  if (pathname.match(/^\/orgs\/[^/]+\/pt-plans$/)) {
    return demoBrowsePtPlans() as T;
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

  if (pathname.match(/^\/orgs\/[^/]+\/reviews$/)) {
    if (method === "POST") {
      return demoSubmitReview(demoBody(init)) as T;
    }
    return demoGymReviews() as T;
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

  const trainerProfileMatch = pathname.match(/^\/orgs\/[^/]+\/trainers\/([^/]+)\/profile$/);
  if (trainerProfileMatch) {
    if (method === "PATCH" || method === "PUT") {
      return demoUpdateTrainerProfile(trainerProfileMatch[1], demoBody(init)) as T;
    }
    return demoGetTrainerProfile(trainerProfileMatch[1]) as T;
  }

  const ptPlanMatch = pathname.match(/^\/orgs\/[^/]+\/trainers\/([^/]+)\/pt-plans$/);
  if (ptPlanMatch) {
    if (method === "POST") {
      return demoCreatePtPlan(ptPlanMatch[1], demoBody(init)) as T;
    }
    return { plans: demoPtPlans } as T;
  }
  const ptPlanDetailMatch = pathname.match(
    /^\/orgs\/[^/]+\/trainers\/([^/]+)\/pt-plans\/([^/]+)$/,
  );
  if (ptPlanDetailMatch) {
    if (method === "DELETE") {
      return demoDeletePtPlan(ptPlanDetailMatch[1], ptPlanDetailMatch[2]) as T;
    }
    if (method === "PATCH" || method === "PUT") {
      return demoUpdatePtPlan(ptPlanDetailMatch[1], ptPlanDetailMatch[2], demoBody(init)) as T;
    }
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

  const joinRequestsApproveBatchMatch = pathname.match(/^\/orgs\/[^/]+\/join-requests\/approve-batch$/);
  if (joinRequestsApproveBatchMatch && method === "POST") {
    const body = demoBody(init);
    const ids = Array.isArray(body.ids) ? body.ids : [];
    return { approved: ids.length } as T;
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

  if (pathname.match(/^\/orgs\/[^/]+\/notifications$/) && method === "POST") {
    return { ok: true } as T;
  }

  if (pathname.startsWith("/push/") && method === "POST") {
    return { ok: true } as T;
  }

  {
    const switchMatch = pathname.match(/^\/me\/memberships\/([^/]+)\/switch$/);
    if (switchMatch && method === "POST") {
      const body = demoBody(init);
      const target = zookDemoFixtures.memberships.find((m) => m.id === switchMatch[1]);
      if (target && body.planId) target.planId = String(body.planId);
      return { subscription: enrichMembership(target ?? activeMembership()) } as T;
    }
  }
  {
    const pauseMatch = pathname.match(/^\/me\/memberships\/([^/]+)\/pause$/);
    if (pauseMatch && method === "POST") {
      const body = demoBody(init);
      const target = zookDemoFixtures.memberships.find((m) => m.id === pauseMatch[1]);
      if (target) {
        target.status = "PAUSED";
        const enriched = enrichMembership(target);
        const planName = enriched?.plan?.name ?? "your membership";
        const resumeDate = body.resumesAt ? new Date(String(body.resumesAt)).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "the selected date";
        zookDemoFixtures.notifications.unshift({
          id: `notif-membership-paused-${Date.now()}`,
          orgId: target.orgId ?? "org-aarogya-strength",
          userId: "user-aarav",
          type: "TRANSACTIONAL",
          title: "Membership paused",
          message: `${planName} is paused until ${resumeDate}. Your remaining days carry over. Resume any time to restore entry.`,
          targetRoute: "/membership",
          readAt: null,
          createdAt: nowIso(),
        });
      }
      return { subscription: enrichMembership(target ?? activeMembership()) } as T;
    }
  }
  {
    const resumeMatch = pathname.match(/^\/me\/memberships\/([^/]+)\/resume$/);
    if (resumeMatch && method === "POST") {
      const target = zookDemoFixtures.memberships.find((m) => m.id === resumeMatch[1]);
      if (target) target.status = "ACTIVE";
      return { subscription: enrichMembership(target ?? activeMembership()) } as T;
    }
  }
  {
    const approveAttendanceMatch = pathname.match(/^\/orgs\/[^/]+\/attendance\/([^/]+)\/approve$/);
    if (approveAttendanceMatch && method === "POST") {
      const record = zookDemoFixtures.attendanceAttempts.find((a) => a.id === approveAttendanceMatch[1]);
      if (record) record.status = "APPROVED";
      return { attendance: record ?? { id: approveAttendanceMatch[1], status: "APPROVED" } } as T;
    }
  }
  {
    const rejectAttendanceMatch = pathname.match(/^\/orgs\/[^/]+\/attendance\/([^/]+)\/reject$/);
    if (rejectAttendanceMatch && method === "POST") {
      const record = zookDemoFixtures.attendanceAttempts.find((a) => a.id === rejectAttendanceMatch[1]);
      if (record) record.status = "REJECTED";
      return { attendance: record ?? { id: rejectAttendanceMatch[1], status: "REJECTED" } } as T;
    }
  }
  if (pathname.match(/^\/orgs\/[^/]+\/attendance\/manual$/) && method === "POST") {
    return { attendance: startDemoCheckIn(activeOrg()?.name ?? null) } as T;
  }
  {
    const planAssignMatch = pathname.match(/^\/orgs\/[^/]+\/plans\/([^/]+)\/assign$/);
    if (planAssignMatch && method === "POST") {
      const plan = demoWorkoutPlans.find((p) => p.id === planAssignMatch[1]);
      return { assignment: { id: `assign-${Date.now()}`, planId: planAssignMatch[1], plan: plan ?? null, active: true, createdAt: nowIso() } } as T;
    }
  }
  {
    const planReviewMatch = pathname.match(/^\/orgs\/[^/]+\/plans\/([^/]+)\/review$/);
    if (planReviewMatch && method === "POST") {
      const plan = demoWorkoutPlans.find((p) => p.id === planReviewMatch[1]);
      if (plan) plan.reviewed = true;
      return { plan: plan ?? { id: planReviewMatch[1], reviewed: true } } as T;
    }
  }
  {
    const planEditMatch = pathname.match(/^\/orgs\/[^/]+\/plans\/([^/]+)$/);
    if (planEditMatch) {
      if (method === "DELETE") {
        const idx = demoWorkoutPlans.findIndex((p) => p.id === planEditMatch[1]);
        if (idx >= 0) demoWorkoutPlans.splice(idx, 1);
        return { ok: true } as T;
      }
      if (method === "PATCH" || method === "PUT") {
        const idx = demoWorkoutPlans.findIndex((p) => p.id === planEditMatch[1]);
        const body = demoBody(init);
        const updated = idx >= 0
          ? Object.assign(demoWorkoutPlans[idx]!, body, { updatedAt: nowIso() })
          : { id: planEditMatch[1], ...body };
        if (idx >= 0) demoWorkoutPlans[idx] = updated as DemoWorkoutPlan;
        return { plan: updated } as T;
      }
    }
  }
  if (pathname.match(/^\/orgs\/[^/]+\/plans$/)) {
    if (method === "POST") {
      const body = demoBody(init);
      const plan: DemoWorkoutPlan = {
        id: `plan-${Date.now()}`,
        orgId: activeOrg()?.id ?? "org-demo",
        creatorUserId: null,
        type: String(body.type ?? "WORKOUT"),
        title: String(body.title ?? "New plan"),
        description: body.description ? String(body.description) : null,
        content: (body.content as Record<string, unknown>) ?? {},
        aiGenerated: Boolean(body.aiGenerated ?? false),
        reviewed: false,
        status: "DRAFT",
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      demoWorkoutPlans.unshift(plan);
      return { plan } as T;
    }
    return { plans: demoWorkoutPlans } as T;
  }
  if (pathname.match(/^\/orgs\/[^/]+\/subscriptions$/) && method === "POST") {
    return {
      checkoutUrl: "/checkout/mock/offline-membership",
      session: { id: `offline-sub-${Date.now()}`, status: "CREATED", provider: "mock" },
    } as T;
  }
  if (pathname.match(/^\/orgs\/[^/]+\/manual-payments$/) && method === "POST") {
    const body = demoBody(init);
    const payment = {
      id: `payment-manual-${Date.now()}`,
      orgId: activeOrg()?.id ?? "org-demo",
      memberUserId: String(body.memberUserId ?? "user-aarav"),
      purpose: String(body.purpose ?? "MEMBERSHIP"),
      amountPaise: Number(body.amountPaise) || 0,
      status: "SUCCEEDED",
      mode: String(body.paymentMode ?? body.mode ?? "CASH"),
      receiptNumber: `RC-DEMO-${String(Date.now()).slice(-6)}`,
      createdAt: nowIso(),
      recordedAt: nowIso(),
    };
    demoRecentPayments.unshift(payment);
    return { payment } as T;
  }
  if (pathname === "/me/profile-photo" && method === "PATCH") {
    return { user: { profilePhotoUrl: null } } as T;
  }

  throw new Error("This action is not available in local test mode.");
}
