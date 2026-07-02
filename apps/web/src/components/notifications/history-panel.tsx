"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { webApiFetch } from "@/lib/api-client";
import { formatDateTime, formatEnumLabel } from "@/lib/format";
import { GlassCard } from "../glass-card";
import { ZookButton } from "../zook-button";
import {
  notificationAudienceLabel,
  notificationStatusLabel,
  notificationTypeLabel,
  toneForNotificationStatus,
  type NotificationRecipientRow,
  type NotificationRow,
} from "./shared";

function statusMarkClass(tone: ReturnType<typeof toneForNotificationStatus>) {
  if (tone === "lime") return "bg-[var(--accent-strong)]";
  if (tone === "amber") return "bg-[var(--feedback-warning)]";
  if (tone === "red") return "bg-[var(--feedback-danger)]";
  if (tone === "blue") return "bg-[var(--feedback-info)]";
  return "bg-[var(--text-tertiary)]";
}

function StatusMark({
  label,
  tone,
}: {
  label: string;
  tone: ReturnType<typeof toneForNotificationStatus>;
}) {
  return (
    <span
      aria-label={label}
      title={label}
      className={`inline-flex h-2 w-2 shrink-0 rounded-full ${statusMarkClass(tone)}`}
    />
  );
}

function recipientDeliveryLabel(status: string | null | undefined) {
  if (status === "delivered") return "Delivered";
  if (status === "read") return "Read";
  if (status === "failed") return "Failed";
  if (status === "scheduled") return "Scheduled";
  if (status === "sent") return "Sent";
  return formatEnumLabel(status ?? "pending");
}

function compactDeliverySummary(notification: NotificationRow) {
  const stats = notification.recipientStats;
  if (!stats?.total) return "No recipients";
  const delivered = stats.delivered ?? 0;
  const failed = stats.failed ?? 0;
  const scheduled = stats.scheduled ?? 0;
  if (failed > 0) return `${failed} failed · ${delivered}/${stats.total} delivered`;
  if (scheduled > 0) return `${scheduled} scheduled · ${delivered}/${stats.total} delivered`;
  return `${delivered}/${stats.total} delivered`;
}

