import { zookDemoFixtures } from "@zook/core/demo-fixtures";

// Live check-in session (offline demo). Set when the member scans/enters a
// code, cleared on checkout — so Home shows the active-session timer + checkout
// and the check-in flow works end to end.
type DemoActiveCheckIn = {
  id: string;
  orgId?: string;
  branchId?: string;
  branchName?: string | null;
  checkedInAt: string;
  status: string;
  source?: string | null;
};

let demoActiveCheckIn: DemoActiveCheckIn | null = null;

export function getDemoActiveCheckIn() {
  return demoActiveCheckIn;
}

export function startDemoCheckIn(branchName?: string | null): DemoActiveCheckIn {
  const org = activeOrg();
  const branch = zookDemoFixtures.branches[0];
  demoActiveCheckIn = {
    id: `attendance-live-${Date.now()}`,
    orgId: org?.id,
    branchId: branch?.id,
    branchName: branchName ?? branch?.name ?? org?.name ?? "Your gym",
    checkedInAt: new Date().toISOString(),
    status: "APPROVED",
    source: "OFFLINE_DEMO",
  };
  return demoActiveCheckIn;
}

export function clearDemoCheckIn() {
  demoActiveCheckIn = null;
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

export function demoMemberHomePayload() {
  const org = activeOrg();
  const membership = activeMembership();
  const plan = activeTrainingPlan();
  return {
    activeOrganization: org
      ? {
          id: org.id,
          name: org.name,
          status: org.status,
          city: org.city,
          state: org.state,
          username: org.username,
        }
      : null,
    activeMembership: membership
      ? {
          id: membership.id,
          status: membership.status,
          endsAt: null,
          remainingVisits: membership.remainingVisits,
          daysLeft: membership.daysLeft,
          nextCheckInEstimate: "Available today",
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
    activeCheckIn: demoActiveCheckIn,
    recentAttendance: zookDemoFixtures.attendanceAttempts.map((attempt) => ({
      id: attempt.id,
      checkedInAt: attempt.checkedInAt,
      status: attempt.status,
      source: "OFFLINE_DEMO",
    })),
    unreadNotifications: zookDemoFixtures.notifications.filter(
      (notification) => !notification.readAt,
    ).length,
    activeGoals: 3,
    assignedPlans: zookDemoFixtures.trainingPlans.length,
    streakDays: membership?.streakDays ?? 0,
    todayPlanName: plan?.title ?? null,
    todayPlanAssignmentId: plan?.id ?? null,
    nextCheckInEstimate: "Available today",
  };
}
