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
  const checkInQrHref = selectedBranch?.id
    ? `/dashboard/attendance/qr-display?branchId=${encodeURIComponent(selectedBranch.id)}`
    : "/dashboard/attendance/qr-display";
  const workflowCards: Array<{
    label: string;
    href: string;
    detail: string;
    tone: PillTone;
  }> = [
    {
      label: copy.dashboard.showEntryQr,
      href: checkInQrHref,
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
      href: "/dashboard/shop",
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
  const helpCards = [
    {
      label: "Open the entry QR",
      href: checkInQrHref,
      detail: "Use this at reception or on a phone placed near the entry desk.",
    },
    {
      label: "Approve join requests",
      href: "/dashboard/members",
      detail: "Review new members, plans, and expiring memberships from one place.",
    },
    {
      label: "Run payments and refunds",
      href: "/dashboard/payments",
      detail: "Record payments, review receipts, and open the refund tracker.",
    },
    {
      label: "Manage shop pickup",
      href: "/dashboard/shop",
      detail: "Add products, track low stock, and hand over ready pickup orders.",
    },
    {
      label: "Invite your team",
      href: "/dashboard/staff",
      detail: "Add Admin, Reception, and Trainer users with the right access.",
    },
    {
      label: "Polish public profile",
      href: "/dashboard/public-profile",
      detail: "Update photos, public links, QR, timings, and contact details.",
    },
  ];
  const recentNotifications = data.notifications.slice(0, 4);

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
            title={copy.dashboard.todayStart}
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

      <GlassCard>
        <SectionHeader
          eyebrow="Notification center"
          title="Notifications"
          description="Recent sends, scheduled updates, and messages that need a follow-up."
          action={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/notifications"
                className="zook-focus rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:bg-white/8"
              >
                Compose
              </Link>
              <Link
                href="/dashboard/notifications/history"
                className="zook-focus rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-black"
              >
                Open history
              </Link>
            </div>
          }
        />
        <div className="mt-5 grid gap-3 md:grid-cols-[0.85fr_1.15fr]">
          <ReadoutGrid
            items={[
              {
                label: "Needs follow-up",
                value: String(data.summary.notificationQueueCount),
                meta: "Messages waiting for action",
              },
              {
                label: "Recent sends",
                value: String(data.notifications.length),
                meta: "Latest messages in this gym",
              },
            ]}
            columns={1}
          />
          <div className="grid gap-2">
            {recentNotifications.length ? (
              recentNotifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={
                    notification.status === "FAILED" || notification.status === "SCHEDULED"
                      ? "/dashboard/notifications/history?status=attention"
                      : `/dashboard/notifications/history?status=${encodeURIComponent(notification.status)}`
                  }
                  className="flex flex-col gap-2 rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 transition hover:border-lime-300/30 hover:bg-lime-300/6 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{notification.title}</p>
                    <p className="mt-1 text-xs text-white/42">
                      {formatEnumLabel(notification.type)}
                      {notification.audience
                        ? ` · ${formatEnumLabel(notification.audience)}`
                        : ""}
                      {" · "}
                      {formatDate(notification.createdAt)}
                    </p>
                  </div>
                  <Pill
                    tone={
                      notification.status === "SENT"
                        ? "lime"
                        : notification.status === "FAILED"
                          ? "amber"
                          : "blue"
                    }
                  >
                    {formatEnumLabel(notification.status)}
                  </Pill>
                </Link>
              ))
            ) : (
              <p className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/50">
                No messages sent yet. Compose the first member update when you are ready.
              </p>
            )}
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <SectionHeader
          eyebrow="Help book"
          title="Common tasks"
          description="Quick paths for the work owners, admins, reception, and trainers do most often."
        />
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {helpCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="rounded-[22px] border border-white/10 bg-black/20 p-4 transition hover:border-lime-300/30 hover:bg-lime-300/6"
            >
              <p className="font-medium text-white">{card.label}</p>
              <p className="mt-2 text-sm leading-6 text-white/50">{card.detail}</p>
            </Link>
          ))}
        </div>
      </GlassCard>
    </>
  );
}
