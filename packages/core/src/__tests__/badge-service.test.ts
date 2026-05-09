import { describe, expect, it } from "vitest";
import { evaluateBadgeMilestones, getNextBadgeMilestone } from "../services/badge-service";

describe("badge milestone service", () => {
  it("awards only reached milestones", () => {
    expect(evaluateBadgeMilestones({ streakDays: 0, totalCheckIns: 0 })).toEqual([]);
    expect(evaluateBadgeMilestones({ streakDays: 0, totalCheckIns: 1 })).toEqual(["first_checkin"]);
    expect(evaluateBadgeMilestones({ streakDays: 7, totalCheckIns: 7 })).toEqual([
      "first_checkin",
      "streak_7",
    ]);
    expect(evaluateBadgeMilestones({ streakDays: 29, totalCheckIns: 49 })).toEqual([
      "first_checkin",
      "streak_7",
    ]);
    expect(evaluateBadgeMilestones({ streakDays: 30, totalCheckIns: 50 })).toEqual([
      "first_checkin",
      "streak_7",
      "streak_30",
      "checkin_50",
    ]);
  });

  it("does not re-award existing badges", () => {
    expect(
      evaluateBadgeMilestones({
        streakDays: 100,
        totalCheckIns: 100,
        existingBadgeCodes: ["first_checkin", "streak_7", "streak_30", "checkin_50"],
      }),
    ).toEqual(["streak_100", "checkin_100"]);
  });

  it("returns the closest next milestone", () => {
    expect(
      getNextBadgeMilestone({
        streakDays: 6,
        totalCheckIns: 6,
        existingBadgeCodes: ["first_checkin"],
      }),
    ).toMatchObject({
      code: "streak_7",
      current: 6,
      remaining: 1,
      progress: 6 / 7,
    });
    expect(
      getNextBadgeMilestone({
        streakDays: 120,
        totalCheckIns: 110,
        existingBadgeCodes: [
          "first_checkin",
          "streak_7",
          "streak_30",
          "streak_100",
          "checkin_50",
          "checkin_100",
        ],
      }),
    ).toBeNull();
  });
});
