import { zookDemoFixtures } from "@zook/core/demo-fixtures";

function nowIso() {
  return new Date().toISOString();
}

function hoursAgoIso(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function activeOrg() {
  return zookDemoFixtures.organizations[0];
}

function demoBody(init: { body?: unknown }) {
  return init.body && typeof init.body === "object" ? (init.body as Record<string, unknown>) : {};
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

export function demoMemberCoaching() {
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


export function personalTrainingDemoResponse(pathname: string, method: string, init: { body?: unknown }) {
  if (pathname === "/me/pt-subscriptions/request" && method === "POST") {
    return demoRequestPtSubscription(demoBody(init));
  }

  const trainerPayoutMatch = pathname.match(/^\/orgs\/[^/]+\/trainers\/([^/]+)\/payouts$/);
  if (trainerPayoutMatch) {
    return { payouts: demoTrainerPayouts(trainerPayoutMatch[1]) };
  }

  const markPaidMatch = pathname.match(/^\/orgs\/[^/]+\/payouts\/([^/]+)\/mark-paid$/);
  if (markPaidMatch && method === "POST") {
    return demoMarkPayoutPaid(markPaidMatch[1], demoBody(init));
  }

  if (pathname.match(/^\/orgs\/[^/]+\/payouts$/)) {
    return { payouts: demoOrgPayouts };
  }

  if (pathname.match(/^\/orgs\/[^/]+\/pt-subscriptions$/) && method === "POST") {
    return demoRecordPtSubscription(demoBody(init));
  }
  if (pathname.match(/^\/orgs\/[^/]+\/pt-sessions$/) && method === "POST") {
    return demoLogPtSession(demoBody(init));
  }
  const ptSubscriptionApproveMatch = pathname.match(
    /^\/orgs\/[^/]+\/pt-subscriptions\/([^/]+)\/approve$/,
  );
  if (ptSubscriptionApproveMatch && method === "POST") {
    return demoApprovePtSubscription(ptSubscriptionApproveMatch[1]);
  }
  if (pathname.match(/^\/orgs\/[^/]+\/pt-plans$/)) {
    return demoBrowsePtPlans();
  }

  const payoutConfigMatch = pathname.match(
    /^\/orgs\/[^/]+\/trainers\/([^/]+)\/payout-config$/,
  );
  if (payoutConfigMatch) {
    if (method === "PUT" || method === "POST") {
      return demoSetPayoutConfig(payoutConfigMatch[1], demoBody(init));
    }
    return demoGetPayoutConfig(payoutConfigMatch[1]);
  }

  const trainerProfileMatch = pathname.match(/^\/orgs\/[^/]+\/trainers\/([^/]+)\/profile$/);
  if (trainerProfileMatch) {
    if (method === "PATCH" || method === "PUT") {
      return demoUpdateTrainerProfile(trainerProfileMatch[1], demoBody(init));
    }
    return demoGetTrainerProfile(trainerProfileMatch[1]);
  }

  const ptPlanMatch = pathname.match(/^\/orgs\/[^/]+\/trainers\/([^/]+)\/pt-plans$/);
  if (ptPlanMatch) {
    if (method === "POST") {
      return demoCreatePtPlan(ptPlanMatch[1], demoBody(init));
    }
    return { plans: demoPtPlans };
  }
  const ptPlanDetailMatch = pathname.match(
    /^\/orgs\/[^/]+\/trainers\/([^/]+)\/pt-plans\/([^/]+)$/,
  );
  if (ptPlanDetailMatch) {
    if (method === "DELETE") {
      return demoDeletePtPlan(ptPlanDetailMatch[1], ptPlanDetailMatch[2]);
    }
    if (method === "PATCH" || method === "PUT") {
      return demoUpdatePtPlan(ptPlanDetailMatch[1], ptPlanDetailMatch[2], demoBody(init));
    }
  }

  if (pathname.match(/^\/orgs\/[^/]+\/trainers\/[^/]+\/pt-subscriptions$/)) {
    return { subscriptions: demoPtSubscriptions };
  }

  if (pathname.includes("/trainers/") && pathname.endsWith("/clients")) {
    return demoTrainerClients();
  }

  if (pathname.match(/^\/orgs\/[^/]+\/trainers\/[^/]+\/clients\/[^/]+\/note$/)) {
    const body = init.body as { note?: string } | undefined;
    return { note: body?.note ?? "" };
  }

  return undefined;
}
