"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { NotificationComposerPanel } from "../../notifications/composer-wizard";
import { NotificationHistoryPanel } from "../../notifications/history-panel";
import {
  notificationAudienceLabel,
  notificationStatusLabel,
  notificationTypeLabel,
} from "../../notifications/shared";
import { NotificationTemplateManagerPanel } from "../../notifications/template-manager";
import { EmptyState, ReadoutGrid, SectionHeader } from "../../dashboard-primitives";
import { GlassCard, Pill } from "../../glass-card";
import { formatCompactNumber, formatDateTime } from "@/lib/format";
import type {
  NotificationSnapshot,
  OrganizationSummary,
} from "@/components/dashboard/types";
import type { Permission } from "@zook/core";
import { HelpHint } from "../../ui";

export function NotificationsPanel({
  orgId,
  summary,
  initialNotifications,
  permissions = [],
  view = "compose",
}: {
  orgId: string;
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
                label: "Needs attention",
                value: formatCompactNumber(summary.notificationQueueCount),
                meta: "Scheduled or failed messages",
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
                  className="zook-focus group rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-3 py-2.5 transition hover:border-[var(--border-strong)] hover:bg-[var(--surface)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                          {notification.title}
                        </p>
                        <ChevronRight
                          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-tertiary)] transition group-hover:translate-x-0.5 group-hover:text-[var(--text-secondary)]"
                          aria-hidden="true"
                        />
                      </div>
                      <p className="mt-1 truncate text-xs text-[var(--text-tertiary)]">
                        {notificationTypeLabel(notification.type)}
                        {notification.audience
                          ? ` · ${notificationAudienceLabel(notification.audience)}`
                          : ""}
                        {" · "}
                        {formatDateTime(notification.createdAt)}
                        {" · "}
                        {notificationStatusLabel(notification.status)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState title="No notifications sent" />
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
