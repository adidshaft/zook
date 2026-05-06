import Link from "next/link";
import { formatBranchName, joinModeLabel } from "@zook/core";
import { MetricCard, ReadoutGrid, SectionHeader } from "../../dashboard-primitives";
import { GlassCard, Pill, type PillTone } from "../../glass-card";
import { formatDate, formatDaysRemaining, formatEnumLabel } from "@/lib/format";
import type { DashboardCopy, DashboardData } from "./types";

function metricTone(label: string) {
  if (label.includes("Revenue") || label.includes("attendance")) {
    return "lime" as const;
  }
  if (label.includes("Low stock") || label.includes("queue") || label.includes("Trial")) {
    return "amber" as const;
  }
  if (label.includes("Assistant")) {
    return "blue" as const;
  }
  return "neutral" as const;
}

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
  const workflowCards: Array<{
    label: string;
    href: string;
    detail: string;
    tone: PillTone;
  }> = [
    {
      label: copy.dashboard.showEntryQr,
      href: "/dashboard/attendance/approvals",
      detail: `${data.summary.todayAttendance} ${copy.dashboard.scansToday}`,
      tone: "lime",
    },
    {
      label: copy.dashboard.reviewJoins,
      href: "/dashboard/members",
      detail: `${data.summary.joinRequests} ${copy.dashboard.membershipRequests}`,
      tone: data.summary.joinRequests > 0 ? "amber" : "lime",
    },
    {
      label: copy.dashboard.checkStock,
      href: "/dashboard/shop/products",
      detail: `${data.summary.lowStockProducts} ${copy.dashboard.lowStockItems}`,
      tone: data.summary.lowStockProducts > 0 ? "amber" : "blue",
    },
    {
      label: copy.dashboard.reviewActivity,
      href: "/dashboard/audit",
      detail: `${data.auditLogCount} ${copy.dashboard.activityEntries}`,
      tone: data.auditLogCount > 0 ? "blue" : "neutral",
    },
  ];

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            delta={metric.delta}
            tone={metricTone(metric.label)}
          />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <GlassCard>
          <SectionHeader
            eyebrow={copy.dashboard.needsAttention}
            title={copy.dashboard.needsAttention}
            description={copy.dashboard.needsAttentionDescription}
          />
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {workflowCards.map((card) => (
              <Link
                key={card.label}
                href={card.href}
                className="rounded-[22px] border border-white/10 bg-black/20 p-4 transition hover:border-white/20 hover:bg-white/6"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-white">{card.label}</p>
                  <Pill tone={card.tone}>{card.detail}</Pill>
                </div>
              </Link>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <SectionHeader
            eyebrow={copy.dashboard.gymStatus}
            title={copy.dashboard.gymStatus}
            description={copy.dashboard.branchScopeMeta}
          />
          <ReadoutGrid
            className="mt-5"
            items={[
              {
                label: copy.dashboard.location,
                value: `${activeOrg.city}${activeOrg.state ? `, ${activeOrg.state}` : ""}`,
                meta: copy.dashboard.locationMeta,
              },
              {
                label: copy.dashboard.branchScope,
                value: formatBranchName(selectedBranch),
                meta: copy.dashboard.showingBranch,
              },
              {
                label: copy.dashboard.joinMode,
                value: joinModeLabel(activeOrg.joinMode),
                meta: `${data.summary.joinRequests} ${copy.dashboard.inboundRequests}`,
              },
              {
                label: copy.dashboard.attendanceMode,
                value: formatEnumLabel(activeOrg.attendanceMode),
                meta: `${data.summary.todayAttendance} ${copy.dashboard.checkInsToday}`,
              },
              {
                label: copy.dashboard.trialEnd,
                value: formatDate(activeOrg.trialEndAt),
                meta: formatDaysRemaining(data.summary.trialDaysRemaining),
              },
            ]}
            columns={2}
          />
        </GlassCard>
      </div>
    </>
  );
}
