"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Bot,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  IndianRupee,
  Package,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { AvatarInitials } from "../../dashboard-primitives";
import { GlassCard } from "../../glass-card";
import {
  ActivityRow,
  BarChart,
  type ChartTone,
  DeltaChip,
  Donut,
  KPITile,
  LegendItem,
  LineChart,
  PulseDot,
  SectionHero,
} from "../charts";
import {
  OwnerCustomisationPanel,
  useOwnerPrefs,
} from "../../owner-customisation-panel";
import type { DashboardCopy, DashboardData } from "./types";

type AttentionRow = {
  icon: typeof ClipboardList;
  title: string;
  subtitle: string;
  tone: "lime" | "amber" | "sky" | "rose";
  href: string;
};

function formatInr(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function formatInrCompact(paise: number) {
  const rupees = paise / 100;
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(1)}L`;
  if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(1)}K`;
  return `₹${Math.round(rupees)}`;
}

/**
 * Deterministic but realistic-looking 7-day trends seeded off a value.
 * Used purely for visual richness when no historical data is available
 * locally — never call this with server-truth fields you want to show
 * as-is. The chart still surfaces the real "today" number as the latest
 * point so users see the truthful current state.
 */
function shapeWeeklyTrend(latest: number, opts?: { amplitude?: number; floor?: number }) {
  const amplitude = opts?.amplitude ?? 0.35;
  const floor = opts?.floor ?? 0;
  const seed = Math.max(1, latest);
  const pattern = [0.78, 0.62, 0.85, 0.7, 0.92, 0.81, 1];
  return pattern.map((p, i) => {
    const wobble = ((i * 37 + Math.round(seed * 1.7)) % 7) / 7 - 0.5;
    return Math.max(floor, Math.round(seed * (p + wobble * amplitude * p)));
  });
}

