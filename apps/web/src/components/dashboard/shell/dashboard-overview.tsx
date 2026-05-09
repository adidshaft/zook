import Link from "next/link";
import { formatBranchName, joinModeLabel } from "@zook/core";
import {
  AvatarInitials,
  MetricCard,
  MiniTrend,
  ReadoutGrid,
  SectionHeader,
  StatusDot,
} from "../../dashboard-primitives";
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
  const headlineMetrics = data.metrics.slice(0, 5);
  const needsAttention = [
    {
      label: "Pending join requests",
      value: data.summary.joinRequests,
      href: "/dashboard/members",
      tone: data.summary.joinRequests > 0 ? "amber" : "lime",
      detail: "Review plan handoffs and approvals.",
    },
    {
      label: "Low stock",
      value: data.summary.lowStockProducts,
      href: "/dashboard/shop",
      tone: data.summary.lowStockProducts > 0 ? "amber" : "lime",
      detail: "Protein, gear, and pickup inventory.",
    },
    {
      label: "Expiring memberships",
      value: data.summary.expiringMemberships,
      href: "/dashboard/members",
      tone: data.summary.expiringMemberships > 0 ? "amber" : "blue",
      detail: "Next 7 days.",
    },
    {
      label: "Pending attendance",
      value: data.summary.pendingAttendanceApprovals,
      href: "/dashboard/attendance",
      tone: data.summary.pendingAttendanceApprovals > 0 ? "amber" : "lime",
      detail: "Desk approvals and flagged scans.",
    },
  ] satisfies Array<{
    label: string;
    value: number;
    href: string;
    tone: PillTone;
    detail: string;
  }>;

  return (
    <>
      <GlassCard variant="strong" className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-lime-300/10 blur-3xl" />
        <div className="relative grid gap-6 xl:grid-cols-[1fr_360px]">
          <div>
            <Pill tone="lime">
              <StatusDot tone="lime" pulse />
              Live command board
            </Pill>
            <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-white md:text-5xl">
              Today’s Command Board
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">
              Real-time overview for {activeOrg.name}. Keep attendance, payments, staff actions,
              and member pressure visible without leaving the control room.
            </p>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-black/25 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/35">
                  Revenue snapshot
                </p>
                <p className="metric mt-2 text-3xl font-semibold text-white">
                  ₹{(data.summary.revenuePaise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
              </div>
              <Pill tone={data.connected ? "lime" : "amber"}>
                {data.connected ? "Live" : "Demo"}
              </Pill>
            </div>
            <div className="mt-4">
              <MiniTrend values={[12, 18, 16, 24, 22, 31, 28]} />
            </div>
            <p className="mt-2 text-xs leading-5 text-white/45">
              Uses confirmed payment totals only. No projected revenue is shown.
            </p>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {headlineMetrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            delta={metric.delta}
            tone={metricTone(metric.label)}
          />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <GlassCard>
          <SectionHeader
            eyebrow="Live operations"
            title="Needs Attention"
            description="Only real queues and counters are surfaced here; empty work stays quiet."
          />
          <div className="mt-5 grid gap-3">
            {needsAttention.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-between gap-4 rounded-[22px] border border-white/10 bg-black/20 p-4 transition hover:border-lime-300/30 hover:bg-lime-300/6"
              >
                <div className="min-w-0">
                  <p className="font-medium text-white">{item.label}</p>
                  <p className="mt-1 text-sm text-white/45">{item.detail}</p>
                </div>
                <Pill tone={item.tone}>{item.value}</Pill>
              </Link>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <SectionHeader
            eyebrow="Entry desk"
            title="Live Attendance Feed"
            description="Recent scan context appears in the attendance console; this panel shows today’s safe totals."
          />
          <div className="mt-5 grid gap-3">
            {[
              {
                name: "Aarav Mehta",
                status: "Checked in",
                meta: `${data.summary.todayAttendance} scans today`,
                tone: "lime" as const,
              },
              {
                name: "Coach Rhea",
                status: "Desk ready",
                meta: formatBranchName(selectedBranch),
                tone: "blue" as const,
              },
              {
                name: "Reception queue",
                status: "Needs review",
                meta: `${data.summary.pendingAttendanceApprovals} pending`,
                tone: "amber" as const,
              },
            ].map((item) => (
              <div key={item.name} className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-black/20 p-3">
                <AvatarInitials name={item.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{item.name}</p>
                  <p className="mt-1 truncate text-xs text-white/45">{item.meta}</p>
                </div>
                <Pill tone={item.tone}>{item.status}</Pill>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <GlassCard>
          <SectionHeader
            eyebrow="Gym status"
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

        <GlassCard>
          <SectionHeader
            eyebrow="AI usage"
            title="Trainer-controlled AI"
            description="AI assists trainers. Trainers stay in control, and assignment still requires approval."
          />
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">Drafts</p>
              <p className="metric mt-3 text-3xl font-semibold text-white">{data.summary.aiUsageThisMonth}</p>
              <p className="mt-2 text-xs text-white/45">This month</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4 md:col-span-2">
              <Pill tone="blue">Professional safety gates on</Pill>
              <p className="mt-3 text-sm leading-6 text-white/56">
                Keep AI drafts in review, edit before assigning, and preserve trainer approval for
                every member plan.
              </p>
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <SectionHeader
          eyebrow="Recent staff actions"
          title="Notifications and activity"
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
