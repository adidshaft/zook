"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GlassCard, Pill } from "./glass-card";
import { webApiFetch } from "@/lib/api-client";
import { formatDateTime, formatEnumLabel } from "@/lib/format";

type NotificationType =
  | "TRANSACTIONAL"
  | "OPERATIONAL"
  | "PROMOTIONAL"
  | "ENGAGEMENT"
  | "PLAN"
  | "SECURITY";
type Audience =
  | "all_active_members"
  | "branch_members"
  | "expiring_soon"
  | "membership_plan"
  | "selected_members"
  | "single_member"
  | "assigned_clients";

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  status: string;
  audience: string;
  pushEnabled?: boolean;
  createdAt: string;
};

type TemplateRow = {
  id: string;
  name: string;
  title: string;
  body: string;
  type: NotificationType;
  active?: boolean;
};

type MemberRow = {
  userId: string;
  profile?: { name?: string | null; phone?: string | null } | null;
};

type BranchRow = { id: string; name: string };
type PlanRow = { id: string; name: string; active?: boolean };
type Preview = {
  resolvedRecipients: number;
  willDeliver: number;
  blockedByOptOut: number;
  blockedByMinor: number;
};

const messageTypes: Array<{ value: NotificationType; label: string; detail: string }> = [
  { value: "OPERATIONAL", label: "Operational update", detail: "Timings, closures, desk notices" },
  { value: "PROMOTIONAL", label: "Announcement", detail: "Sales, events, plan launches" },
  { value: "ENGAGEMENT", label: "Member engagement", detail: "Community updates and reminders" },
  { value: "PLAN", label: "Plan or workout", detail: "Trainer or membership-plan updates" },
  { value: "TRANSACTIONAL", label: "Direct message", detail: "One member, specific context" },
  { value: "SECURITY", label: "Security alert", detail: "Account or safety notice" },
];

function audienceOptions(type: NotificationType): Array<{ value: Audience; label: string }> {
  if (type === "TRANSACTIONAL" || type === "SECURITY") {
    return [{ value: "single_member", label: "One member" }];
  }
  if (type === "PLAN") {
    return [
      { value: "assigned_clients", label: "Assigned clients" },
      { value: "membership_plan", label: "Members on a plan" },
      { value: "expiring_soon", label: "Expiring soon" },
    ];
  }
  return [
    { value: "all_active_members", label: "All active members" },
    { value: "branch_members", label: "One branch" },
    { value: "membership_plan", label: "Members on a plan" },
    { value: "expiring_soon", label: "Expiring soon" },
    ...(type === "PROMOTIONAL" ? [] : [{ value: "selected_members" as const, label: "Selected members" }]),
  ];
}

function memberLabel(member: MemberRow) {
  return member.profile?.name ?? member.profile?.phone ?? member.userId;
}

