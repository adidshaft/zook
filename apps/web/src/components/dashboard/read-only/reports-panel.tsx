"use client";

import { useState } from "react";
import { ReadoutGrid, SectionHeader } from "../../dashboard-primitives";
import { GlassCard } from "../../glass-card";
import {
  formatCompactNumber,
  formatDate,
  formatDaysRemaining,
  formatEnumLabel,
  formatInr,
} from "@/lib/format";
import type { OrganizationSnapshot, OrganizationSummary } from "../../dashboard-operational-model";

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
  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <GlassCard>
        <SectionHeader
          eyebrow="Daily summary"
          title="Operational report pack"
          description="Memberships, floor activity, and revenue in one report."
        />
        <div className="mt-4 grid gap-3 rounded-[18px] border border-white/10 bg-black/20 p-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
            From
            <input
              type="date"
              value={dateRange.from}
              onChange={(event) =>
                setDateRange((current) => ({ ...current, from: event.target.value }))
              }
              className="zook-focus min-h-11 rounded-full border border-white/10 bg-black/35 px-3 text-sm text-white"
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
            To
            <input
              type="date"
              value={dateRange.to}
              onChange={(event) =>
                setDateRange((current) => ({ ...current, to: event.target.value }))
              }
              className="zook-focus min-h-11 rounded-full border border-white/10 bg-black/35 px-3 text-sm text-white"
            />
          </label>
        </div>
        <p className={invalidRange ? "mt-2 text-sm text-red-200" : "mt-2 text-xs text-white/45"}>
          {invalidRange
            ? "End date must be after start date."
            : `Times in Asia/Kolkata. Range: ${dateRange.from} → ${dateRange.to}.`}
        </p>
        <ReadoutGrid
          className="mt-5"
          columns={2}
          items={[
            {
              label: "Branch scope",
              value: selectedBranchName,
              meta: "Attendance and memberships can be filtered by branch",
            },
            {
              label: "Active members",
              value: formatCompactNumber(summary.activeMembers),
              meta: `${summary.joinRequests} join requests pending`,
            },
            {
              label: "Attendance today",
              value: formatCompactNumber(summary.todayAttendance),
              meta: "QR check-ins with entry codes",
            },
            {
              label: "Revenue today",
              value: formatInr(summary.revenuePaise),
              meta: `${formatInr(summary.cashCollectedPaise)} manual or offline`,
            },
            {
              label: "Assistant drafts",
              value: formatCompactNumber(summary.aiUsageThisMonth),
              meta: "This month",
            },
            {
              label: "Low stock",
              value: formatCompactNumber(summary.lowStockProducts),
              meta: "Products below threshold",
            },
            {
              label: "Trial runway",
              value: formatDaysRemaining(summary.trialDaysRemaining),
              meta: formatDate(organization.trialEndAt),
            },
          ]}
        />
      </GlassCard>

      <div className="grid gap-4">
        <GlassCard>
          <SectionHeader
            eyebrow="Governance"
            title="Control status"
            description="Review admin changes, pending messages, and unresolved checks."
          />
          <ReadoutGrid
            className="mt-5"
            columns={1}
            items={[
              {
                label: "Audit log",
                value: formatCompactNumber(auditLogCount),
                meta: "Admin changes saved in Zook",
              },
              {
                label: "Notification queue",
                value:
                  summary.notificationQueueCount > 0
                    ? `${summary.notificationQueueCount} needs attention`
                    : "Clear",
                meta: "Scheduled or failed messages",
              },
              {
                label: "Join mode",
                value: formatEnumLabel(organization.joinMode),
                meta: "Shapes how inbound demand converts",
              },
            ]}
          />
        </GlassCard>

        <GlassCard>
          <SectionHeader
            eyebrow="Operator Notes"
            title="What deserves a second look"
            description="Quick prompts for keeping daily work tidy."
          />
          <div className="mt-5 grid gap-3">
            {actionTips.map((note) => (
              <div
                key={note}
                className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white/58"
              >
                {note}
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
