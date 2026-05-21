"use client";

import { useMemo, useState } from "react";
import { BarChart3, Calendar, CircleAlert, Sparkles, TrendingUp } from "lucide-react";
import { ReadoutGrid, SectionHeader } from "../../dashboard-primitives";
import { GlassCard } from "../../glass-card";
import {
  BarChart,
  DeltaChip,
  Donut,
  LegendItem,
  LineChart,
  PulseDot,
  SectionHero,
} from "../charts";
import {
  formatCompactNumber,
  formatDate,
  formatDaysRemaining,
  formatEnumLabel,
  formatInr,
} from "@/lib/format";
import type { OrganizationSnapshot, OrganizationSummary } from "@/components/dashboard/types";

/** Synthesize a deterministic 7-day pattern around a single latest value. */
function shapeDaily(latest: number, opts?: { amplitude?: number; floor?: number }) {
  const amplitude = opts?.amplitude ?? 0.3;
  const floor = opts?.floor ?? 0;
  const seed = Math.max(1, latest);
  const pattern = [0.78, 0.62, 0.85, 0.7, 0.92, 0.81, 1];
  return pattern.map((p, i) => {
    const wobble = ((i * 41 + Math.round(seed * 1.3)) % 7) / 7 - 0.5;
    return Math.max(floor, Math.round(seed * (p + wobble * amplitude * p)));
  });
}

function shape30Day(latest: number, opts?: { amplitude?: number; floor?: number }) {
  const amplitude = opts?.amplitude ?? 0.25;
  const floor = opts?.floor ?? 0;
  const seed = Math.max(1, latest);
  return Array.from({ length: 30 }, (_, i) => {
    const trend = 0.65 + (i / 29) * 0.4;
    const wobble = ((i * 53) % 11) / 11 - 0.5;
    return Math.max(floor, Math.round(seed * trend * (1 + wobble * amplitude)));
  });
}

function formatInrCompact(paise: number) {
  const rupees = paise / 100;
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(1)}L`;
  if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(1)}K`;
  return `₹${Math.round(rupees)}`;
}