export function NotificationComposerPanel({ orgId }: { orgId: string }) {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<NotificationType>("OPERATIONAL");
  const [audience, setAudience] = useState<Audience>("all_active_members");
  const [branchId, setBranchId] = useState("");
  const [planId, setPlanId] = useState("");
  const [singleUserId, setSingleUserId] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [daysAhead, setDaysAhead] = useState("7");
  const [pushEnabled, setPushEnabled] = useState(true);
  const [scheduleAt, setScheduleAt] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadResources = useCallback(async () => {
    try {
      const [notificationPayload, templatePayload, memberPayload, branchPayload, planPayload] =
        await Promise.all([
          webApiFetch<{ notifications: NotificationRow[] }>(`/api/orgs/${orgId}/notifications`),
          webApiFetch<{ templates: TemplateRow[] }>(`/api/orgs/${orgId}/notifications/templates`),
          webApiFetch<{ members: MemberRow[] }>(`/api/orgs/${orgId}/members?limit=100`),
          webApiFetch<{ branches: BranchRow[] }>(`/api/orgs/${orgId}/branches`),
          webApiFetch<{ plans: PlanRow[] }>(`/api/orgs/${orgId}/membership-plans`),
        ]);
      setNotifications(notificationPayload.notifications);
      setTemplates(templatePayload.templates);
      setMembers(memberPayload.members);
      setBranches(branchPayload.branches);
      setPlans(planPayload.plans.filter((plan) => plan.active !== false));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load message tools.");
    }
  }, [orgId]);

  useEffect(() => {
    void loadResources();
  }, [loadResources]);

  const availableAudiences = useMemo(() => audienceOptions(type), [type]);

  useEffect(() => {
    if (!availableAudiences.some((option) => option.value === audience)) {
      setAudience(availableAudiences[0]?.value ?? "all_active_members");
      setPreview(null);
    }
  }, [audience, availableAudiences]);

  function payload() {
    return {
      title,
      body,
      type,
      audience,
      pushEnabled,
      branchId: branchId || undefined,
      planId: planId || undefined,
      singleUserId: singleUserId || undefined,
      selectedUserIds,
      daysAhead: Number(daysAhead) || 7,
      scheduleAt: scheduleAt ? new Date(scheduleAt).toISOString() : undefined,
    };
  }

  function applyTemplate(template: TemplateRow) {
    setTitle(template.title);
    setBody(template.body);
    setType(template.type);
    setPreview(null);
    setStep(3);
  }

  function validateDraft() {
    if (!title.trim() || !body.trim()) {
      setError("Add a title and message before sending.");
      return false;
    }
    if (audience === "branch_members" && !branchId) {
      setError("Choose a branch.");
      return false;
    }
    if (audience === "membership_plan" && !planId) {
      setError("Choose a plan.");
      return false;
    }
    if (audience === "single_member" && !singleUserId) {
      setError("Choose one member.");
      return false;
    }
    if (audience === "selected_members" && selectedUserIds.length === 0) {
      setError("Choose at least one member.");
      return false;
    }
    setError("");
    return true;
  }

  async function loadPreview() {
    if (!validateDraft()) {
      return;
    }
    try {
      setSaving(true);
      setPreview(await webApiFetch<Preview>(`/api/orgs/${orgId}/notifications/preview`, {
        method: "POST",
        body: payload(),
      }));
      setStep(4);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to preview recipients.");
    } finally {
      setSaving(false);
    }
  }

  async function submitNotification() {
    if (!preview && !validateDraft()) {
      return;
    }
    try {
      setSaving(true);
      setError("");
      await webApiFetch(`/api/orgs/${orgId}/notifications`, { method: "POST", body: payload() });
      await loadResources();
      setTitle("");
      setBody("");
      setType("OPERATIONAL");
      setAudience("all_active_members");
      setPreview(null);
      setStep(1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to send notification.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Send a message</h2>
            <p className="mt-2 text-sm text-white/50">Choose the purpose, audience, message, then review delivery.</p>
          </div>
          <Pill tone="blue">Step {step} of 4</Pill>
        </div>
        <div className="mt-5 grid gap-4">
          {step === 1 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {messageTypes.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setType(option.value);
                    setPreview(null);
                  }}
                  className={`zook-focus rounded-[22px] border p-4 text-left transition ${
                    type === option.value
                      ? "border-lime-300 bg-lime-300/12"
                      : "border-white/10 bg-black/20 hover:bg-white/6"
                  }`}
                >
                  <p className="font-medium text-white">{option.label}</p>
                  <p className="mt-1 text-sm text-white/45">{option.detail}</p>
                </button>
              ))}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                {availableAudiences.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setAudience(option.value);
                      setPreview(null);
                    }}
                    className={`zook-focus rounded-[22px] border px-4 py-3 text-left text-sm transition ${
                      audience === option.value
                        ? "border-lime-300 bg-lime-300/12 text-white"
                        : "border-white/10 bg-black/20 text-white/65 hover:bg-white/6"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {audience === "branch_members" ? (
                <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none">
                  <option value="" className="bg-black">Choose branch</option>
                  {branches.map((branch) => <option key={branch.id} value={branch.id} className="bg-black">{branch.name}</option>)}
                </select>
              ) : null}
              {audience === "membership_plan" ? (
                <select value={planId} onChange={(event) => setPlanId(event.target.value)} className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none">
                  <option value="" className="bg-black">Choose plan</option>
                  {plans.map((plan) => <option key={plan.id} value={plan.id} className="bg-black">{plan.name}</option>)}
                </select>
              ) : null}
              {audience === "single_member" ? (
                <select value={singleUserId} onChange={(event) => setSingleUserId(event.target.value)} className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none">
                  <option value="" className="bg-black">Choose member</option>
                  {members.map((member) => <option key={member.userId} value={member.userId} className="bg-black">{memberLabel(member)}</option>)}
                </select>
              ) : null}
              {audience === "selected_members" ? (
                <select multiple value={selectedUserIds} onChange={(event) => setSelectedUserIds(Array.from(event.target.selectedOptions).map((option) => option.value))} className="zook-focus min-h-40 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none">
                  {members.map((member) => <option key={member.userId} value={member.userId}>{memberLabel(member)}</option>)}
                </select>
              ) : null}
              {audience === "expiring_soon" ? (
                <label className="grid gap-2 text-sm text-white/55">
                  Days ahead
                  <select value={daysAhead} onChange={(event) => setDaysAhead(event.target.value)} className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none">
                    <option value="7" className="bg-black">7 days</option>
                    <option value="15" className="bg-black">15 days</option>
                    <option value="30" className="bg-black">30 days</option>
                  </select>
                </label>
              ) : null}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-3">
              <div className="flex flex-wrap gap-2">
                {templates.map((template) => (
                  <button key={template.id} type="button" onClick={() => applyTemplate(template)} className="zook-focus rounded-full border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/70 transition hover:bg-white/8">
                    {template.name}
                  </button>
                ))}
              </div>
              <input value={title} onChange={(event) => { setTitle(event.target.value); setPreview(null); }} placeholder="Title" maxLength={120} className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none" />
              <textarea value={body} onChange={(event) => { setBody(event.target.value); setPreview(null); }} placeholder="Message" maxLength={1000} rows={5} className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none" />
              <p className="text-xs text-white/42">{body.length}/1000 characters</p>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70">
                  <input type="checkbox" checked={pushEnabled} onChange={(event) => setPushEnabled(event.target.checked)} />
                  Send push notification
                </label>
                <input type="datetime-local" value={scheduleAt} onChange={(event) => setScheduleAt(event.target.value)} className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="grid gap-3">
              <div className="rounded-[22px] border border-white/10 bg-black/25 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-white/35">Phone preview</p>
                <p className="mt-3 font-semibold text-white">{title || "Title"}</p>
                <p className="mt-2 text-sm text-white/65">{body || "Message"}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <Pill tone="blue">{preview?.resolvedRecipients ?? 0} matched</Pill>
                <Pill tone="lime">{preview?.willDeliver ?? 0} will receive</Pill>
                <Pill tone="amber">{preview?.blockedByOptOut ?? 0} opted out</Pill>
                <Pill tone="neutral">{preview?.blockedByMinor ?? 0} minors skipped</Pill>
              </div>
            </div>
          ) : null}

          {error ? <p className="rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}
          <div className="flex flex-wrap justify-between gap-3">
            <button type="button" onClick={() => setStep(Math.max(1, step - 1))} className="zook-focus rounded-full border border-white/10 px-4 py-2 text-sm text-white/70">
              Back
            </button>
            <div className="flex flex-wrap gap-2">
              {step < 3 ? (
                <button type="button" onClick={() => setStep(step + 1)} className="zook-focus rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-black">
                  Continue
                </button>
              ) : null}
              {step === 3 ? (
                <button type="button" onClick={() => void loadPreview()} disabled={saving} className="zook-focus rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">
                  Preview recipients
                </button>
              ) : null}
              {step === 4 ? (
                <button type="button" onClick={() => {
                  if (window.confirm(`Send this message to ${preview?.willDeliver ?? 0} members?`)) {
                    void submitNotification();
                  }
                }} disabled={saving || !preview?.willDeliver} className="zook-focus rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">
                  Send to {preview?.willDeliver ?? 0} members
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <h2 className="text-xl font-semibold">Delivery history</h2>
        <div className="mt-5 grid gap-3">
          {notifications.length ? (
            notifications.slice(0, 8).map((notification) => (
              <div key={notification.id} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-white">{notification.title}</p>
                  <Pill tone={notification.status === "SENT" ? "lime" : "amber"}>{formatEnumLabel(notification.status)}</Pill>
                </div>
                <p className="mt-2 text-sm text-white/55">{notification.body}</p>
                <p className="mt-2 text-xs text-white/40">
                  {formatEnumLabel(notification.type)} · {formatEnumLabel(notification.audience)} · {formatDateTime(notification.createdAt)}
                </p>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/50">
              Messages you send will appear here.
            </p>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

export function NotificationTemplateManagerPanel({ orgId }: { orgId: string }) {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [form, setForm] = useState({
    name: "",
    title: "",
    body: "",
    type: "OPERATIONAL" as NotificationType,
  });
  const [editingId, setEditingId] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const loadTemplates = useCallback(async () => {
    const payload = await webApiFetch<{ templates: TemplateRow[] }>(
      `/api/orgs/${orgId}/notifications/templates`,
    );
    setTemplates(payload.templates);
  }, [orgId]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  function startEdit(template: TemplateRow) {
    setEditingId(template.id);
    setForm({
      name: template.name,
      title: template.title,
      body: template.body,
      type: template.type,
    });
    setStatus("");
  }

  async function saveTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setBusy(true);
      setStatus("");
      await webApiFetch(
        editingId
          ? `/api/orgs/${orgId}/notifications/templates/${editingId}`
          : `/api/orgs/${orgId}/notifications/templates`,
        {
          method: editingId ? "PATCH" : "POST",
          body: form,
        },
      );
      setForm({ name: "", title: "", body: "", type: "OPERATIONAL" });
      setEditingId("");
      await loadTemplates();
      setStatus(editingId ? "Template updated." : "Template saved.");
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "Unable to save template.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteTemplate(template: TemplateRow) {
    if (!window.confirm(`Remove "${template.name}" from saved templates?`)) {
      return;
    }
    try {
      setBusy(true);
      setStatus("");
      await webApiFetch(`/api/orgs/${orgId}/notifications/templates/${template.id}`, {
        method: "DELETE",
      });
      await loadTemplates();
      setStatus("Template removed.");
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "Unable to remove template.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <GlassCard>
        <h2 className="text-xl font-semibold">{editingId ? "Edit template" : "Create template"}</h2>
        <form className="mt-5 grid gap-3" onSubmit={(event) => void saveTemplate(event)}>
          <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Template name" maxLength={80} className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none" required />
          <select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as NotificationType }))} className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none">
            {messageTypes.map((option) => <option key={option.value} value={option.value} className="bg-black">{option.label}</option>)}
          </select>
          <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Title members will see" maxLength={120} className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none" required />
          <textarea value={form.body} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} placeholder="Message" maxLength={1000} rows={6} className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none" required />
          <p className="text-xs text-white/42">{form.body.length}/1000 characters</p>
          <div className="flex flex-wrap gap-2">
            <button disabled={busy} className="zook-focus rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">
              {busy ? "Saving..." : editingId ? "Update template" : "Save template"}
            </button>
            {editingId ? (
              <button type="button" onClick={() => { setEditingId(""); setForm({ name: "", title: "", body: "", type: "OPERATIONAL" }); }} className="zook-focus rounded-full border border-white/10 px-4 py-2 text-sm text-white/70">
                Cancel
              </button>
            ) : null}
          </div>
          {status ? <p className="text-sm text-white/58">{status}</p> : null}
        </form>
      </GlassCard>

      <GlassCard>
        <h2 className="text-xl font-semibold">Saved templates</h2>
        <div className="mt-5 grid gap-3">
          {templates.map((template) => (
            <div key={template.id} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <p className="font-medium text-white">{template.name}</p>
                  <p className="mt-1 text-sm text-white/65">{template.title}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-white/45">{template.body}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Pill tone="blue">{formatEnumLabel(template.type)}</Pill>
                  <button type="button" onClick={() => startEdit(template)} className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs text-white/70">Edit</button>
                  <button type="button" onClick={() => void deleteTemplate(template)} className="zook-focus rounded-full border border-red-300/20 px-3 py-1 text-xs text-red-100/80">Remove</button>
                </div>
              </div>
            </div>
          ))}
          {!templates.length ? (
            <p className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/50">
              Saved templates will appear here.
            </p>
          ) : null}
        </div>
      </GlassCard>
    </div>
  );
}

export function NotificationHistoryPanel({
  orgId,
  initialNotifications,
}: {
  orgId: string;
  initialNotifications: NotificationRow[];
}) {
  const [notifications, setNotifications] = useState<NotificationRow[]>(initialNotifications);
  const [status, setStatus] = useState("");

  useEffect(() => {
    webApiFetch<{ notifications: NotificationRow[] }>(`/api/orgs/${orgId}/notifications`)
      .then((payload) => setNotifications(payload.notifications))
      .catch((cause) =>
        setStatus(cause instanceof Error ? cause.message : "Unable to load message history."),
      );
  }, [orgId]);

  return (
    <GlassCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Delivery history</h2>
          <p className="mt-2 text-sm text-white/50">Recent member messages, audience, and delivery state.</p>
        </div>
        <Pill tone="blue">{notifications.length} messages</Pill>
      </div>
      {status ? <p className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">{status}</p> : null}
      <div className="mt-5 grid gap-3">
        {notifications.map((notification) => (
          <div key={notification.id} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <p className="font-medium text-white">{notification.title}</p>
                <p className="mt-2 text-sm text-white/55">{notification.body}</p>
                <p className="mt-2 text-xs text-white/40">
                  {formatEnumLabel(notification.type)} · {formatEnumLabel(notification.audience)} · {formatDateTime(notification.createdAt)}
                </p>
              </div>
              <Pill tone={notification.status === "SENT" ? "lime" : "amber"}>{formatEnumLabel(notification.status)}</Pill>
            </div>
          </div>
        ))}
        {!notifications.length ? (
          <p className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/50">
            Messages you send will appear here.
          </p>
        ) : null}
      </div>
    </GlassCard>
  );
}
