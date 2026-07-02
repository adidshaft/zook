"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  CircleAlert,
  TrendingUp,
  IndianRupee,
  Users,
  ClipboardList,
  CalendarDays,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ReadoutGrid, SectionHeader } from "../../dashboard-primitives";
import { GlassCard } from "../../glass-card";
import { BarChart, DeltaChip, Donut, LegendItem, LineChart, SectionHero } from "../charts";
import {
  formatCompactNumber,
  formatDate,
  formatDaysRemaining,
  formatEnumLabel,
  formatInr,
  formatInrCompact,
} from "@/lib/format";
import type {
  DashboardCharts,
  OrganizationSnapshot,
  OrganizationSummary,
} from "@/components/dashboard/types";
import { webApiFetch } from "@/lib/api-client";
import { CsvExportButton } from "../operational-shared";
import { useT } from "@/lib/use-t";

type TabId = "financials" | "attendance" | "members" | "snapshot";

export function ReportsPanel({
  organization,
  summary,
  charts,
  selectedBranchName,
  selectedBranchId,
  auditLogCount,
}: {
  organization: OrganizationSnapshot;
  summary: OrganizationSummary;
  charts: DashboardCharts;
  selectedBranchName: string;
  selectedBranchId?: string | null;
  auditLogCount: number;
}) {
  const t = useT("reports");
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [dateRange, setDateRange] = useState({ from: sevenDaysAgo, to: today });
  const invalidRange = dateRange.to < dateRange.from;
  const [revenueWindow, setRevenueWindow] = useState<"7d" | "30d">("7d");
  const [activeTab, setActiveTab] = useState<TabId>("financials");
  const [reportCharts, setReportCharts] = useState(charts);
  const [chartsLoading, setChartsLoading] = useState(false);
  const [chartsError, setChartsError] = useState<string | null>(null);

  useEffect(() => {
    if (invalidRange) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      from: dateRange.from,
      to: dateRange.to,
    });
    if (selectedBranchId) {
      params.set("branchId", selectedBranchId);
    }
    setChartsLoading(true);
    setChartsError(null);
    webApiFetch<{ charts: DashboardCharts }>(
      `/api/orgs/${organization.id}/reports/summary?${params.toString()}`,
      { signal: controller.signal },
    )
      .then((payload) => {
        setReportCharts(payload.charts);
      })
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setChartsError(cause instanceof Error ? cause.message : t("unableLoadCharts"));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setChartsLoading(false);
        }
      });
    return () => controller.abort();
  }, [dateRange.from, dateRange.to, invalidRange, organization.id, selectedBranchId, t]);

  const revenueRupees = Math.round(summary.revenuePaise / 100);
  const cashRupees = Math.round(summary.cashCollectedPaise / 100);
  const onlineRupees = Math.max(0, revenueRupees - cashRupees);

  const revenuePoints = revenueWindow === "7d" ? reportCharts.revenue7d : reportCharts.revenue30d;
  const revenueSeries = revenuePoints.map((point) => point.value);
  const revenueLabels = revenuePoints.map((point) =>
    revenueWindow === "30d" && point.label === "30d" ? t("thirtyDaysAgo") : point.label,
  );
  const attendance7d = reportCharts.attendance7d.map((point) => point.value);
  const attendanceLabels = reportCharts.attendance7d.map((point) => point.label);
  const memberGrowth = reportCharts.memberGrowth30d.map((point) => point.value);
  const lastMemberGrowthIndex = reportCharts.memberGrowth30d.length - 1;
  const memberLabels = reportCharts.memberGrowth30d.map((point, index) =>
    index === lastMemberGrowthIndex ? t("now") : point.label,
  );

  const actionTips = [
    summary.lowStockProducts > 0
      ? t("lowStockTip", { count: summary.lowStockProducts })
      : t("stockClearTip"),
    summary.notificationQueueCount > 0
      ? t("messagesFollowUpTip", { count: summary.notificationQueueCount })
      : t("notificationClearTip"),
    summary.expiringMemberships > 0
      ? t("renewalTip", { count: summary.expiringMemberships })
      : t("noRenewalTip"),
  ];

  const channelTotal = revenueRupees || 1;
  const cashShare = Math.round((cashRupees / channelTotal) * 100);

  const tabs = [
    { id: "financials" as TabId, label: t("tabFinancials"), icon: IndianRupee },
    { id: "attendance" as TabId, label: t("tabAttendance"), icon: CalendarDays },
    { id: "members" as TabId, label: t("tabMembersGrowth"), icon: Users },
    { id: "snapshot" as TabId, label: t("tabOverviewRecords"), icon: ClipboardList },
  ];
  const exportReports = [
    { fileName: "members.csv", label: t("exportMembers") },
    { fileName: "attendance.csv", label: t("exportAttendance") },
    { fileName: "payments.csv", label: t("exportPayments") },
    { fileName: "revenue.csv", label: t("exportRevenue") },
    { fileName: "manual-cash.csv", label: t("exportCashReconciliation") },
    { fileName: "membership-sales.csv", label: t("exportMembershipSales") },
    { fileName: "expiring-members.csv", label: t("exportExpiry") },
    { fileName: "invoices.csv", label: t("exportInvoices") },
    { fileName: "referrals.csv", label: t("exportReferrals") },
    { fileName: "shop.csv", label: t("exportShopOrders") },
    { fileName: "trainer-client.csv", label: t("exportTrainerClients") },
    { fileName: "ai-usage.csv", label: t("exportAiUsage") },
  ];
  const buildExportHref = (fileName: string) => {
    const params = new URLSearchParams({
      from: dateRange.from,
      to: dateRange.to,
    });
    if (selectedBranchId) {
      params.set("branchId", selectedBranchId);
    }
    return `/api/orgs/${organization.id}/reports/${fileName}?${params.toString()}`;
  };

  return (
    <div className="grid gap-4">
      {/* Hero */}
      <SectionHero
        eyebrow={t("heroEyebrow")}
        title={t("heroTitle")}
        icon={BarChart3}
        tone="sky"
        meta={<span className="text-xs text-[var(--text-secondary)]">{selectedBranchName}</span>}
      />

      {/* Date range & Sub Tabs bar */}
      <div className="grid gap-3 rounded-[22px] border border-[var(--border)] bg-[var(--surface-raised)] p-3 lg:grid-cols-[minmax(18rem,0.8fr)_1.2fr] lg:items-center">
        <div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid flex-1 gap-1 text-xs font-medium text-[var(--text-secondary)]">
              {t("from")}
              <input
                type="date"
                value={dateRange.from}
                max={dateRange.to}
                onChange={(event) =>
                  setDateRange((current) => ({ ...current, from: event.target.value }))
                }
                className="zook-focus min-h-10 rounded-xl border border-[var(--border)] bg-[var(--bg-sunken)] px-3 text-sm text-[var(--text-primary)]"
              />
            </label>
            <label className="grid flex-1 gap-1 text-xs font-medium text-[var(--text-secondary)]">
              {t("to")}
              <input
                type="date"
                value={dateRange.to}
                min={dateRange.from}
                max={today}
                onChange={(event) =>
                  setDateRange((current) => ({ ...current, to: event.target.value }))
                }
                className="zook-focus min-h-10 rounded-xl border border-[var(--border)] bg-[var(--bg-sunken)] px-3 text-sm text-[var(--text-primary)]"
              />
            </label>
          </div>
          {chartsLoading || chartsError ? (
            <p
              className={`mt-3 text-xs ${
                chartsError ? "text-[var(--feedback-danger)]" : "text-[var(--text-secondary)]"
              }`}
            >
              {chartsError ?? t("updatingReportCharts")}
            </p>
          ) : null}
        </div>

        {/* Sub Tabs Pill Selector */}
        <div className="flex justify-start overflow-x-auto no-scrollbar rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] p-1 backdrop-blur-xl">
          <div className="flex gap-1 w-full justify-between">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-300 ${
                    isActive
                      ? "text-[var(--accent-strong)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sunken)]/50"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="active-reports-tab"
                      className="absolute inset-0 rounded-xl bg-[var(--surface-accent-soft)] border border-[var(--border-focus)]/30"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon size={14} className="relative z-10 shrink-0" />
                  <span className="relative z-10 whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <details className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2">
        <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--text-primary)]">
          {t("csvExports")}
          <span className="ml-2 text-xs font-normal text-[var(--text-secondary)]">
            {t("dateRangeBranchApplied")}
          </span>
        </summary>
        <div className="mt-3 flex flex-wrap gap-2">
            {exportReports.map((report) => (
              <CsvExportButton
                key={report.fileName}
                href={buildExportHref(report.fileName)}
                label={report.label}
              />
            ))}
        </div>
      </details>

      {invalidRange && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-danger-soft)] px-4 py-3 text-xs text-[var(--feedback-danger)]">
          {t("endDateAfterStartDate")}
        </div>
      )}

      {/* Tab Content Panels */}
      <div className="relative min-h-[350px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "financials" && (
              <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
                {/* Revenue chart with window toggle */}
                <GlassCard className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        {t("revenueTrend")}
                      </p>
                      <div className="mt-2 flex items-baseline gap-3">
                        <span className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                          {formatInr(summary.revenuePaise)}
                        </span>
                        <DeltaChip
                          delta={
                            revenueWindow === "7d"
                              ? reportCharts.deltas.revenue7d
                              : reportCharts.deltas.revenue30d
                          }
                        />
                        <span className="text-xs text-[var(--text-tertiary)]">
                          {revenueWindow === "7d" ? t("last7Days") : t("last30Days")}
                        </span>
                      </div>
                    </div>
                    <div className="inline-flex rounded-full border border-[var(--border)] bg-[var(--bg-sunken)] p-1 text-xs">
                      {(["7d", "30d"] as const).map((window) => (
                        <button
                          key={window}
                          type="button"
                          onClick={() => setRevenueWindow(window)}
                          className={`zook-focus rounded-full px-3 py-1 font-medium transition ${
                            revenueWindow === window
                              ? "bg-[var(--accent-fill)] text-[var(--text-on-accent)] font-semibold shadow-sm"
                              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          {window === "7d" ? t("sevenDays") : t("thirtyDays")}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 h-56">
                    <LineChart
                      series={revenueSeries}
                      labels={revenueLabels}
                      tone="sky"
                      formatY={(v) => formatInrCompact(v * 100)}
                      formatTooltip={(v, label) =>
                        label ? `${label}: ${formatInrCompact(v * 100)}` : formatInrCompact(v * 100)
                      }
                      ariaLabel={t("revenueAria", { window: revenueWindow === "7d" ? t("last7Days") : t("last30Days") })}
                    />
                  </div>
                </GlassCard>

                {/* Donut chart channels */}
                <GlassCard className="p-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                      {t("paymentChannels")}
                    </p>
                    <h2 className="mt-1 text-base font-semibold text-[var(--text-primary)]">
                      {t("moneyFlowsIn")}
                    </h2>
                  </div>
                  <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
                    <Donut
                      value={cashRupees}
                      total={channelTotal}
                      size={124}
                      thickness={12}
                      tone="violet"
                      centerLabel={
                        <span className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                          {cashShare}%
                        </span>
                      }
                      centerSub={t("cash")}
                    />
                    <div className="grid flex-1 gap-2">
                      <LegendItem
                        tone="violet"
                        label={t("cashDesk")}
                        value={cashRupees > 0 ? formatInrCompact(cashRupees * 100) : "₹0"}
                      />
                      <LegendItem
                        tone="sky"
                        label={t("onlineUpi")}
                        value={onlineRupees > 0 ? formatInrCompact(onlineRupees * 100) : "₹0"}
                      />
                      <LegendItem
                        tone="sky"
                        label={t("total")}
                        value={formatInrCompact(channelTotal * 100)}
                      />
                    </div>
                  </div>
                </GlassCard>
              </div>
            )}

            {activeTab === "attendance" && (
              <div className="grid gap-5 md:grid-cols-[1.4fr_1fr]">
                <GlassCard className="p-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                      {t("dailyCheckInsLast7Days")}
                    </p>
                    <div className="mt-2 flex items-baseline gap-3">
                      <span className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                        {summary.todayAttendance}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)]">{t("today")}</span>
                    </div>
                  </div>
                  <div className="mt-4 h-48">
                    <BarChart
                      series={attendance7d}
                      labels={attendanceLabels}
                      tone="violet"
                      ariaLabel={t("barChartAria")}
                    />
                  </div>
                </GlassCard>

                <GlassCard className="p-4 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">
                      {t("attendanceInsights")}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {t("attendanceInsightsCopy")}
                    </p>
                  </div>
                  <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] p-3">
                    <p className="text-xs font-medium text-[var(--text-tertiary)]">
                      {t("today")}
                    </p>
                    <p className="mt-1 text-xl font-bold text-[var(--accent-strong)]">
                      {t("membersCount", { count: summary.todayAttendance })}
                    </p>
                  </div>
                </GlassCard>
              </div>
            )}

            {activeTab === "members" && (
              <div className="grid gap-5 md:grid-cols-[1.4fr_1fr]">
                <GlassCard className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        {t("memberGrowthLast30Days")}
                      </p>
                      <div className="mt-2 flex items-baseline gap-3">
                        <span className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                          {summary.activeMembers}
                        </span>
                        <span className="text-xs text-[var(--text-secondary)]">{t("activeMembersLower")}</span>
                        <DeltaChip delta={reportCharts.deltas.memberGrowth30d} />
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-sunken)] px-3 py-1 text-xs text-[var(--text-secondary)]">
                      <TrendingUp size={12} />
                      {t("pendingCount", { count: summary.joinRequests })}
                    </span>
                  </div>
                  <div className="mt-4 h-48">
                    <BarChart
                      series={memberGrowth}
                      labels={memberLabels}
                      tone="sky"
                      ariaLabel={t("barChartAria")}
                    />
                  </div>
                </GlassCard>

                <GlassCard className="p-4 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">
                      {t("demandFunnel")}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {t("demandFunnelCopy")}
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <div className="flex justify-between items-center rounded-xl bg-[var(--bg-sunken)] p-3 text-xs">
                      <span className="font-medium text-[var(--text-secondary)]">
                        {t("activeMemberships")}
                      </span>
                      <span className="font-bold text-[var(--text-primary)]">
                        {summary.activeMembers}
                      </span>
                    </div>
                    <div className="flex justify-between items-center rounded-xl bg-[var(--bg-sunken)] p-3 text-xs">
                      <span className="font-medium text-[var(--text-secondary)]">
                        {t("pendingJoinRequests")}
                      </span>
                      <span className="font-bold text-[var(--feedback-warning)]">
                        {summary.joinRequests}
                      </span>
                    </div>
                  </div>
                </GlassCard>
              </div>
            )}

            {activeTab === "snapshot" && (
              <div className="grid gap-5">
                <div className="grid gap-5 lg:grid-cols-2">
                  <GlassCard className="p-5">
                    <SectionHeader title={t("byTheNumbers")} />
                    <ReadoutGrid
                      className="mt-4"
                      columns={2}
                      items={[
                        {
                          label: t("branch"),
                          value: selectedBranchName,
                          meta: t("filterableByBranch"),
                        },
                        {
                          label: t("activeMembers"),
                          value: formatCompactNumber(summary.activeMembers),
                          meta: t("pendingCount", { count: summary.joinRequests }),
                        },
                        {
                          label: t("attendanceToday"),
                          value: formatCompactNumber(summary.todayAttendance),
                          meta: t("qrEntries"),
                        },
                        {
                          label: t("revenueToday"),
                          value: formatInr(summary.revenuePaise),
                          meta: t("cashAmount", { amount: formatInr(summary.cashCollectedPaise) }),
                        },
                        {
                          label: t("assistantDrafts"),
                          value: formatCompactNumber(summary.aiUsageThisMonth),
                          meta: t("thisMonth"),
                        },
                        {
                          label: t("lowStock"),
                          value: formatCompactNumber(summary.lowStockProducts),
                          meta: t("belowThreshold"),
                        },
                        {
                          label: t("trialRunway"),
                          value: formatDaysRemaining(summary.trialDaysRemaining),
                          meta: formatDate(organization.trialEndAt),
                        },
                        {
                          label: t("notificationQueue"),
                          value:
                            summary.notificationQueueCount > 0
                              ? t("pendingCount", { count: summary.notificationQueueCount })
                              : t("clear"),
                          meta: t("scheduledFailed"),
                        },
                      ]}
                    />
                  </GlassCard>

                  <div className="grid gap-5">
                    <GlassCard className="p-5">
                      <SectionHeader eyebrow={t("governance")} title={t("controlStatus")} />
                      <ReadoutGrid
                        className="mt-4"
                        columns={2}
                        items={[
                          {
                            label: t("auditLog"),
                            value: formatCompactNumber(auditLogCount),
                            meta: t("adminChangesSaved"),
                          },
                          {
                            label: t("joinMode"),
                            value: formatEnumLabel(organization.joinMode),
                            meta: t("demandFunnelType"),
                          },
                        ]}
                      />
                    </GlassCard>

                    <GlassCard className="p-5">
                      <div className="flex items-center gap-2">
                        <CircleAlert size={16} className="text-[var(--accent)]" />
                        <h2 className="text-base font-semibold text-[var(--text-primary)]">
                          {t("secondLookTitle")}
                        </h2>
                      </div>
                      <div className="mt-4 grid gap-2">
                        {actionTips.map((note) => (
                          <div
                            key={note}
                            className="flex items-start gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]"
                          >
                            <CircleAlert
                              size={14}
                              className="mt-0.5 shrink-0 text-[var(--feedback-warning)]"
                            />
                            <span>{note}</span>
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
