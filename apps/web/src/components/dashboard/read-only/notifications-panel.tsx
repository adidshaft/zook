"use client";

import Link from "next/link";
import { NotificationComposerPanel } from "../../notifications/composer-wizard";
import { NotificationHistoryPanel } from "../../notifications/history-panel";
import { NotificationTemplateManagerPanel } from "../../notifications/template-manager";
import { EmptyState, ReadoutGrid, SectionHeader, StatusPill } from "../../dashboard-primitives";
import { GlassCard, Pill } from "../../glass-card";
import { formatCompactNumber, formatDateTime, formatEnumLabel } from "@/lib/format";
import type {
  NotificationSnapshot,
  OrganizationSnapshot,
  OrganizationSummary,
} from "@/components/dashboard/types";
import type { Permission } from "@zook/core";
import { HelpHint } from "../../ui";

export function NotificationsPanel({
  orgId,
  organization,
  summary,
  initialNotifications,
  permissions = [],
  view = "compose",
}: {
  orgId: string;
  organization: OrganizationSnapshot;
  summary: OrganizationSummary;
  initialNotifications: NotificationSnapshot[];
  permissions?: Permission[];
  view?: "compose" | "templates" | "history";
}) {
  if (view === "templates") {
    return <NotificationTemplateManagerPanel orgId={orgId} />;
  }

  if (view === "history") {
    return (
      <NotificationHistoryPanel
        orgId={orgId}
        initialNotifications={
          initialNotifications.map((notification) => ({
            ...notification,
            body: notification.body ?? "Message body unavailable.",
            pushEnabled: Boolean(notification.pushEnabled),
            createdAt:
              typeof notification.createdAt === "string"
                ? notification.createdAt
                : new Date(notification.createdAt).toISOString(),
          })) as Parameters<typeof NotificationHistoryPanel>[0]["initialNotifications"]
        }
      />
    );
  }

  return (
    <div className="grid gap-4">
      <NotificationComposerPanel orgId={orgId} permissions={permissions} />
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <GlassCard>
          <SectionHeader
            eyebrow="Notification limits"
            title="Delivery status"
            description={
              <span className="inline-flex items-center gap-2">
                Operational messages should stay crisp, permission-safe, and relevant.
                <HelpHint label="Delivery status" title="Delivery status">
                  Some messages may wait because of daily limits. Open History to resend manually.
                </HelpHint>
              </span>
            }
            badge={
              <Link
                href="/dashboard/notifications/history?status=attention"
                className="zook-focus rounded-full"
              >
                <Pill tone={summary.notificationQueueCount > 0 ? "amber" : "neutral"}>
                  {summary.notificationQueueCount} need attention
                </Pill>
              </Link>
            }
          />
          <ReadoutGrid
            className="mt-5"
            items={[
              {
                label: "Gym status",
                value: formatEnumLabel(organization.status),
                meta: "Messages follow gym availability",
              },
              {
                label: "Recent sends",
                value: formatCompactNumber(initialNotifications.length),
                meta: "Recent notification history",
              },
              {
                label: "Audience",
                value: summary.activeMembers > 0 ? "Member targeting" : "No active audience",
                meta: "Member list",
              },
              {
                label: "Escalation load",
                value:
                  summary.pendingAttendanceApprovals > 0
                    ? `${summary.pendingAttendanceApprovals} pending`
                    : "Clear",
                meta: "Useful for member messages",
              },
            ]}
            columns={2}
          />
        </GlassCard>
        <GlassCard>
          <SectionHeader
            eyebrow="Recent Messages"
            title="Recent notifications"
            action={
              <Link
                href="/dashboard/notifications/history"
                className="zook-focus rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)]"
              >
                Open history →
              </Link>
            }
          />
          <div className="mt-5 grid gap-3">
            {initialNotifications.length ? (
              initialNotifications.slice(0, 4).map((notification) => (
                <Link
                  key={notification.id}
                  href={
                    notification.status === "FAILED" || notification.status === "SCHEDULED"
                      ? "/dashboard/notifications/history?status=attention"
                      : `/dashboard/notifications/history?status=${encodeURIComponent(notification.status)}`
                  }
                  className="rounded-[22px] border border-[var(--border)] bg-[var(--bg-sunken)] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-[var(--text-primary)]">{notification.title}</p>
                    <StatusPill value={formatEnumLabel(notification.status)} />
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                    {formatEnumLabel(notification.type)}
                    {notification.audience ? ` · ${formatEnumLabel(notification.audience)}` : ""}
                    {" · "}
                    {formatDateTime(notification.createdAt)}
                  </p>
                  <span className="mt-3 inline-flex text-xs font-semibold text-[var(--accent-strong)]">
                    Open history →
                  </span>
                </Link>
              ))
            ) : (
              <EmptyState
                title="No notifications sent"
                description="Compose the first update to reach members."
              />
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
