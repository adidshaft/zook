import type { MemberHomeData } from "@/lib/domains/shared/types";

type HomeSignals = MemberHomeData & {
  activePlanName?: string | null;
  activeWorkoutSessionId?: string | null;
  todayEstimatedMinutes?: number | null;
  todayWorkoutLoggedAt?: string | null;
  tomorrowPlanName?: string | null;
};

export type HomeState =
  | { kind: "noOrg" }
  | { kind: "expiredMembership" }
  | { kind: "membershipBlocked"; reason: "cancelled" | "pastDue" | "paymentPending" | "paused" }
  | { kind: "membershipPendingActivation"; gymName: string }
  | { kind: "noPlan"; gymName: string; daysLeft: number }
  | { kind: "todayRest"; planName: string; streak: number }
  | {
      kind: "todayWorkout";
      planName: string;
      assignmentId: string;
      estimatedMinutes?: number;
    }
  | { kind: "workoutInProgress"; assignmentId: string }
  | { kind: "workoutLoggedToday"; nextPlanName?: string; streak: number }
  | { kind: "firstRun"; gymUsername?: string };

function isExpired(membership: HomeSignals["activeMembership"]) {
  if (!membership) return false;
  const status = String(membership.status ?? "").toUpperCase();
  return (
    status.includes("EXPIRED") ||
    (typeof membership.daysLeft === "number" && membership.daysLeft <= 0)
  );
}

export function deriveHomeState(home: HomeSignals | undefined): HomeState {
  if (!home) return { kind: "firstRun" };
  if (!home.activeOrganization) return { kind: "noOrg" };
  if (isExpired(home.activeMembership)) return { kind: "expiredMembership" };
  const membershipStatus = String(home.activeMembership?.status ?? "").toUpperCase();
  if (membershipStatus.includes("CANCEL")) {
    return { kind: "membershipBlocked", reason: "cancelled" };
  }
  if (membershipStatus.includes("PAST_DUE") || membershipStatus.includes("OVERDUE")) {
    return { kind: "membershipBlocked", reason: "pastDue" };
  }
  if (membershipStatus.includes("PENDING") || membershipStatus.includes("PAYMENT")) {
    return { kind: "membershipBlocked", reason: "paymentPending" };
  }
  if (membershipStatus.includes("PAUSED")) {
    return { kind: "membershipBlocked", reason: "paused" };
  }
  if (home.activeWorkoutSessionId) {
    return { kind: "workoutInProgress", assignmentId: home.activeWorkoutSessionId };
  }
  if (home.todayWorkoutLoggedAt) {
    return {
      kind: "workoutLoggedToday",
      nextPlanName: home.tomorrowPlanName ?? undefined,
      streak: home.streakDays ?? 0,
    };
  }
  if (home.todayPlanName && home.todayPlanAssignmentId) {
    return {
      kind: "todayWorkout",
      planName: home.todayPlanName,
      assignmentId: home.todayPlanAssignmentId,
      estimatedMinutes: home.todayEstimatedMinutes ?? undefined,
    };
  }
  if (home.activeMembership && !home.todayPlanName && home.activePlan) {
    return {
      kind: "todayRest",
      planName: home.activePlanName ?? home.activePlan.name ?? "Active plan",
      streak: home.streakDays ?? 0,
    };
  }
  if (home.activeMembership && !home.activePlan) {
    return {
      kind: "noPlan",
      gymName: home.activeOrganization.name,
      daysLeft: home.activeMembership.daysLeft ?? 0,
    };
  }
  if (home.activeOrganization && !home.activeMembership) {
    return {
      kind: "membershipPendingActivation",
      gymName: home.activeOrganization.name,
    };
  }
  return { kind: "firstRun", gymUsername: home.activeOrganization.username ?? undefined };
}
