import { describe, expect, it, vi } from "vitest";
import { startOfDayIst, startOfMonthIst, toDateKey } from "./domains/shared/date";

describe("IST date boundaries", () => {
  it("counts a late UTC event as the next IST day", () => {
    const eventAt = new Date("2026-07-01T20:00:00Z");

    expect(toDateKey(eventAt)).toBe("2026-07-02");
    expect(startOfDayIst(eventAt).toISOString()).toBe("2026-07-01T18:30:00.000Z");
    expect(startOfMonthIst(eventAt).toISOString()).toBe("2026-06-30T18:30:00.000Z");
  });

  it("uses the IST operational day for reception code verification windows", () => {
    const verificationAt = new Date("2026-07-02T01:00:00Z");
    const todayStart = startOfDayIst(verificationAt);
    const sameIstDayCheckIn = new Date("2026-07-01T22:00:00Z");
    const previousIstDayCheckIn = new Date("2026-07-01T10:00:00Z");

    expect(todayStart.toISOString()).toBe("2026-07-01T18:30:00.000Z");
    expect(sameIstDayCheckIn.getTime()).toBeGreaterThanOrEqual(todayStart.getTime());
    expect(previousIstDayCheckIn.getTime()).toBeLessThan(todayStart.getTime());
  });

  it("keeps fallback date keys and month starts on IST boundaries", () => {
    const dateTimeFormat = vi.spyOn(Intl, "DateTimeFormat").mockReturnValue({
      formatToParts: () => [],
    } as unknown as Intl.DateTimeFormat);
    const eventAt = new Date("2026-07-01T20:00:00Z");

    try {
      expect(toDateKey(eventAt)).toBe("2026-07-02");
      expect(startOfDayIst(eventAt).toISOString()).toBe("2026-07-01T18:30:00.000Z");
      expect(startOfMonthIst(eventAt).toISOString()).toBe("2026-06-30T18:30:00.000Z");
    } finally {
      dateTimeFormat.mockRestore();
    }
  });

  it("keeps workout progress completed after UTC midnight when it is still the same IST day", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-01T20:00:00Z"));
    vi.resetModules();
    const { getPlanExercisesForUser } = await import("./domains/plans/read-models");
    const { prisma } = await import("@zook/db");

    vi.mocked(prisma.planAssignment.findFirst).mockResolvedValue({
      id: "assignment_1",
      assignedToUserId: "member_1",
      planId: "plan_1",
      active: true,
    } as never);
    vi.mocked(prisma.planContent.findUnique).mockResolvedValue({
      id: "plan_1",
      content: { exercises: [{ id: "squat", name: "Squat" }] },
    } as never);
    vi.mocked(prisma.planProgress.findUnique).mockResolvedValue({
      progressJson: {
        completedAt: "2026-07-01T18:45:00Z",
        completedExercises: ["Squat"],
      },
    } as never);

    const result = await getPlanExercisesForUser("member_1", "assignment_1");

    expect(result?.exercises[0]?.completed).toBe(true);
    vi.useRealTimers();
  });
});

vi.mock("@zook/db", () => ({
  prisma: {
    planAssignment: { findFirst: vi.fn() },
    planContent: { findUnique: vi.fn() },
    planProgress: { findUnique: vi.fn() },
  },
  Prisma: {},
}));
