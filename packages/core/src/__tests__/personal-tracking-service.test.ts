import { describe, expect, it } from "vitest";
import { PersonalTrackingService } from "../services";

const service = new PersonalTrackingService();

describe("personal tracking service", () => {
  it("creates and updates workout durations", () => {
    const created = service.createWorkoutSession({
      title: "Upper body",
      workoutType: "strength",
      startedAt: new Date("2026-04-24T06:00:00.000Z"),
      endedAt: new Date("2026-04-24T07:10:00.000Z")
    });
    expect(created.durationMinutes).toBe(70);

    const updated = service.updateWorkoutSession(
      {
        ...created,
        id: "workout_1",
        userId: "member_1",
        durationMinutes: created.durationMinutes ?? 0,
        visibility: created.visibility ?? "PRIVATE"
      },
      { endedAt: new Date("2026-04-24T07:25:00.000Z") }
    );
    expect(updated.durationMinutes).toBe(85);
  });

  it("keeps private visibility for minors", () => {
    expect(
      service.normalizeVisibility({
        requestedVisibility: "TRAINER_VISIBLE",
        isMinor: true,
        guardianConsentGranted: true
      })
    ).toBe("PRIVATE");
  });

  it("computes weekly consistency and plan completion impact", () => {
    const weeklyCount = service.computeWeeklyConsistency(
      [
        { startedAt: new Date("2026-04-18T06:00:00.000Z") },
        { startedAt: new Date("2026-04-22T06:00:00.000Z") },
        { startedAt: new Date("2026-04-24T06:00:00.000Z") }
      ],
      new Date("2026-04-24T08:00:00.000Z")
    );

    expect(weeklyCount).toBe(3);
    expect(service.computePlanCompletionImpact({ assignedPlans: 5, completedPlans: 4 })).toBe(80);
  });
});
