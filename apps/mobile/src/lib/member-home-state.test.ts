import { describe, expect, it } from "vitest";

import { deriveHomeState } from "../features/member/home/state";
import { demoMemberHomePayload } from "./demo-member-home";
import type { MemberHomeData } from "./domains/shared/types";

function home(overrides: Partial<MemberHomeData> & Record<string, unknown> = {}): MemberHomeData {
  return {
    activeGoals: 0,
    activeMembership: { daysLeft: 20, status: "ACTIVE" },
    activeOrganization: { id: "org_1", name: "Zook Gym", status: "ACTIVE", username: "zook" },
    activePlan: { id: "plan_1", name: "Strength", type: "WORKOUT" },
    activeCheckIn: null,
    assignedPlans: 1,
    nextCheckInEstimate: null,
    recentAttendance: [],
    streakDays: 3,
    todayPlanAssignmentId: null,
    todayPlanName: null,
    todayPlanTrainer: null,
    unreadNotifications: 0,
    ...overrides,
  };
}

describe("deriveHomeState", () => {
  it("returns first run before home data loads", () => {
    expect(deriveHomeState(undefined)).toEqual({ kind: "firstRun" });
  });

  it("returns noOrg without an active organization", () => {
    expect(deriveHomeState(home({ activeOrganization: null })).kind).toBe("noOrg");
  });

  it("returns expiredMembership for an expired membership", () => {
    expect(
      deriveHomeState(home({ activeMembership: { daysLeft: 0, status: "EXPIRED" } })).kind,
    ).toBe("expiredMembership");
  });

  it("returns noPlan for an active membership without a plan", () => {
    expect(deriveHomeState(home({ activePlan: null }))).toMatchObject({
      kind: "noPlan",
      gymName: "Zook Gym",
    });
  });

  it("returns todayRest when active with no workout today", () => {
    expect(deriveHomeState(home())).toMatchObject({ kind: "todayRest", planName: "Strength" });
  });

  it("returns todayWorkout when a plan assignment is due today", () => {
    expect(
      deriveHomeState(home({ todayPlanAssignmentId: "assign_1", todayPlanName: "Leg day" })),
    ).toMatchObject({
      assignmentId: "assign_1",
      kind: "todayWorkout",
      planName: "Leg day",
    });
  });

  it("returns workoutInProgress for an open session", () => {
    expect(deriveHomeState(home({ activeWorkoutSessionId: "assign_2" }))).toEqual({
      assignmentId: "assign_2",
      kind: "workoutInProgress",
    });
  });

  it("returns workoutLoggedToday after logging today's workout", () => {
    expect(
      deriveHomeState(
        home({ todayWorkoutLoggedAt: "2026-05-20T10:00:00Z", tomorrowPlanName: "Push" }),
      ),
    ).toMatchObject({
      kind: "workoutLoggedToday",
      nextPlanName: "Push",
    });
  });

  it("derives the offline demo member home as today's workout", () => {
    const demoHome = demoMemberHomePayload() as MemberHomeData;

    expect(deriveHomeState(demoHome)).toMatchObject({
      assignmentId: "plan-push-day",
      kind: "todayWorkout",
      planName: "Push Day",
    });
    expect(demoHome).toMatchObject({
      activeMembership: { id: "membership-aarav-hybrid", status: "ACTIVE" },
      activeOrganization: { name: "Aarogya Strength Club" },
      streakDays: 5,
      todayPlanAssignmentId: "plan-push-day",
      todayPlanName: "Push Day",
    });
  });
});
