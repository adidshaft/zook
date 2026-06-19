"use client";

import { useState } from "react";
import { 
  BarChart3, 
  Calendar, 
  CircleAlert, 
  TrendingUp,
  IndianRupee,
  Users,
  ClipboardList,
  CalendarDays
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ReadoutGrid, SectionHeader } from "../../dashboard-primitives";
import { GlassCard } from "../../glass-card";
import {
  BarChart,
  DeltaChip,
  Donut,
  LegendItem,
  LineChart,
  SectionHero,
} from "../charts";
import {
  formatCompactNumber,
  formatDate,
  formatDaysRemaining,
  formatEnumLabel,
  formatInr,
  formatInrCompact,
} from "@/lib/format";
import type { DashboardCharts, OrganizationSnapshot, OrganizationSummary } from "@/components/dashboard/types";
import { CsvExportButton } from "../operational-shared";

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
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const [dateRange, setDateRange] = useState({ from: sevenDaysAgo, to: today });
  const invalidRange = dateRange.to < dateRange.from;
  const [revenueWindow, setRevenueWindow] = useState<"7d" | "30d">("7d");
  const [activeTab, setActiveTab] = useState<TabId>("financials");

  const revenueRupees = Math.round(summary.revenuePaise / 100);
  const cashRupees = Math.round(summary.cashCollectedPaise / 100);
  const onlineRupees = Math.max(0, revenueRupees - cashRupees);

  const revenuePoints = revenueWindow === "7d" ? charts.revenue7d : charts.revenue30d;
  const revenueSeries = revenuePoints.map((point) => point.value);
  const revenueLabels =
    revenuePoints.map((point) => (revenueWindow === "30d" && point.label === "30d" ? "30d ago" : point.label));
  const attendance7d = charts.attendance7d.map((point) => point.value);
  const attendanceLabels = charts.attendance7d.map((point) => point.label);
  const memberGrowth = charts.memberGrowth30d.map((point) => point.value);
  const memberLabels = charts.memberGrowth30d.map((point) => point.label === "Today" ? "Now" : point.label);

  const actionTips = [
    summary.lowStockProducts > 0
      ? `${summary.lowStockProducts} low-stock items need a shop check.`
      : "Shop stock is clear for the selected range.",
    summary.notificationQueueCount > 0
      ? `${summary.notificationQueueCount} messages need delivery follow-up.`
      : "Notification delivery is clear.",
    summary.expiringMemberships > 0
      ? `${summary.expiringMemberships} memberships are nearing renewal.`
      : "No urgent renewal window is visible.",
  ];

  const channelTotal = revenueRupees || 1;
  const cashShare = Math.round((cashRupees / channelTotal) * 100);

  const tabs = [
    { id: "financials" as TabId, label: "Financials", icon: IndianRupee },
    { id: "attendance" as TabId, label: "Attendance", icon: CalendarDays },
    { id: "members" as TabId, label: "Members & Growth", icon: Users },
    { id: "snapshot" as TabId, label: "Overview & Records", icon: ClipboardList },
  ];
  const exportReports = [
    { fileName: "members.csv", label: "Members" },
    { fileName: "attendance.csv", label: "Attendance" },
    { fileName: "payments.csv", label: "Payments" },
    { fileName: "membership-sales.csv", label: "Membership sales" },
    { fileName: "expiring-members.csv", label: "Expiry" },
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
    <div className="grid gap-5">
      {/* Hero */}
      <SectionHero
        eyebrow="Operational report pack"
        title="Reports & insights"
        description="Memberships, floor activity, and revenue in one place. Drill into any KPI to see the underlying record."
        icon={BarChart3}
        tone="sky"
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-sunken)] px-3 py-1 text-xs text-[var(--text-secondary)]">
              <Calendar size={11} />
              {selectedBranchName}
            </span>
          </div>
        }
      />

      {/* Date range & Sub Tabs bar */}
      <div className="grid gap-4 md:grid-cols-[0.8fr_1.2fr] md:items-end">
        <GlassCard className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid flex-1 gap-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
              From
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
            <label className="grid flex-1 gap-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
              To
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
        </GlassCard>

        {/* Sub Tabs Pill Selector */}
        <div className="flex justify-start overflow-x-auto no-scrollbar rounded-full border border-[var(--border)] bg-[var(--surface)]/90 p-1.5 backdrop-blur-xl">
          <div className="flex gap-1 w-full justify-between">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold tracking-wide transition-all duration-300 ${
                    isActive
                      ? "text-[var(--accent-strong)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sunken)]/50"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="active-reports-tab"
                      className="absolute inset-0 rounded-full bg-[var(--surface-accent-soft)] border border-[var(--border-focus)]/30"
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

      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              CSV exports
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Downloads use the selected date range and selected branch.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {exportReports.map((report) => (
              <CsvExportButton
                key={report.fileName}
                href={buildExportHref(report.fileName)}
                label={report.label}
              />
            ))}
          </div>
        </div>
      </GlassCard>

      {invalidRange && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-danger-soft)] px-4 py-3 text-xs text-[var(--feedback-danger)]">
          End date must be after start date.
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
                <GlassCard className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        Revenue trend
                      </p>
                      <div className="mt-2 flex items-baseline gap-3">
                        <span className="text-3xl font-bold tabular-nums text-[var(--text-primary)]">
                          {formatInr(summary.revenuePaise)}
                        </span>
                        <DeltaChip delta={revenueWindow === "7d" ? charts.deltas.revenue7d : charts.deltas.revenue30d} />
                        <span className="text-xs text-[var(--text-tertiary)]">{revenueWindow === "7d" ? "last 7 days" : "last 30 days"}</span>
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
                          {window === "7d" ? "7 days" : "30 days"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-5 h-64">
                    <LineChart
                      series={revenueSeries}
                      labels={revenueLabels}
                      tone="sky"
                      formatY={(v) => formatInrCompact(v * 100)}
                      formatTooltip={(v, label) => (label ? `${label}: ${formatInrCompact(v * 100)}` : formatInrCompact(v * 100))}
                      ariaLabel={`Revenue across the ${revenueWindow === "7d" ? "last 7 days" : "last 30 days"}`}
                    />
                  </div>
                </GlassCard>

                {/* Donut chart channels */}
                <GlassCard className="p-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                      Payment channels
                    </p>
                    <h2 className="mt-1 text-base font-semibold text-[var(--text-primary)]">How money flows in</h2>
                  </div>
                  <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row">
                    <Donut
                      value={cashRupees}
                      total={channelTotal}
                      size={140}
                      thickness={14}
                      tone="violet"
                      centerLabel={
                        <span className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">{cashShare}%</span>
                      }
                      centerSub="cash"
                    />
                    <div className="grid flex-1 gap-2">
                      <LegendItem
                        tone="violet"
                        label="Cash / desk"
                        value={cashRupees > 0 ? formatInrCompact(cashRupees * 100) : "₹0"}
                      />
                      <LegendItem
                        tone="sky"
                        label="Online / UPI"
                        value={onlineRupees > 0 ? formatInrCompact(onlineRupees * 100) : "₹0"}
                      />
                      <LegendItem
                        tone="sky"
                        label="Total"
                        value={formatInrCompact(channelTotal * 100)}
                      />
                    </div>
                  </div>
                </GlassCard>
              </div>
            )}

            {activeTab === "attendance" && (
              <div className="grid gap-5 md:grid-cols-[1.4fr_1fr]">
                <GlassCard className="p-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                      Daily check-ins · last 7 days
                    </p>
                    <div className="mt-2 flex items-baseline gap-3">
                      <span className="text-3xl font-bold tabular-nums text-[var(--text-primary)]">
                        {summary.todayAttendance}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)]">today</span>
                    </div>
                  </div>
                  <div className="mt-4 h-56">
                    <BarChart
                      series={attendance7d}
                      labels={attendanceLabels}
                      tone="violet"
                    />
                  </div>
                </GlassCard>

                <GlassCard className="p-5 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">Attendance Insights</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      QR entry points at reception are processing checks smoothly. Active check-ins peak during late evening and early morning hours.
                    </p>
                  </div>
                  <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Today's Total</p>
                    <p className="mt-1 text-2xl font-bold text-[var(--accent-strong)]">{summary.todayAttendance} Members</p>
                  </div>
                </GlassCard>
              </div>
            )}

            {activeTab === "members" && (
              <div className="grid gap-5 md:grid-cols-[1.4fr_1fr]">
                <GlassCard className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        Member growth · last 30 days
                      </p>
                      <div className="mt-2 flex items-baseline gap-3">
                        <span className="text-3xl font-bold tabular-nums text-[var(--text-primary)]">
                          {summary.activeMembers}
                        </span>
                        <span className="text-xs text-[var(--text-secondary)]">active members</span>
                        <DeltaChip delta={charts.deltas.memberGrowth30d} />
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-sunken)] px-3 py-1 text-xs text-[var(--text-secondary)]">
                      <TrendingUp size={12} />
                      {summary.joinRequests} pending
                    </span>
                  </div>
                  <div className="mt-4 h-52">
                    <BarChart series={memberGrowth} labels={memberLabels} tone="sky" />
                  </div>
                </GlassCard>

                <GlassCard className="p-5 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">Demand Funnel</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      Public registration links are generating active join requests. Review pending inquiries under the member tab.
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <div className="flex justify-between items-center rounded-xl bg-[var(--bg-sunken)] p-3 text-xs">
                      <span className="font-medium text-[var(--text-secondary)]">Active memberships</span>
                      <span className="font-bold text-[var(--text-primary)]">{summary.activeMembers}</span>
                    </div>
                    <div className="flex justify-between items-center rounded-xl bg-[var(--bg-sunken)] p-3 text-xs">
                      <span className="font-medium text-[var(--text-secondary)]">Pending join requests</span>
                      <span className="font-bold text-[var(--feedback-warning)]">{summary.joinRequests}</span>
                    </div>
                  </div>
                </GlassCard>
              </div>
            )}

            {activeTab === "snapshot" && (
              <div className="grid gap-5">
                <div className="grid gap-5 lg:grid-cols-2">
                  <GlassCard className="p-5">
                    <SectionHeader
                      title="By the numbers"
                      description="Memberships, floor activity, and trial runway."
                    />
                    <ReadoutGrid
                      className="mt-4"
                      columns={2}
                      items={[
                        {
                          label: "Branch",
                          value: selectedBranchName,
                          meta: "Filterable by branch",
                        },
                        {
                          label: "Active members",
                          value: formatCompactNumber(summary.activeMembers),
                          meta: `${summary.joinRequests} pending`,
                        },
                        {
                          label: "Attendance today",
                          value: formatCompactNumber(summary.todayAttendance),
                          meta: "QR entries",
                        },
                        {
                          label: "Revenue today",
                          value: formatInr(summary.revenuePaise),
                          meta: `${formatInr(summary.cashCollectedPaise)} cash`,
                        },
                        {
                          label: "Assistant drafts",
                          value: formatCompactNumber(summary.aiUsageThisMonth),
                          meta: "This month",
                        },
                        {
                          label: "Low stock",
                          value: formatCompactNumber(summary.lowStockProducts),
                          meta: "Below threshold",
                        },
                        {
                          label: "Trial runway",
                          value: formatDaysRemaining(summary.trialDaysRemaining),
                          meta: formatDate(organization.trialEndAt),
                        },
                        {
                          label: "Notification queue",
                          value:
                            summary.notificationQueueCount > 0
                              ? `${summary.notificationQueueCount} pending`
                              : "Clear",
                          meta: "Scheduled / failed",
                        },
                      ]}
                    />
                  </GlassCard>

                  <div className="grid gap-5">
                    <GlassCard className="p-5">
                      <SectionHeader
                        eyebrow="Governance"
                        title="Control status"
                        description="Admin changes, pending messages, and unresolved checks."
                      />
                      <ReadoutGrid
                        className="mt-4"
                        columns={2}
                        items={[
                          {
                            label: "Audit log",
                            value: formatCompactNumber(auditLogCount),
                            meta: "Admin changes saved",
                          },
                          {
                            label: "Join mode",
                            value: formatEnumLabel(organization.joinMode),
                            meta: "Demand funnel type",
                          },
                        ]}
                      />
                    </GlassCard>

                    <GlassCard className="p-5">
                      <div className="flex items-center gap-2">
                        <CircleAlert size={16} className="text-[var(--accent)]" />
                        <h2 className="text-base font-semibold text-[var(--text-primary)]">What deserves a second look</h2>
                      </div>
                      <div className="mt-4 grid gap-2">
                        {actionTips.map((note) => (
                          <div
                            key={note}
                            className="flex items-start gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]"
                          >
                            <CircleAlert size={14} className="mt-0.5 shrink-0 text-[var(--feedback-warning)]" />
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
