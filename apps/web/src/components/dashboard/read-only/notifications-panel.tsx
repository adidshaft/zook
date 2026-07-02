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
import { useT } from "@/lib/use-t";

type NotificationsT = ReturnType<typeof useT>;

function localizedNotificationStatusLabel(status: string | null | undefined, t: NotificationsT) {
  if (status === "SENT") return t("statusSent");
  if (status === "SCHEDULED") return t("statusScheduled");
  if (status === "FAILED") return t("statusFailed");
  if (status === "DRAFT") return t("statusDraft");
  if (status === "CANCELLED") return t("statusCancelled");
  return notificationStatusLabel(status);
}

function localizedNotificationTypeLabel(type: string | null | undefined, t: NotificationsT) {
  if (type === "PROMOTIONAL") return t("typeAnnouncement");
  if (type === "OPERATIONAL") return t("typeUpdate");
  if (type === "TRANSACTIONAL") return t("typeTransactional");
  return notificationTypeLabel(type);
}

function localizedNotificationAudienceLabel(audience: string | null | undefined, t: NotificationsT) {
  if (audience === "ALL_MEMBERS" || audience === "all_active_members") return t("audienceAllMembers");
  if (audience === "ACTIVE_MEMBERS") return t("audienceActiveMembers");
  if (audience === "EXPIRING_MEMBERS" || audience === "expiring_soon") return t("audienceExpiringMembers");
  if (audience === "INACTIVE_MEMBERS") return t("audienceInactiveMembers");
  if (audience === "SELECTED_MEMBERS" || audience === "selected_members") return t("audienceSelectedMembers");
  if (audience === "branch_members") return t("audienceBranchMembers");
  if (audience === "membership_plan") return t("audiencePlanMembers");
  if (audience === "single_member") return t("audienceSingleMember");
  if (audience === "assigned_clients") return t("audienceAssignedClients");
  return notificationAudienceLabel(audience);
}

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
  const t = useT("notifications");
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
            body: notification.body ?? t("messageBodyUnavailable"),
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
            eyebrow={t("limitsEyebrow")}
            title={t("deliveryStatus")}
            description={
              <span className="inline-flex items-center gap-2">
                {t("deliveryDescription")}
                <HelpHint label={t("deliveryStatus")} title={t("deliveryStatus")}>
                  {t("deliveryHelp")}
                </HelpHint>
              </span>
            }
            badge={
              <Link
                href="/dashboard/notifications/history?status=attention"
                className="zook-focus rounded-full"
              >
                <Pill tone={summary.notificationQueueCount > 0 ? "amber" : "neutral"}>
                  {t("needAttentionCount", { count: summary.notificationQueueCount })}
                </Pill>
              </Link>
            }
          />
          <ReadoutGrid
            className="mt-5"
            items={[
              {
                label: t("needsAttention"),
                value: formatCompactNumber(summary.notificationQueueCount),
                meta: t("scheduledOrFailedMessages"),
              },
              {
                label: t("recentSends"),
                value: formatCompactNumber(initialNotifications.length),
                meta: t("recentNotificationHistory"),
              },
              {
                label: t("audience"),
                value: summary.activeMembers > 0 ? t("memberTargeting") : t("noActiveAudience"),
                meta: t("memberList"),
              },
              {
                label: t("escalationLoad"),
                value:
                  summary.pendingAttendanceApprovals > 0
                    ? t("pendingCount", { count: summary.pendingAttendanceApprovals })
                    : t("clear"),
                meta: t("usefulForMemberMessages"),
              },
            ]}
            columns={2}
          />
        </GlassCard>
        <GlassCard>
          <SectionHeader
            eyebrow={t("recentMessages")}
            title={t("recentNotifications")}
            action={
              <Link
                href="/dashboard/notifications/history"
                className="zook-focus rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)]"
              >
                {t("openHistory")}
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
                        {localizedNotificationTypeLabel(notification.type, t)}
                        {notification.audience
                          ? ` · ${localizedNotificationAudienceLabel(notification.audience, t)}`
                          : ""}
                        {" · "}
                        {formatDateTime(notification.createdAt)}
                        {" · "}
                        {localizedNotificationStatusLabel(notification.status, t)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState title={t("noNotificationsSent")} />
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
