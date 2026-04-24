"use client";

import { useCallback, useEffect, useState } from "react";
import { GlassCard, Pill } from "./glass-card";
import { webApiFetch } from "@/lib/api-client";

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  type: string;
  status: string;
  audience: string;
  createdAt: string;
};

export function NotificationComposerPanel({ orgId }: { orgId: string }) {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [title, setTitle] = useState("Operational update");
  const [body, setBody] = useState("Gym floor maintenance starts at 7 PM today.");
  const [type, setType] = useState<"OPERATIONAL" | "PROMOTIONAL" | "PLAN">("OPERATIONAL");
  const [audience, setAudience] = useState<
    "all_active_members" | "expiring_soon" | "assigned_clients" | "selected_members"
  >("all_active_members");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const payload = await webApiFetch<{ notifications: NotificationRow[] }>(`/api/orgs/${orgId}/notifications`);
      setNotifications(payload.notifications);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load notifications.");
    }
  }, [orgId]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  async function submitNotification() {
    try {
      setSaving(true);
      setError("");
      await webApiFetch(`/api/orgs/${orgId}/notifications`, {
        method: "POST",
        body: {
          title,
          body,
          type,
          audience,
          pushEnabled: false,
          selectedUserIds: []
        }
      });
      await loadNotifications();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to send notification.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <GlassCard>
        <h2 className="text-xl font-semibold">Compose</h2>
        <p className="mt-2 text-sm text-white/45">Send a persisted in-app notification through the real org route.</p>
        <div className="mt-5 grid gap-3">
          <label className="grid gap-2 text-sm text-white/55">
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-white/55">
            Body
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={4}
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-white/55">
              Type
              <select
                value={type}
                onChange={(event) => setType(event.target.value as typeof type)}
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
              >
                <option value="OPERATIONAL">Operational</option>
                <option value="PROMOTIONAL">Promotional</option>
                <option value="PLAN">Plan</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm text-white/55">
              Audience
              <select
                value={audience}
                onChange={(event) => setAudience(event.target.value as typeof audience)}
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
              >
                <option value="all_active_members">All active members</option>
                <option value="expiring_soon">Expiring soon</option>
                <option value="assigned_clients">Assigned clients</option>
                <option value="selected_members">Selected members</option>
              </select>
            </label>
          </div>
          {error ? <p className="text-sm text-red-200">{error}</p> : null}
          <button
            onClick={() => void submitNotification()}
            disabled={saving}
            className="zook-focus rounded-full bg-lime-300 px-5 py-3 font-semibold text-black disabled:opacity-60"
          >
            {saving ? "Sending..." : "Send notification"}
          </button>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Delivery history</h2>
          <Pill tone="lime">{notifications.length} items</Pill>
        </div>
        <div className="mt-5 grid gap-3">
          {!notifications.length ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/45">
              No notifications sent yet.
            </div>
          ) : null}
          {notifications.map((notification) => (
            <div key={notification.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{notification.title}</p>
                <Pill>{notification.status}</Pill>
              </div>
              <p className="mt-2 text-sm text-white/55">{notification.body}</p>
              <p className="mt-3 text-xs text-white/40">
                {notification.type} · {notification.audience} · {new Date(notification.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
