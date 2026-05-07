"use client";

import { useCallback, useEffect, useState } from "react";
import { webApiFetch } from "@/lib/api-client";
import { formatDateTime, formatEnumLabel } from "@/lib/format";
import { GlassCard, Pill } from "../glass-card";
import type { NotificationRecipientRow, NotificationRow } from "./shared";

export function NotificationHistoryPanel({
  orgId,
  initialNotifications,
}: {
  orgId: string;
  initialNotifications: NotificationRow[];
}) {
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

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Delivery history</h2>
            <p className="mt-2 text-sm text-white/50">
              Recent member messages, audience, and delivery state.
            </p>
          </div>
          <Pill tone="blue">{notifications.length} messages</Pill>
        </div>
        {status ? (
          <p className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {status}
          </p>
        ) : null}
        <div className="mt-5 grid gap-3">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => void openRecipients(notification)}
              className={`zook-focus rounded-[22px] border p-4 text-left transition ${
                selectedNotification?.id === notification.id
                  ? "border-lime-300/45 bg-lime-300/8"
                  : "border-white/10 bg-black/20 hover:bg-white/6"
              }`}
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <p className="font-medium text-white">{notification.title}</p>
                  <p className="mt-2 text-sm text-white/55">{notification.body}</p>
                  <p className="mt-2 text-xs text-white/40">
                    {formatEnumLabel(notification.type)} · {formatEnumLabel(notification.audience)}{" "}
                    · {formatDateTime(notification.createdAt)}
                  </p>
                  <p className="mt-2 text-xs text-white/40">
                    {notification.createdByName ? `Sent by ${notification.createdByName} · ` : ""}
                    {notification.recipientStats?.total ?? 0} recipients ·{" "}
                    {notification.recipientStats?.delivered ?? 0} delivered ·{" "}
                    {notification.recipientStats?.read ?? 0} read ({readPercent(notification)}%) ·{" "}
                    {notification.recipientStats?.failed ?? 0} failed
                    {notification.recipientStats?.scheduled
                      ? ` · ${notification.recipientStats.scheduled} scheduled`
                      : ""}
                  </p>
                </div>
                <Pill tone={notification.status === "SENT" ? "lime" : "amber"}>
                  {formatEnumLabel(notification.status)}
                </Pill>
              </div>
            </button>
          ))}
          {!notifications.length ? (
            <p className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/50">
              Messages you send will appear here.
            </p>
          ) : null}
        </div>
      </GlassCard>

      <GlassCard>
        {selectedNotification ? (
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Recipients</h2>
                <p className="mt-2 text-sm text-white/50">{selectedNotification.title}</p>
              </div>
              <Pill tone={undeliveredCount > 0 ? "amber" : "lime"}>
                {undeliveredCount} undelivered
              </Pill>
            </div>
            <button
              type="button"
              onClick={() => void resendUndelivered(selectedNotification)}
              disabled={busy === `resend:${selectedNotification.id}` || undeliveredCount === 0}
              className="zook-focus mt-4 w-full rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
            >
              {busy === `resend:${selectedNotification.id}`
                ? "Sending again..."
                : "Resend undelivered"}
            </button>
            <div className="mt-5 grid max-h-[620px] gap-2 overflow-y-auto pr-1">
              {recipients.map((recipient) => (
                <div
                  key={recipient.id}
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {recipient.user?.name ?? recipient.user?.phone ?? recipient.userId}
                      </p>
                      <p className="mt-1 text-xs text-white/42">
                        {recipient.user?.email || recipient.user?.phone || "Member contact"}
                      </p>
                    </div>
                    <Pill
                      tone={
                        recipient.deliveryStatus === "failed"
                          ? "amber"
                          : recipient.deliveryStatus === "scheduled"
                            ? "blue"
                            : "lime"
                      }
                    >
                      {formatEnumLabel(recipient.deliveryStatus)}
                    </Pill>
                  </div>
                  <p className="mt-2 text-xs text-white/35">
                    {recipient.readAt
                      ? `Read ${formatDateTime(recipient.readAt)}`
                      : recipient.deliveredAt
                        ? `Delivered ${formatDateTime(recipient.deliveredAt)}`
                        : `Added ${formatDateTime(recipient.createdAt)}`}
                  </p>
                </div>
              ))}
              {!recipients.length ? (
                <p className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/50">
                  Open a message to see each recipient.
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <h2 className="text-xl font-semibold">Recipient detail</h2>
            <p className="mt-2 text-sm text-white/50">
              Choose a message to see delivery status for each member.
            </p>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