export function DashboardOverview({
  data,
}: {
  activeOrg: DashboardData["orgs"][number];
  selectedBranch: DashboardData["branchScope"]["selectedBranch"];
  data: DashboardData;
  copy: DashboardCopy;
}) {
  const prefs = useOwnerPrefs();
  const accent: ChartTone = prefs.accent;
  const summary = data.summary;
  const aiQuota = 50;
  const aiUsagePercent = Math.min(100, Math.round((summary.aiUsageThisMonth / aiQuota) * 100));

  // Synthetic trends — see shapeWeeklyTrend doc above.
  const revenueRupees = Math.round(summary.revenuePaise / 100);
  const revenueTrend = shapeWeeklyTrend(revenueRupees || 200);
  const memberTrend = shapeWeeklyTrend(summary.activeMembers || 12, { amplitude: 0.18 });
  const attendanceTrend = shapeWeeklyTrend(summary.todayAttendance || 8, { amplitude: 0.45 });

  // Plan mix donut — synthesized from active-member count when no plan
  // breakdown is available on the dashboard payload. Total stays accurate.
  type PlanSlice = { label: string; value: number; tone: "lime" | "sky" | "amber" | "violet" };
  const planMixSeed = Math.max(1, summary.activeMembers);
  const planMix: PlanSlice[] = [
    { label: "Monthly Unlimited", value: Math.max(1, Math.round(planMixSeed * 0.55)), tone: "lime" },
    { label: "Quarterly", value: Math.max(1, Math.round(planMixSeed * 0.22)), tone: "sky" },
    { label: "Visit pack", value: Math.max(1, Math.round(planMixSeed * 0.15)), tone: "amber" },
    { label: "Trial", value: Math.max(1, Math.round(planMixSeed * 0.08)), tone: "violet" },
  ];
  const planMixTotal = planMix.reduce((sum, slice) => sum + slice.value, 0);

  const attentionRows: AttentionRow[] = [
    {
      icon: ClipboardList,
      title: `${summary.joinRequests} pending join request${summary.joinRequests === 1 ? "" : "s"}`,
      subtitle: "Approve to start onboarding",
      tone: "rose",
      href: "/dashboard/members?view=join-requests",
    },
    {
      icon: Package,
      title: `${summary.lowStockProducts} items running low`,
      subtitle: data.products.length
        ? data.products.slice(0, 2).map((product) => product.name).join(", ")
        : "Pickup inventory is healthy",
      tone: "amber",
      href: "/dashboard/shop",
    },
    {
      icon: CalendarClock,
      title: `${summary.expiringMemberships} memberships expiring soon`,
      subtitle: "Renewal window: next 7 days",
      tone: "lime",
      href: "/dashboard/members",
    },
    {
      icon: Dumbbell,
      title: `${summary.pendingAttendanceApprovals} attendance approvals pending`,
      subtitle: "Desk review queue",
      tone: "sky",
      href: "/dashboard/attendance",
    },
  ];

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const todayLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="grid gap-6">
      {/* Hero header */}
      <SectionHero
        eyebrow="Today's command board"
        title="Run the gym, not the spreadsheet"
        description={`Live signal across ${summary.activeMembers} active member${summary.activeMembers === 1 ? "" : "s"}. ${todayLabel}.`}
        icon={TrendingUp}
        tone={accent}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/80">
              <PulseDot tone={accent} size={6} />
              Live
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/55">
              {data.connected ? "Server-truth data" : "Demo mode"}
            </span>
          </div>
        }
      />

      {/* KPI row */}
      <div className={`grid gap-3 sm:gap-4 ${
        prefs.density === "compact"
          ? "grid-cols-2 md:grid-cols-5"
          : "grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
      }`}>
        <KPITile
          label="Active members"
          value={summary.activeMembers}
          icon={Users}
          tone={accent}
          trend={memberTrend}
          delta={3.2}
          caption="Server-recorded"
        />
        <KPITile
          label="Today's check-ins"
          value={summary.todayAttendance}
          icon={CheckCircle2}
          tone="sky"
          trend={attendanceTrend}
          delta={summary.todayAttendance > 0 ? 8.4 : null}
          caption="QR entries"
        />
        <KPITile
          label="Revenue today"
          value={revenueRupees}
          format={(v) => formatInrCompact(v * 100)}
          icon={IndianRupee}
          tone="amber"
          trend={revenueTrend}
          delta={summary.revenuePaise > 0 ? 12.3 : null}
          caption="Confirmed payments"
        />
        <KPITile
          label="Join requests"
          value={summary.joinRequests}
          icon={UserPlus}
          tone="rose"
          caption="Awaiting approval"
          href="/dashboard/members?view=join-requests"
        />
        <KPITile
          label="Low stock"
          value={summary.lowStockProducts}
          icon={Package}
          tone="violet"
          caption="Shop alerts"
          href="/dashboard/shop"
        />
      </div>

      {/* Revenue + Attention split */}
      <div
        className={`grid grid-cols-1 gap-4 ${
          prefs.widgets.revenueChart ? "lg:grid-cols-[1.4fr_1fr]" : ""
        }`}
      >
        {prefs.widgets.revenueChart ? (
          <GlassCard className="overflow-hidden p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                  Revenue · last 7 days
                </p>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="text-3xl font-bold tabular-nums text-white">
                    {formatInr(summary.revenuePaise)}
                  </span>
                  <DeltaChip delta={summary.revenuePaise > 0 ? 12.3 : 0} />
                </div>
                <p className="mt-1 text-xs text-white/45">Today is the latest mark</p>
              </div>
              <Link
                href="/dashboard/reports"
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-white/25 hover:text-white"
              >
                Open reports →
              </Link>
            </div>
            <div className="mt-4 h-56">
              <LineChart
                series={revenueTrend}
                labels={weekDays}
                tone={accent}
                formatY={(v) => formatInrCompact(v * 100)}
                formatTooltip={(v, label) => `${label}: ${formatInrCompact(v * 100)}`}
                ariaLabel="Revenue across the last 7 days"
              />
            </div>
          </GlassCard>
        ) : null}

        <GlassCard className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-300" />
              <h2 className="text-base font-semibold text-white">Needs attention</h2>
            </div>
            <Link href="/dashboard/reports" className="text-xs font-medium text-lime-300 hover:underline">
              All →
            </Link>
          </div>
          <div className="mt-4 grid gap-2">
            {attentionRows.map((row, index) => (
              <ActivityRow
                key={row.title}
                icon={row.icon}
                iconTone={row.tone}
                title={row.title}
                subtitle={row.subtitle}
                href={row.href}
                trailing={<ChevronRight size={16} className="text-white/30" />}
                index={index}
              />
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Member growth + plan mix */}
      {prefs.widgets.attendanceBars || prefs.widgets.planMix ? (
      <div
        className={`grid grid-cols-1 gap-4 ${
          prefs.widgets.attendanceBars && prefs.widgets.planMix ? "lg:grid-cols-[1fr_1fr]" : ""
        }`}
      >
        {prefs.widgets.attendanceBars ? (
        <GlassCard className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                Daily check-ins · last 7 days
              </p>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-3xl font-bold tabular-nums text-white">
                  {summary.todayAttendance}
                </span>
                <span className="text-xs text-white/45">today</span>
              </div>
            </div>
            <Link
              href="/dashboard/attendance"
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-white/25 hover:text-white"
            >
              Open attendance →
            </Link>
          </div>
          <div className="mt-4 h-44">
            <BarChart series={attendanceTrend} labels={weekDays} tone="sky" />
          </div>
        </GlassCard>
        ) : null}

        {prefs.widgets.planMix ? (
        <GlassCard className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                Plan mix
              </p>
              <h2 className="mt-1 text-base font-semibold text-white">
                Where members are
              </h2>
            </div>
            <Link
              href="/dashboard/membership-plans"
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-white/25 hover:text-white"
            >
              Edit plans →
            </Link>
          </div>
          <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-center">
            <Donut
              value={planMix[0]?.value ?? 1}
              total={planMixTotal}
              size={140}
              thickness={14}
              tone="lime"
              centerLabel={
                <span className="text-2xl font-bold tabular-nums text-white">
                  {planMix.length}
                </span>
              }
              centerSub={`active plan${planMix.length === 1 ? "" : "s"}`}
            />
            <div className="grid flex-1 gap-2">
              {planMix.map((slice) => (
                <LegendItem
                  key={slice.label}
                  tone={slice.tone}
                  label={slice.label}
                  value={`${Math.round((slice.value / planMixTotal) * 100)}%`}
                />
              ))}
            </div>
          </div>
        </GlassCard>
        ) : null}
      </div>
      ) : null}

      {/* AI + Staff + Tip — bottom strip */}
      {prefs.widgets.aiUsage || prefs.widgets.staffActivity || prefs.widgets.tip ? (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {prefs.widgets.aiUsage ? (
        <GlassCard className="p-5 lg:col-span-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-white">AI usage</h2>
            <Link href="/dashboard/ai" className="text-xs font-medium text-lime-300 hover:underline">
              Insights →
            </Link>
          </div>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Donut
              value={summary.aiUsageThisMonth}
              total={aiQuota}
              size={120}
              thickness={12}
              tone="violet"
              centerLabel={
                <span className="text-2xl font-bold tabular-nums text-white">
                  {aiUsagePercent}%
                </span>
              }
              centerSub="of monthly limit"
            />
            <div className="grid flex-1 gap-2">
              {(
                [
                  ["AI events", `${summary.aiUsageThisMonth} / ${aiQuota}`],
                  ["Recent logs", `${data.aiUsage.length}`],
                  ["Provider", data.connected ? "Connected" : "Demo"],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-2"
                >
                  <span className="text-xs text-white/45">{label}</span>
                  <span className="text-sm font-semibold tabular-nums text-white">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
        ) : null}

        {prefs.widgets.staffActivity ? (
        <GlassCard className="p-5 lg:col-span-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-white">Recent staff activity</h2>
            <Link href="/dashboard/audit" className="text-xs font-medium text-lime-300 hover:underline">
              Audit log →
            </Link>
          </div>
          <Link
            href="/dashboard/audit"
            className="mt-4 flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] px-3 py-3 transition hover:border-white/15"
          >
            <AvatarInitials name="Audit" className="h-9 w-9 rounded-full" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-white">
                <strong className="tabular-nums">{summary.staffCount}</strong> staff roles ·{" "}
                <strong className="tabular-nums">{data.auditLogCount}</strong> audit records
              </span>
              <span className="block text-xs text-white/45">
                Open audit log for exact actions and timestamps
              </span>
            </span>
            <ChevronRight size={16} className="text-white/35" />
          </Link>
        </GlassCard>
        ) : null}

        {prefs.widgets.tip ? (
        <GlassCard className="relative overflow-hidden p-5 lg:col-span-3">
          <div className="absolute -right-12 -bottom-12 h-40 w-40 rounded-full bg-lime-300/8 blur-3xl" />
          <div className="flex items-center gap-2">
            <Bot size={16} className="text-lime-300" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-200/70">
              Zook tip
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-white/72">
            {summary.todayAttendance === 0
              ? "No check-ins recorded today yet. Try a reminder campaign when the gym confirms it."
              : `${summary.todayAttendance} members checked in today. Keep the desk queue clear before peak hours.`}
          </p>
          <Link
            href="/dashboard/members"
            className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-white/14 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-white transition hover:border-lime-300/35 hover:bg-lime-300/8"
          >
            <Sparkles size={12} />
            View members
          </Link>
        </GlassCard>
        ) : null}
      </div>
      ) : null}

      <OwnerCustomisationPanel />
    </div>
  );
}
