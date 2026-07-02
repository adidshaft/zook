"use client";

import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  IndianRupee,
  Package,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { AvatarInitials } from "../../dashboard-primitives";
import { GlassCard } from "../../glass-card";
import { formatEnumLabel, formatInr, formatInrCompact, formatWeekdayDate } from "@/lib/format";
import {
  ActivityRow,
  BarChart,
  type ChartTone,
  DeltaChip,
  Donut,
  KPITile,
  LegendItem,
  LineChart,
  SectionHero,
  StatusDot,
} from "../charts";
import {
  useOwnerPrefs,
} from "../../owner-customisation-panel";
import { useDashboardSummary, type DashboardSummaryData } from "@/lib/query-hooks/overview";
import { interpolate } from "./copy";
import type { DashboardCopy, DashboardData } from "./types";

const LazyOwnerCustomisationPanel = lazy(() =>
  import("../../owner-customisation-panel").then((module) => ({
    default: module.OwnerCustomisationPanel,
  }))
);

type AttentionRow = {
  icon: typeof ClipboardList;
  title: string;
  subtitle: string;
  tone: "amber" | "sky" | "rose";
  href: string;
};

export function DashboardOverview({
  activeOrg,
  selectedBranch,
  data,
  copy,
}: {
  activeOrg: DashboardData["orgs"][number];
  selectedBranch: DashboardData["branchScope"]["selectedBranch"];
  data: DashboardData;
  copy: DashboardCopy;
}) {
  const overview = copy.overview;
  const prefs = useOwnerPrefs();
  const [showCustomisationPanel, setShowCustomisationPanel] = useState(false);
  const branchId = data.branchScope.allBranches ? "all" : selectedBranch?.id;
  const initialDashboardData = useMemo(
    () =>
      ({
        summary: data.summary,
        charts: data.charts,
        products: data.products,
        aiUsage: data.aiUsage,
        auditLogCount: data.auditLogCount,
      }) satisfies DashboardSummaryData,
    [
      data.aiUsage,
      data.auditLogCount,
      data.charts,
      data.products,
      data.summary,
    ],
  );
  const dashboardQuery = useDashboardSummary(
    data.connected ? activeOrg.id : undefined,
    branchId,
    { initialData: initialDashboardData },
  );
  const hydratedData = dashboardQuery.data;
  const accent: ChartTone = prefs.accent;
  const summary = hydratedData?.summary ?? data.summary;
  const charts = hydratedData?.charts ?? data.charts;
  const aiUsage = hydratedData?.aiUsage ?? data.aiUsage;
  const auditLogCount = hydratedData?.auditLogCount ?? data.auditLogCount;
  const isRefreshingDashboard = data.connected && dashboardQuery.isFetching;
  const aiQuota = 50;
  const aiUsagePercent = Math.min(100, Math.round((summary.aiUsageThisMonth / aiQuota) * 100));
  const memberLabel = summary.activeMembers === 1 ? overview.memberOne : overview.memberOther;

  const revenueRupees = useMemo(() => Math.round(summary.revenuePaise / 100), [summary.revenuePaise]);
  const revenueTrend = useMemo(() => charts.revenue7d.map((point) => point.value), [charts.revenue7d]);
  const memberTrend = useMemo(() => charts.memberGrowth30d.map((point) => point.value), [charts.memberGrowth30d]);
  const attendanceTrend = useMemo(() => charts.attendance7d.map((point) => point.value), [charts.attendance7d]);
  const planMix = charts.planMix;
  const planMixTotal = useMemo(() => planMix.reduce((sum, slice) => sum + slice.value, 0), [planMix]);

  const nextBestActions: AttentionRow[] = useMemo(() => [
    ...(activeOrg.status !== "ACTIVE"
      ? [
          {
            icon: AlertTriangle,
            title: overview.gymNotActiveTitle,
            subtitle: interpolate(overview.gymNotActiveSubtitle, { status: formatEnumLabel(activeOrg.status) }),
            tone: "rose" as const,
            href: "/dashboard/settings",
          },
        ]
      : []),
    ...(!selectedBranch
      ? [
          {
            icon: ClipboardList,
            title: overview.finishBranchTitle,
            subtitle: overview.finishBranchSubtitle,
            tone: "amber" as const,
            href: "/dashboard/branches",
          },
        ]
      : []),
    ...(summary.joinRequests > 0
      ? [
          {
            icon: UserPlus,
            title: overview.approveJoinTitle,
            subtitle: interpolate(overview.approveJoinSubtitle, {
              count: summary.joinRequests,
              memberLabel: summary.joinRequests === 1 ? overview.memberOne : overview.memberOther,
            }),
            tone: "rose" as const,
            href: "/dashboard/members/join-requests",
          },
        ]
      : []),
    ...(summary.expiringMemberships > 0
      ? [
          {
            icon: CalendarClock,
            title: overview.nudgeRenewalsTitle,
            subtitle: interpolate(overview.nudgeRenewalsSubtitle, {
              count: summary.expiringMemberships,
              membershipLabel: summary.expiringMemberships === 1 ? "membership" : "memberships",
            }),
            tone: "amber" as const,
            href: "/dashboard/members",
          },
        ]
      : []),
    ...(summary.pendingAttendanceApprovals > 0
      ? [
          {
            icon: Dumbbell,
            title: overview.clearApprovalsTitle,
            subtitle: interpolate(overview.clearApprovalsSubtitle, {
              count: summary.pendingAttendanceApprovals,
              checkLabel: summary.pendingAttendanceApprovals === 1 ? "check" : "checks",
            }),
            tone: "sky" as const,
            href: "/dashboard/attendance",
          },
        ]
      : []),
    ...(summary.lowStockProducts > 0
      ? [
          {
            icon: Package,
            title: overview.restockTitle,
            subtitle: interpolate(overview.restockSubtitle, {
              count: summary.lowStockProducts,
              productLabel: summary.lowStockProducts === 1 ? "product" : "products",
            }),
            tone: "amber" as const,
            href: "/dashboard/shop",
          },
        ]
      : []),
    ...(summary.revenuePaise === 0 && summary.cashCollectedPaise === 0
      ? [
          {
            icon: IndianRupee,
            title: overview.confirmPaymentTitle,
            subtitle: overview.confirmPaymentSubtitle,
            tone: "sky" as const,
            href: "/dashboard/payments",
          },
        ]
      : [
          {
            icon: IndianRupee,
            title: overview.reconcileMoneyTitle,
            subtitle: interpolate(overview.reconcileMoneySubtitle, { amount: formatInr(summary.cashCollectedPaise) }),
            tone: "sky" as const,
            href: "/dashboard/payments",
          },
        ]),
  ].slice(0, 5), [activeOrg.status, overview, selectedBranch, summary]);

  const setupComplete = useMemo(() => nextBestActions.length === 1 && nextBestActions[0]?.title === overview.reconcileMoneyTitle, [nextBestActions, overview.reconcileMoneyTitle]);

  const dailyShortcuts: AttentionRow[] = useMemo(() => [
    {
      icon: CheckCircle2,
      title: overview.openQrTitle,
      subtitle: interpolate(overview.openQrSubtitle, {
        count: summary.todayAttendance,
        checkInLabel: summary.todayAttendance === 1 ? "check-in" : "check-ins",
      }),
      tone: "sky",
      href: "/dashboard/attendance/qr-display",
    },
    {
      icon: IndianRupee,
      title: overview.takePaymentTitle,
      subtitle: formatInr(summary.cashCollectedPaise),
      tone: "sky",
      href: "/dashboard/payments",
    },
    {
      icon: Users,
      title: overview.findMemberTitle,
      subtitle: interpolate(overview.findMemberSubtitle, { count: summary.activeMembers }),
      tone: "amber",
      href: "/dashboard/members",
    },
    {
      icon: Package,
      title: overview.shopPickupTitle,
      subtitle: summary.lowStockProducts > 0
        ? interpolate(overview.lowStockSubtitle, { count: summary.lowStockProducts })
        : overview.inventoryHealthy,
      tone: summary.lowStockProducts > 0 ? "amber" : "sky",
      href: "/dashboard/shop",
    },
  ], [overview, summary]);

  const todayLabel = useMemo(() => formatWeekdayDate(new Date()), []);

  useEffect(() => {
    const showPanel = () => setShowCustomisationPanel(true);
    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(showPanel, { timeout: 5_000 });
      return () => window.cancelIdleCallback(idleId);
    }
    const timeoutId = globalThis.setTimeout(showPanel, 4_000);
    return () => globalThis.clearTimeout(timeoutId);
  }, []);

  return (
    <div className="grid gap-6">
      {/* Hero header */}
      <SectionHero
        eyebrow={overview.heroEyebrow}
        title={overview.heroTitle}
        description={interpolate(overview.heroDescription, {
          count: summary.activeMembers,
          memberLabel,
          date: todayLabel,
        })}
        icon={TrendingUp}
        tone={accent}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-sunken)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
              <StatusDot tone={accent} size={6} />
              {overview.today}
            </span>
            <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-sunken)]/60 px-3 py-1 text-xs text-[var(--text-tertiary)]">
              {data.connected ? (isRefreshingDashboard ? overview.updatingMetrics : overview.serverData) : overview.localData}
            </span>
          </div>
        }
      />

      <GlassCard className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              {overview.nextBestActions}
            </p>
            <h2 className="mt-1 text-base font-semibold text-[var(--text-primary)]">
              {setupComplete ? overview.operatingRhythm : overview.needsAttention}
            </h2>
          </div>
          <Link
            href="/dashboard/reports"
            className="rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-sunken)]"
          >
            {overview.openReports} →
          </Link>
        </div>
        <div className="mt-4 grid gap-2 lg:grid-cols-2 xl:grid-cols-1">
          {nextBestActions.map((row, index) => (
            <ActivityRow
              key={row.title}
              icon={row.icon}
              iconTone={row.tone}
              title={row.title}
              subtitle={row.subtitle}
              href={row.href}
              trailing={<ChevronRight size={16} className="text-[var(--text-tertiary)]/60" />}
              index={index}
            />
          ))}
        </div>
        <details className="group mt-3 rounded-[18px] border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 py-2">
          <summary className="zook-focus flex min-h-9 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl text-xs font-semibold text-[var(--text-secondary)]">
            <span>{overview.dailyShortcuts}</span>
            <span className="inline-flex items-center gap-1 text-[var(--text-tertiary)]">
              {interpolate(overview.links, { count: dailyShortcuts.length })}
              <ChevronRight
                size={14}
                className="transition group-open:rotate-90"
                aria-hidden="true"
              />
            </span>
          </summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {dailyShortcuts.map((shortcut) => {
              const Icon = shortcut.icon;
              return (
                <Link
                  key={shortcut.href}
                  href={shortcut.href}
                  className="group zook-focus flex items-center gap-2 rounded-2xl px-2.5 py-2 transition hover:bg-[var(--surface-raised)]"
                >
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-secondary)]">
                    <Icon size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-[var(--text-primary)]">
                      {shortcut.title}
                    </span>
                    <span className="block truncate text-[11px] text-[var(--text-tertiary)]">
                      {shortcut.subtitle}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </details>
      </GlassCard>

      {/* KPI row */}
      <div className={`grid gap-3 sm:gap-4 ${
        prefs.density === "compact"
          ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
          : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
      }`}>
        <KPITile
          label={overview.activeMembers}
          value={summary.activeMembers}
          icon={Users}
          tone={accent}
          trend={memberTrend}
          delta={charts.deltas.memberGrowth30d}
          noTrendLabel={overview.noTrend}
        />
        <KPITile
          label={overview.todaysCheckIns}
          value={summary.todayAttendance}
          icon={CheckCircle2}
          tone="sky"
          trend={attendanceTrend}
          delta={charts.deltas.attendance7d}
          noTrendLabel={overview.noTrend}
        />
        <KPITile
          label={overview.revenueToday}
          value={revenueRupees}
          format={(v) => formatInrCompact(v * 100)}
          icon={IndianRupee}
          tone={accent}
          trend={revenueTrend}
          delta={charts.deltas.revenue7d}
          noTrendLabel={overview.noTrend}
        />
        <KPITile
          label={overview.joinRequests}
          value={summary.joinRequests}
          icon={UserPlus}
          tone="rose"
          href="/dashboard/members/join-requests"
          noTrendLabel={overview.noTrend}
        />
        <KPITile
          label={overview.lowStock}
          value={summary.lowStockProducts}
          icon={Package}
          tone="violet"
          href="/dashboard/shop"
          noTrendLabel={overview.noTrend}
        />
      </div>

      {/* Revenue */}
      <div className="grid grid-cols-1 gap-4">
        {prefs.widgets.revenueChart ? (
          <GlassCard className="overflow-hidden p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                  {overview.revenueLast7Days}
                </p>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="text-3xl font-bold tabular-nums text-[var(--text-primary)]">
                    {formatInr(summary.revenuePaise)}
                  </span>
                  <DeltaChip delta={charts.deltas.revenue7d} />
                </div>
              </div>
              <Link
                href="/dashboard/reports"
                className="rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-sunken)]"
              >
                {overview.openReports} →
              </Link>
            </div>
            <div className="mt-4 h-56">
              <LineChart
                series={revenueTrend}
                labels={charts.revenue7d.map((point) => point.label || "")}
                tone={accent}
                formatY={(v) => formatInrCompact(v * 100)}
                formatTooltip={(v, label) => `${label}: ${formatInrCompact(v * 100)}`}
                ariaLabel={overview.revenueChartAria}
              />
            </div>
          </GlassCard>
        ) : null}

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
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                {overview.dailyCheckInsLast7Days}
              </p>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-3xl font-bold tabular-nums text-[var(--text-primary)]">
                  {summary.todayAttendance}
                </span>
                <span className="text-xs text-[var(--text-tertiary)]">{overview.today}</span>
              </div>
            </div>
            <Link
              href="/dashboard/attendance"
              className="rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-sunken)]"
            >
              {overview.openAttendance} →
            </Link>
          </div>
          <div className="mt-4 h-44">
            <BarChart
              series={attendanceTrend}
              labels={charts.attendance7d.map((point) => point.label || "")}
              tone="sky"
              ariaLabel={overview.dailyCheckInsChartAria}
            />
          </div>
        </GlassCard>
        ) : null}

        {prefs.widgets.planMix ? (
        <GlassCard className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                {overview.planMix}
              </p>
              <h2 className="mt-1 text-base font-semibold text-[var(--text-primary)]">
                {overview.whereMembersAre}
              </h2>
            </div>
            <Link
              href="/dashboard/membership-plans"
              className="rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-sunken)]"
            >
              {overview.editPlans} →
            </Link>
          </div>
          <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-center">
            <Donut
              value={planMix[0]?.value ?? 0}
              total={planMixTotal}
              size={140}
              thickness={14}
              tone="sky"
              centerLabel={
                <span className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                  {planMixTotal}
                </span>
              }
              centerSub={interpolate(overview.activeMemberCenter, {
                memberLabel: planMixTotal === 1 ? overview.memberOne : overview.memberOther,
              })}
            />
            <div className="grid flex-1 gap-2">
              {planMix.length ? planMix.map((slice) => (
                <LegendItem
                  key={slice.label}
                  tone={slice.tone}
                  label={slice.label}
                  value={`${Math.round((slice.value / Math.max(planMixTotal, 1)) * 100)}%`}
                />
              )) : (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 py-2">
                  <span className="truncate text-xs text-[var(--text-secondary)]">{overview.noActivePlanMix}</span>
                  <span className="text-xs font-semibold tabular-nums text-[var(--text-primary)]">0%</span>
                </div>
              )}
            </div>
          </div>
        </GlassCard>
        ) : null}
      </div>
      ) : null}

      {/* AI + Staff — bottom strip */}
      {prefs.widgets.aiUsage || prefs.widgets.staffActivity ? (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {prefs.widgets.aiUsage ? (
        <GlassCard className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">{overview.aiUsage}</h2>
            <Link href="/dashboard/ai" className="text-xs font-medium text-[var(--accent)] hover:underline">
              {overview.insights} →
            </Link>
          </div>
          <div className="mt-5 flex flex-col items-center gap-5 justify-between">
            <div className="flex justify-center shrink-0">
              <Donut
                value={summary.aiUsageThisMonth}
                total={aiQuota}
                size={110}
                thickness={10}
                tone="violet"
                centerLabel={
                  <span className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                    {aiUsagePercent}%
                  </span>
                }
                centerSub={overview.monthlyLimit}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 w-full min-w-0">
              {(
                [
                  [overview.aiEvents, `${summary.aiUsageThisMonth} / ${aiQuota}`],
                  [overview.recentLogs, `${aiUsage.length}`],
                  [overview.data, data.connected ? overview.server : overview.local],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="flex flex-col items-center justify-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] p-2 min-w-0 text-center"
                >
                  <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider truncate w-full">{label}</span>
                  <span className="text-xs font-semibold tabular-nums text-[var(--text-primary)] truncate w-full">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
        ) : null}

        {prefs.widgets.staffActivity ? (
        <GlassCard className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">{overview.recentStaffActivity}</h2>
            <Link href="/dashboard/audit" className="text-xs font-medium text-[var(--accent)] hover:underline">
              {overview.auditLog} →
            </Link>
          </div>
          <Link
            href="/dashboard/audit"
            className="mt-4 flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 py-3 transition hover:border-[var(--border)]"
          >
            <AvatarInitials name={overview.auditAvatarName} className="h-9 w-9 rounded-full" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-[var(--text-primary)]">
                {interpolate(overview.staffRolesAudit, {
                  staffCount: summary.staffCount,
                  auditCount: auditLogCount,
                })}
              </span>
              <span className="block text-xs text-[var(--text-tertiary)]">{overview.exactActions}</span>
            </span>
            <ChevronRight size={16} className="text-[var(--text-tertiary)]/60" />
          </Link>
        </GlassCard>
        ) : null}
      </div>
      ) : null}

      {showCustomisationPanel ? (
        <Suspense fallback={<div className="h-20 rounded-[28px] bg-[var(--surface-raised)]" />}>
          <LazyOwnerCustomisationPanel />
        </Suspense>
      ) : null}
    </div>
  );
}
