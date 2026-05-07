"use client";

import Link from "next/link";
import {
  NotificationComposerPanel,
  NotificationHistoryPanel,
  NotificationTemplateManagerPanel,
} from "../../notification-composer-panel";
import { EmptyState, ReadoutGrid, SectionHeader, StatusPill } from "../../dashboard-primitives";
import { GlassCard, Pill } from "../../glass-card";
import { formatCompactNumber, formatDateTime, formatEnumLabel } from "@/lib/format";
import type {
  NotificationSnapshot,
  OrganizationSnapshot,
  OrganizationSummary,
} from "../../dashboard-operational-model";
import type { Permission, Role } from "@zook/core";
import { HelpHint } from "../../ui";

export function NotificationsPanel({
  orgId,
  organization,
  summary,
  initialNotifications,
  roles = [],
  permissions = [],
  view = "compose",
}: {
  orgId: string;
  organization: OrganizationSnapshot;
  summary: OrganizationSummary;
  initialNotifications: NotificationSnapshot[];
  roles?: Role[];
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
        initialNotifications={initialNotifications.map((notification) => ({
          ...notification,
          body: "",
          pushEnabled: true,
          createdAt:
            typeof notification.createdAt === "string"
              ? notification.createdAt
              : new Date(notification.createdAt).toISOString(),
        })) as Parameters<typeof NotificationHistoryPanel>[0]["initialNotifications"]}
      />
    );
  }

  return (
    <div className="grid gap-4">
      <NotificationComposerPanel orgId={orgId} roles={roles} permissions={permissions} />
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <GlassCard>
          <SectionHeader
            eyebrow="Message limits"
            title="Delivery status"
            description={
              <span className="inline-flex items-center gap-2">
                Operational messages should stay crisp, permission-safe, and relevant.
                <HelpHint label="Delivery status" title="Delivery status">
                  Queued messages are throttled by provider limits and auto-retry every five
                  minutes. Open History to resend manually.
                </HelpHint>
              </span>
            }
            badge={
              <Link
                href="/dashboard/notifications/history?status=QUEUED"
                className="zook-focus rounded-full"
              >
              <Pill tone={summary.notificationQueueCount > 0 ? "amber" : "lime"}>
                {summary.notificationQueueCount} queued
              </Pill>
              </Link>
            }
          />
          <ReadoutGrid
            className="mt-5"
            items={[
              {
                label: "Org status",
                value: formatEnumLabel(organization.status),
                meta: "Broadcasts respect active org availability",
              },
              {
                label: "Recent sends",
                value: formatCompactNumber(initialNotifications.length),
                meta: "Current history in this org snapshot",
              },
              {
                label: "Audience",
                value:
                  summary.activeMembers > 0 ? "Live member targeting" : "No active audience yet",
                meta: "Live member list",
              },
              {
                label: "Escalation load",
                value:
                  summary.pendingAttendanceApprovals > 0
                    ? `${summary.pendingAttendanceApprovals} pending`
                    : "Clear",
                meta: "Useful for operational notices",
              },
            ]}
            columns={2}
          />
        </GlassCard>
        <GlassCard>
          <SectionHeader
            eyebrow="Recent Messages"
            title="Current message mix"
            description="A quick read on the most recent notifications coming out of this organization."
            action={
              <Link
                href="/dashboard/notifications/history"
                className="zook-focus rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:bg-white/8"
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
                  href="/dashboard/notifications/history"
                  className="rounded-[22px] border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-white">{notification.title}</p>
                    <StatusPill value={formatEnumLabel(notification.status)} />
                  </div>
                  <p className="mt-2 text-xs text-white/45">
                    {formatEnumLabel(notification.type)}
                    {notification.audience ? ` · ${formatEnumLabel(notification.audience)}` : ""}
                    {" · "}
                    {formatDateTime(notification.createdAt)}
                  </p>
                  <span className="mt-3 inline-flex text-xs font-semibold text-lime-100">
                    Open history →
                  </span>
                </Link>
              ))
            ) : (
              <EmptyState
                title="No notifications in history yet"
                description="You have not sent any messages yet. Compose one to update your members."
              />
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
