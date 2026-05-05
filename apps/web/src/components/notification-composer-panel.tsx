"use client";

import { useCallback, useEffect, useState } from "react";
import { GlassCard, Pill } from "./glass-card";
import { webApiFetch } from "@/lib/api-client";

type NotificationType = "OPERATIONAL" | "PROMOTIONAL" | "PLAN";
type Audience = "all_active_members" | "expiring_soon" | "assigned_clients";

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  type: string;
  status: string;
  audience: string;
  pushEnabled?: boolean;
  createdAt: string;
};

const templates: Array<{
  label: string;
  title: string;
  body: string;
  type: NotificationType;
  audience: Audience;
}> = [
  {
    label: "Renewal nudge",
    title: "Your membership is ending soon",
    body: "Renew at the desk or reply in the app if you want the team to help with your next plan.",
    type: "PLAN",
    audience: "expiring_soon",
  },
  {
    label: "Class update",
    title: "Today's schedule has changed",
    body: "Please check the latest timing before you leave for the gym.",
    type: "OPERATIONAL",
    audience: "all_active_members",
  },
  {
    label: "Trainer follow-up",
    title: "A quick note from your trainer",
    body: "Your trainer has shared an update for this week. Open Zook before your next session.",
    type: "OPERATIONAL",
    audience: "assigned_clients",
  },
];

const audienceOptions: Array<{
  value: Audience;
  label: string;
  detail: string;
}> = [
  {
    value: "all_active_members",
    label: "All active members",
    detail: "Members with active subscriptions in this gym.",
  },
  {
    value: "expiring_soon",
    label: "Expiring soon",
    detail: "Active subscriptions ending in the next week.",
  },
  {
    value: "assigned_clients",
    label: "My assigned clients",
    detail: "Trainer-owned members assigned to the sender.",
  },
];

function formatAudience(value: string) {
  return audienceOptions.find((option) => option.value === value)?.label ?? value.replaceAll("_", " ");
}

export function NotificationComposerPanel({ orgId }: { orgId: string }) {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<NotificationType>("OPERATIONAL");
  const [audience, setAudience] = useState<Audience>("all_active_members");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
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

  function markDirty() {
    setPreviewReady(false);
    if (error) {
      setError("");
    }
  }

  function applyTemplate(template: (typeof templates)[number]) {
    setTitle(template.title);
    setBody(template.body);
    setType(template.type);
    setAudience(template.audience);
    setPreviewReady(false);
    setError("");
  }

  function validateDraft() {
    if (!title.trim() || !body.trim()) {
      setError("Add a title and message before sending.");
      return false;
    }
    setError("");
    return true;
  }

  function previewNotification() {
    if (validateDraft()) {
      setPreviewReady(true);
    }
  }

  async function submitNotification() {
    if (!validateDraft()) {
      return;
    }
    if (!previewReady) {
      setError("Preview the message before sending it.");
      return;
    }
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
          pushEnabled
        }
      });
      await loadNotifications();
      setTitle("");
      setBody("");
      setType("OPERATIONAL");
      setAudience("all_active_members");
      setPushEnabled(false);
      setPreviewReady(false);
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
        <p className="mt-2 text-sm text-white/45">Draft, preview, then send through the existing org notification route.</p>
        <div className="mt-5 grid gap-3">
          <div className="grid gap-2">
            <p className="text-sm text-white/55">Templates</p>
            <div className="flex flex-wrap gap-2">
              {templates.map((template) => (
                <button
                  key={template.label}
                  type="button"
                  onClick={() => applyTemplate(template)}
                  className="zook-focus rounded-full border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/70 transition hover:bg-white/8 hover:text-white"
                >
                  {template.label}
                </button>
              ))}
            </div>
          </div>
          <label className="grid gap-2 text-sm text-white/55">
            Title
            <input
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                markDirty();
              }}
              placeholder="Short title"
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-white/55">
            Body
            <textarea
              value={body}
              onChange={(event) => {
                setBody(event.target.value);
                markDirty();
              }}
              placeholder="Write the member-facing message"
              rows={4}
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-white/55">
              Type
              <select
                value={type}
                onChange={(event) => {
                  setType(event.target.value as NotificationType);
                  markDirty();
                }}
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
              >
                <option value="OPERATIONAL">Operational</option>
                <option value="PROMOTIONAL">Promotional</option>
                <option value="PLAN">Plan</option>
              </select>
            </label>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <p className="text-sm font-medium text-white/65">Audience</p>
              <div className="mt-3 grid gap-2">
                {audienceOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setAudience(option.value);
                      markDirty();
                    }}
                    className={`zook-focus rounded-2xl border px-3 py-3 text-left transition ${
                      audience === option.value
                        ? "border-lime-200/50 bg-lime-200/10"
                        : "border-white/10 bg-black/20 hover:bg-white/8"
                    }`}
                  >
                    <span className="block text-sm font-medium text-white">{option.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-white/45">{option.detail}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/60">
            <span>
              Also attempt push delivery
              <span className="mt-1 block text-xs text-white/35">
                Uses the active push provider when this environment has one configured.
              </span>
            </span>
            <input
              type="checkbox"
              checked={pushEnabled}
              onChange={(event) => {
                setPushEnabled(event.target.checked);
                markDirty();
              }}
              className="h-4 w-4 accent-lime-300"
            />
          </label>
          <div className={`rounded-2xl border p-4 ${previewReady ? "border-lime-200/30 bg-lime-200/8" : "border-white/10 bg-black/20"}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
              {previewReady ? "Ready to send" : "Preview"}
            </p>
            <p className="mt-3 font-medium text-white">{title || "Notification title"}</p>
            <p className="mt-2 text-sm leading-6 text-white/55">
              {body || "Message preview appears here before you send."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Pill tone="blue">{type}</Pill>
              <Pill>{formatAudience(audience)}</Pill>
              <Pill tone={pushEnabled ? "lime" : "neutral"}>{pushEnabled ? "Push requested" : "In-app only"}</Pill>
            </div>
          </div>
          {error ? <p className="text-sm text-red-200">{error}</p> : null}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={previewNotification}
              disabled={saving}
              className="zook-focus rounded-full border border-white/10 px-5 py-3 font-semibold text-white/75 transition hover:bg-white/8 disabled:opacity-60"
            >
              Preview message
            </button>
            <button
              type="button"
              onClick={() => void submitNotification()}
              disabled={saving || !previewReady}
              className="zook-focus rounded-full bg-lime-300 px-5 py-3 font-semibold text-black disabled:opacity-50"
            >
              {saving ? "Sending..." : "Send notification"}
            </button>
          </div>
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
                {notification.type} · {formatAudience(notification.audience)} · {notification.pushEnabled ? "Push requested" : "In-app"} · {new Date(notification.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