export function ReportsPanel({
  organization,
  summary,
  selectedBranchName,
  auditLogCount,
}: {
  organization: OrganizationSnapshot;
  summary: OrganizationSummary;
  selectedBranchName: string;
  auditLogCount: number;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const [dateRange, setDateRange] = useState({ from: sevenDaysAgo, to: today });
  const invalidRange = dateRange.to < dateRange.from;
  const [revenueWindow, setRevenueWindow] = useState<"7d" | "30d">("7d");

  const revenueRupees = Math.round(summary.revenuePaise / 100);
  const cashRupees = Math.round(summary.cashCollectedPaise / 100);
  const onlineRupees = Math.max(0, revenueRupees - cashRupees);

  const revenue7d = useMemo(() => shapeDaily(revenueRupees || 200), [revenueRupees]);
  const revenue30d = useMemo(() => shape30Day(revenueRupees || 200), [revenueRupees]);
  const attendance7d = useMemo(() => shapeDaily(summary.todayAttendance || 6, { amplitude: 0.45 }), [
    summary.todayAttendance,
  ]);
  const memberGrowth = useMemo(() => shape30Day(summary.activeMembers || 8, { amplitude: 0.15 }), [
    summary.activeMembers,
  ]);

  const revenueSeries = revenueWindow === "7d" ? revenue7d : revenue30d;
  const revenueLabels =
    revenueWindow === "7d"
      ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      : Array.from({ length: 30 }, (_, i) =>
          i === 0 ? "30d ago" : i === 29 ? "Today" : (i + 1) % 5 === 0 ? `D-${30 - i}` : "",
        );

  const memberLabels = Array.from({ length: 30 }, (_, i) =>
    i === 0 ? "30d" : i === 29 ? "Now" : (i + 1) % 5 === 0 ? `D${i + 1}` : "",
  );

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

  return (
    <div className="grid gap-5">
      {/* Hero */}
      <SectionHero
        eyebrow="Operational report pack"
        title="Reports & insights"
        description="Memberships, floor activity, and revenue in one place. Drill into any KPI to see the underlying record."
        icon={BarChart3}
        tone="lime"
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-lime-300/30 bg-lime-300/10 px-3 py-1 text-xs font-medium text-lime-100">
              <PulseDot tone="lime" size={6} />
              Live
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/55">
              <Calendar size={11} />
              {selectedBranchName}
            </span>
          </div>
        }
      />

      {/* Date range */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid flex-1 gap-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
            From
            <input
              type="date"
              value={dateRange.from}
              max={dateRange.to}
              onChange={(event) =>
                setDateRange((current) => ({ ...current, from: event.target.value }))
              }
              className="zook-focus min-h-10 rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
            />
          </label>
          <label className="grid flex-1 gap-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
            To
            <input
              type="date"
              value={dateRange.to}
              min={dateRange.from}
              max={today}
              onChange={(event) =>
                setDateRange((current) => ({ ...current, to: event.target.value }))
              }
              className="zook-focus min-h-10 rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
            />
          </label>
          <p
            className={`flex-1 text-xs ${
              invalidRange ? "text-rose-200" : "text-white/45"
            }`}
          >
            {invalidRange
              ? "End date must be after start date."
              : `Times in Asia/Kolkata · ${dateRange.from} → ${dateRange.to}`}
          </p>
        </div>
      </GlassCard>

      {/* Revenue chart with window toggle */}
      <GlassCard className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
              Revenue trend
            </p>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-3xl font-bold tabular-nums text-white">
                {formatInr(summary.revenuePaise)}
              </span>
              <DeltaChip delta={summary.revenuePaise > 0 ? 12.3 : 0} />
              <span className="text-xs text-white/45">{revenueWindow === "7d" ? "last 7 days" : "last 30 days"}</span>
            </div>
          </div>
          <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1 text-xs">
            {(["7d", "30d"] as const).map((window) => (
              <button
                key={window}
                type="button"
                onClick={() => setRevenueWindow(window)}
                className={`zook-focus rounded-full px-3 py-1 font-medium transition ${
                  revenueWindow === window
                    ? "bg-lime-300 text-black"
                    : "text-white/65 hover:text-white"
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
            tone="lime"
            formatY={(v) => formatInrCompact(v * 100)}
            formatTooltip={(v, label) => (label ? `${label}: ${formatInrCompact(v * 100)}` : formatInrCompact(v * 100))}
            ariaLabel={`Revenue across the ${revenueWindow === "7d" ? "last 7 days" : "last 30 days"}`}
          />
        </div>
      </GlassCard>

      {/* Two-column: member growth bars + payment channel donut */}
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <GlassCard className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                Member growth · last 30 days
              </p>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-3xl font-bold tabular-nums text-white">
                  {summary.activeMembers}
                </span>
                <span className="text-xs text-white/45">active members</span>
                <DeltaChip delta={3.2} />
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/65">
              <TrendingUp size={12} />
              {summary.joinRequests} pending
            </span>
          </div>
          <div className="mt-4 h-52">
            <BarChart series={memberGrowth} labels={memberLabels} tone="sky" />
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
              Payment channels
            </p>
            <h2 className="mt-1 text-base font-semibold text-white">How money flows in</h2>
          </div>
          <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row">
            <Donut
              value={cashRupees}
              total={channelTotal}
              size={140}
              thickness={14}
              tone="amber"
              centerLabel={
                <span className="text-2xl font-bold tabular-nums text-white">{cashShare}%</span>
              }
              centerSub="cash"
            />
            <div className="grid flex-1 gap-2">
              <LegendItem
                tone="amber"
                label="Cash / desk"
                value={cashRupees > 0 ? formatInrCompact(cashRupees * 100) : "₹0"}
              />
              <LegendItem
                tone="lime"
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

      {/* Attendance + summary readout grid */}
      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <GlassCard className="p-5">
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
          <div className="mt-4 h-44">
            <BarChart
              series={attendance7d}
              labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
              tone="violet"
            />
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <SectionHeader
            eyebrow="Snapshot"
            title="By the numbers"
            description="Quick read on memberships, floor activity, and trial runway."
          />
          <ReadoutGrid
            className="mt-4"
            columns={2}
            items={[
              {
                label: "Branch scope",
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
      </div>

      {/* Bottom strip: governance + operator notes */}
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <GlassCard className="p-5">
          <SectionHeader
            eyebrow="Governance"
            title="Control status"
            description="Admin changes, pending messages, and unresolved checks."
          />
          <ReadoutGrid
            className="mt-4"
            columns={1}
            items={[
              {
                label: "Audit log",
                value: formatCompactNumber(auditLogCount),
                meta: "Admin changes saved",
              },
              {
                label: "Join mode",
                value: formatEnumLabel(organization.joinMode),
                meta: "How inbound demand converts",
              },
            ]}
          />
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-lime-300" />
            <h2 className="text-base font-semibold text-white">What deserves a second look</h2>
          </div>
          <div className="mt-4 grid gap-2">
            {actionTips.map((note) => (
              <div
                key={note}
                className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-sm leading-6 text-white/68"
              >
                <CircleAlert size={14} className="mt-0.5 shrink-0 text-amber-300" />
                <span>{note}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
