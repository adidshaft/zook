import { addDays, startOfToday, toDateKey } from "../shared/date";

type DailyPoint = {
  date: string;
  label: string;
  value: number;
};

type PlanMixPoint = {
  label: string;
  value: number;
  tone: "lime" | "sky" | "amber" | "violet";
};

type ChartWindow = {
  days: Date[];
};

type DashboardRevenueRow = {
  amountPaise: number;
  createdAt: Date;
};

type DashboardAttendanceRow = {
  checkedInAt: Date;
};

type DashboardMemberSubscriptionRow = {
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
};

type DashboardPlanGroup = {
  planId: string;
  _count: {
    _all: number;
  };
};

export function dayWindow(days: number) {
  const today = startOfToday();
  const start = addDays(today, -(days - 1));
  const end = addDays(today, 1);
  const daysInWindow = Array.from({ length: days }, (_, index) => addDays(start, index));
  return { start, end, days: daysInWindow };
}

export function dateRangeWindow(from: Date, to: Date) {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const endDay = new Date(to);
  endDay.setHours(0, 0, 0, 0);
  const end = addDays(endDay, 1);
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
  const daysInWindow = Array.from({ length: days }, (_, index) => addDays(start, index));
  return { start, end, days: daysInWindow };
}

function formatShortWeekday(date: Date) {
  return new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: "Asia/Kolkata" }).format(
    date,
  );
}

function formatDayLabel(date: Date, index: number, total: number) {
  if (total <= 7) return formatShortWeekday(date);
  if (index === 0) return "30d";
  if (index === total - 1) return "Today";
  return (index + 1) % 5 === 0 ? `D-${total - index}` : "";
}

function dailySeriesFromRows<T>(
  days: Date[],
  rows: T[],
  getDate: (row: T) => Date,
  getValue: (row: T) => number,
) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const key = toDateKey(getDate(row));
    totals.set(key, (totals.get(key) ?? 0) + getValue(row));
  }
  return days.map((day, index) => {
    const key = toDateKey(day);
    return {
      date: key,
      label: formatDayLabel(day, index, days.length),
      value: totals.get(key) ?? 0,
    };
  });
}

function percentDelta(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function seriesDelta(points: DailyPoint[]) {
  const midpoint = Math.floor(points.length / 2);
  const previous = points.slice(0, midpoint).reduce((sum, point) => sum + point.value, 0);
  const current = points.slice(midpoint).reduce((sum, point) => sum + point.value, 0);
  return percentDelta(current, previous);
}

export function buildOrganizationDashboardCharts(input: {
  sevenDayWindow: ChartWindow;
  thirtyDayWindow: ChartWindow;
  revenueRows30d: DashboardRevenueRow[];
  attendanceRows7d: DashboardAttendanceRow[];
  memberSubscriptions30d: DashboardMemberSubscriptionRow[];
  planGroups: DashboardPlanGroup[];
  planNameById: Map<string, string>;
}) {
  const revenueSeries30d = dailySeriesFromRows(
    input.thirtyDayWindow.days,
    input.revenueRows30d,
    (row) => row.createdAt,
    (row) => Math.round(row.amountPaise / 100),
  );
  const revenueSeries7d = revenueSeries30d.slice(-7).map((point, index) => ({
    ...point,
    label: formatShortWeekday(input.sevenDayWindow.days[index] ?? new Date(point.date)),
  }));
  const attendanceSeries7d = dailySeriesFromRows(
    input.sevenDayWindow.days,
    input.attendanceRows7d,
    (row) => row.checkedInAt,
    () => 1,
  );
  const memberGrowth30d = input.thirtyDayWindow.days.map((day, index) => {
    const dayEnd = addDays(day, 1).getTime();
    const count = input.memberSubscriptions30d.filter((subscription) => {
      const startsAt = (subscription.startsAt ?? subscription.createdAt).getTime();
      const endsAt = subscription.endsAt?.getTime();
      return startsAt < dayEnd && (!endsAt || endsAt >= day.getTime());
    }).length;
    return {
      date: toDateKey(day),
      label: formatDayLabel(day, index, input.thirtyDayWindow.days.length),
      value: count,
    };
  });
  const tones: PlanMixPoint["tone"][] = ["lime", "sky", "amber", "violet", "lime", "sky"];
  const planMix = [...input.planGroups]
    .sort((a, b) => b._count._all - a._count._all)
    .slice(0, 6)
    .map((group, index) => ({
      label: input.planNameById.get(group.planId) ?? "Unknown plan",
      value: group._count._all,
      tone: tones[index % tones.length] ?? "lime",
    }));

  return {
    revenue7d: revenueSeries7d,
    revenue30d: revenueSeries30d,
    attendance7d: attendanceSeries7d,
    memberGrowth30d,
    planMix,
    deltas: {
      revenue7d: seriesDelta(revenueSeries7d),
      revenue30d: seriesDelta(revenueSeries30d),
      attendance7d: seriesDelta(attendanceSeries7d),
      memberGrowth30d: percentDelta(
        memberGrowth30d.at(-1)?.value ?? 0,
        memberGrowth30d[0]?.value ?? 0,
      ),
    },
  };
}
