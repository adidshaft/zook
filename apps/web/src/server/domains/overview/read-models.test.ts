import { describe, expect, it } from "vitest";
import { buildOrganizationDashboardCharts } from "./chart-series";

function daysFrom(startIso: string, count: number) {
  const start = new Date(startIso);
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + index);
    return day;
  });
}

describe("organization dashboard charts", () => {
  it("buckets revenue, attendance, member growth, and plan mix from real rows", () => {
    const thirtyDays = daysFrom("2026-01-01T00:00:00.000Z", 30);
    const sevenDays = thirtyDays.slice(-7);

    const charts = buildOrganizationDashboardCharts({
      sevenDayWindow: { days: sevenDays },
      thirtyDayWindow: { days: thirtyDays },
      revenueRows30d: [
        { amountPaise: 10_000, createdAt: new Date("2026-01-24T12:00:00.000Z") },
        { amountPaise: 5_000, createdAt: new Date("2026-01-25T12:00:00.000Z") },
        { amountPaise: 2_500, createdAt: new Date("2026-01-30T12:00:00.000Z") },
      ],
      attendanceRows7d: [
        { checkedInAt: new Date("2026-01-29T07:00:00.000Z") },
        { checkedInAt: new Date("2026-01-29T08:00:00.000Z") },
        { checkedInAt: new Date("2026-01-30T08:00:00.000Z") },
      ],
      memberSubscriptions30d: [
        {
          startsAt: new Date("2026-01-01T00:00:00.000Z"),
          endsAt: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        },
        {
          startsAt: new Date("2026-01-10T00:00:00.000Z"),
          endsAt: new Date("2026-01-26T00:00:00.000Z"),
          createdAt: new Date("2026-01-10T00:00:00.000Z"),
        },
        {
          startsAt: null,
          endsAt: null,
          createdAt: new Date("2026-01-30T00:00:00.000Z"),
        },
      ],
      planGroups: [
        { planId: "plan_b", _count: { _all: 4 } },
        { planId: "plan_a", _count: { _all: 9 } },
      ],
      planNameById: new Map([
        ["plan_a", "Annual"],
        ["plan_b", "Monthly"],
      ]),
    });

    expect(charts.revenue30d[23]).toMatchObject({ date: "2026-01-24", value: 100 });
    expect(charts.revenue30d[24]).toMatchObject({ date: "2026-01-25", value: 50 });
    expect(charts.revenue7d.map((point) => point.value)).toEqual([100, 50, 0, 0, 0, 0, 25]);
    expect(charts.attendance7d.map((point) => point.value)).toEqual([0, 0, 0, 0, 0, 2, 1]);
    expect(charts.memberGrowth30d[0]).toMatchObject({ value: 1 });
    expect(charts.memberGrowth30d[9]).toMatchObject({ value: 2 });
    expect(charts.memberGrowth30d[26]).toMatchObject({ value: 1 });
    expect(charts.memberGrowth30d[29]).toMatchObject({ value: 2 });
    expect(charts.planMix).toEqual([
      { label: "Annual", value: 9, tone: "lime" },
      { label: "Monthly", value: 4, tone: "sky" },
    ]);
    expect(charts.deltas.revenue7d).toBe(-83.3);
  });

  it("returns zeroed chart series instead of placeholders when there are no rows", () => {
    const thirtyDays = daysFrom("2026-02-01T00:00:00.000Z", 30);
    const sevenDays = thirtyDays.slice(-7);

    const charts = buildOrganizationDashboardCharts({
      sevenDayWindow: { days: sevenDays },
      thirtyDayWindow: { days: thirtyDays },
      revenueRows30d: [],
      attendanceRows7d: [],
      memberSubscriptions30d: [],
      planGroups: [],
      planNameById: new Map(),
    });

    expect(charts.revenue7d).toHaveLength(7);
    expect(charts.revenue30d).toHaveLength(30);
    expect(charts.memberGrowth30d).toHaveLength(30);
    expect(charts.revenue7d.every((point) => point.value === 0)).toBe(true);
    expect(charts.attendance7d.every((point) => point.value === 0)).toBe(true);
    expect(charts.memberGrowth30d.every((point) => point.value === 0)).toBe(true);
    expect(charts.planMix).toEqual([]);
    expect(charts.deltas).toEqual({
      revenue7d: 0,
      revenue30d: 0,
      attendance7d: 0,
      memberGrowth30d: 0,
    });
  });
});
