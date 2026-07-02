import { describe, expect, it } from "vitest";

import {
  mergePlanExercises,
  parseStoredCustomExercises,
  parseStoredStringArray,
  planCustomExerciseStorageKey,
  planProgressStorageKey,
  stalePlanStorageKeys,
} from "../features/member/plan/plan-detail-storage";

describe("plan detail storage helpers", () => {
  it("uses dated progress and custom exercise keys", () => {
    expect(planProgressStorageKey("assignment_1", "2026-07-02")).toBe(
      "zook_plan_progress_assignment_1_2026-07-02",
    );
    expect(planCustomExerciseStorageKey("assignment_1", "2026-07-02")).toBe(
      "zook_plan_custom_assignment_1_2026-07-02",
    );
  });

  it("builds stale cleanup keys outside the seven day window", () => {
    const keys = stalePlanStorageKeys("assignment_1", {
      today: new Date("2026-07-10T10:00:00Z"),
      daysToKeep: 7,
      scanDays: 9,
    });

    expect(keys).toEqual([
      "zook_plan_progress_assignment_1",
      "zook_plan_progress_assignment_1_2026-07-02",
      "zook_plan_custom_assignment_1_2026-07-02",
      "zook_plan_progress_assignment_1_2026-07-01",
      "zook_plan_custom_assignment_1_2026-07-01",
    ]);
  });

  it("parses stored progress and custom exercises defensively", () => {
    expect(parseStoredStringArray(JSON.stringify(["Squat", "", 12, "Press"]))).toEqual([
      "Squat",
      "Press",
    ]);
    expect(
      parseStoredCustomExercises(
        JSON.stringify([
          { name: "Farmer Carries", sets: "Custom", equipment: "Added", reps: "Carry" },
          { name: " " },
          null,
        ]),
      ),
    ).toEqual([
      { name: "Farmer Carries", sets: "Custom", equipment: "Added", reps: "Carry" },
    ]);
  });

  it("merges custom exercises without duplicating API exercises", () => {
    expect(
      mergePlanExercises(
        [{ name: "Squat", sets: "3", equipment: "Barbell", reps: "5" }],
        [
          { name: "squat", sets: "Custom", equipment: "Added", reps: "5" },
          { name: "Farmer Carries", sets: "Custom", equipment: "Added", reps: "40m" },
        ],
      ).map((exercise) => exercise.name),
    ).toEqual(["Squat", "Farmer Carries"]);
  });
});