export function NotificationHistoryPanel({
  orgId,
  initialNotifications,
}: {
  orgId: string;
  initialNotifications: NotificationRow[];
}) {
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status");
  const [notifications, setNotifications] = useState<NotificationRow[]>(initialNotifications);
  const [selectedNotification, setSelectedNotification] = useState<NotificationRow | null>(null);
  const [recipients, setRecipients] = useState<NotificationRecipientRow[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState("");

  const loadHistory = useCallback(async () => {
    await webApiFetch<{ notifications: NotificationRow[] }>(`/api/orgs/${orgId}/notifications`)
      .then((payload) => setNotifications(payload.notifications))
      .catch((cause) =>
        setStatus(cause instanceof Error ? cause.message : "Unable to load message history."),
      );
  }, [orgId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  async function openRecipients(notification: NotificationRow) {
    try {
      setBusy(`recipients:${notification.id}`);
      setStatus("");
      setSelectedNotification(notification);
      const payload = await webApiFetch<{ recipients: NotificationRecipientRow[] }>(
        `/api/orgs/${orgId}/notifications/${notification.id}/recipients`,
      );
      setRecipients(payload.recipients);
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "Unable to load recipients.");
    } finally {
      setBusy("");
    }
  }

  async function resendUndelivered(notification: NotificationRow) {
    try {
      setBusy(`resend:${notification.id}`);
      setStatus("");
      const payload = await webApiFetch<{ resent: number }>(
        `/api/orgs/${orgId}/notifications/${notification.id}/resend-undelivered`,
        { method: "POST" },
      );
      setStatus(
        payload.resent > 0
          ? `${payload.resent} undelivered messages were sent again.`
          : "Everyone has already received this message.",
      );
      await loadHistory();
      await openRecipients(notification);
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "Unable to resend messages.");
    } finally {
      setBusy("");
    }
  }

  const undeliveredCount = recipients.filter(
    (recipient) =>
      recipient.deliveryStatus === "failed" ||
      (!recipient.deliveredAt && recipient.deliveryStatus !== "scheduled"),
  ).length;
  function readPercent(notification: NotificationRow) {
    const stats = notification.recipientStats;
    if (!stats?.delivered) return 0;
    return Math.round((stats.read / stats.delivered) * 100);
  }
  const visibleNotifications =
    statusFilter === "attention"
      ? notifications.filter((notification) =>
          ["FAILED", "SCHEDULED"].includes(notification.status),
        )
      : statusFilter
        ? notifications.filter((notification) => notification.status === statusFilter)
        : notifications;

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Message history</h2>
            <p className="mt-1 text-sm text-[var(--text-tertiary)]">Recent sends, audience, and delivery state.</p>
          </div>
          <span
            aria-label={`${visibleNotifications.length} messages`}
            title={`${visibleNotifications.length} messages`}
            className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 text-xs font-semibold text-[var(--text-primary)]"
          >
            {visibleNotifications.length}
          </span>
        </div>
        {status ? (
          <p className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {status}
          </p>
        ) : null}
        <div className="mt-4 grid gap-2">
          {visibleNotifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => void openRecipients(notification)}
              className={`zook-focus rounded-2xl border px-3 py-2 text-left transition ${
                selectedNotification?.id === notification.id
                  ? "border-[var(--border-focus)] bg-[var(--surface-accent-soft)]"
                  : "border-[var(--border-subtle)] bg-[var(--bg-sunken)] hover:border-[var(--border)] hover:bg-[var(--surface)]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate font-medium text-[var(--text-primary)]">
                      {notification.title}
                    </p>
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-[var(--text-secondary)]">
                      <StatusMark
                        label={notificationStatusLabel(notification.status)}
                        tone={toneForNotificationStatus(notification.status)}
                      />
                      {notificationStatusLabel(notification.status)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-tertiary)]">
                    <span>{notificationAudienceLabel(notification.audience)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatDateTime(notification.createdAt)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{compactDeliverySummary(notification)}</span>
                    {(notification.recipientStats?.read ?? 0) > 0 ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{readPercent(notification)}% read</span>
                      </>
                    ) : null}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden="true" />
                <span className="sr-only">
                  Open recipients for {notificationTypeLabel(notification.type)}
                  {notification.createdByName ? ` sent by ${notification.createdByName}` : ""}
                </span>
              </div>
            </button>
          ))}
          {!visibleNotifications.length ? (
            <p className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-4 py-3 text-sm text-[var(--text-tertiary)]">
              No messages match.
            </p>
          ) : null}
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        {selectedNotification ? (
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">Recipients</h2>
                <p className="mt-1 line-clamp-1 text-sm text-[var(--text-tertiary)]">{selectedNotification.title}</p>
              </div>
              <span
                aria-label={`${undeliveredCount} undelivered`}
                title={`${undeliveredCount} undelivered`}
                className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full border px-2 text-xs font-semibold ${
                  undeliveredCount > 0
                    ? "border-[color-mix(in_srgb,var(--feedback-warning)_36%,transparent)] bg-[var(--surface-warning-soft)] text-[var(--feedback-warning)]"
                    : "border-[var(--border-subtle)] bg-[var(--bg-sunken)] text-[var(--text-secondary)]"
                }`}
              >
                {undeliveredCount}
              </span>
            </div>
            <ZookButton
              type="button"
              size="sm"
              onClick={() => void resendUndelivered(selectedNotification)}
              disabled={busy === `resend:${selectedNotification.id}` || undeliveredCount === 0}
              state={busy === `resend:${selectedNotification.id}` ? "loading" : "idle"}
              fullWidth
              className="mt-4"
            >
              {busy === `resend:${selectedNotification.id}`
                ? "Sending again..."
                : "Resend undelivered"}
            </ZookButton>
            <div className="mt-4 grid max-h-[620px] gap-1.5 overflow-y-auto pr-1">
              {recipients.map((recipient) => (
                <div
                  key={recipient.id}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {recipient.user?.name ?? recipient.user?.phone ?? recipient.userId}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[var(--text-tertiary)]">
                        {recipient.readAt
                          ? `Read ${formatDateTime(recipient.readAt)}`
                          : recipient.deliveredAt
                            ? `Delivered ${formatDateTime(recipient.deliveredAt)}`
                            : recipient.user?.email || recipient.user?.phone || "Member contact"}
                      </p>
                    </div>
                    <StatusMark
                      label={recipientDeliveryLabel(recipient.deliveryStatus)}
                      tone={
                        recipient.deliveryStatus === "failed"
                          ? "amber"
                          : recipient.deliveryStatus === "scheduled"
                            ? "blue"
                            : "lime"
                      }
                    />
                  </div>
                </div>
              ))}
              {!recipients.length ? (
                <p className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-4 py-3 text-sm text-[var(--text-tertiary)]">
                  Open a message to see each recipient.
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] p-3">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Recipient detail</h2>
            <p className="mt-1 text-sm text-[var(--text-tertiary)]">Select a message to inspect delivery.</p>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
