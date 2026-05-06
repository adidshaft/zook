"use client";

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
  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <GlassCard>
        <SectionHeader
          eyebrow="Daily summary"
          title="Operational report pack"
          description="Memberships, floor activity, and revenue in one report."
        />
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
            {[
              "Cross-check expiring memberships with the membership ladder before the evening rush.",
              "If flagged attendance exceptions spike, send an operational notification before it becomes member-visible.",
              "Review activity history and assistant drafts when sensitive trainer or member actions happen.",
            ].map((note) => (
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
