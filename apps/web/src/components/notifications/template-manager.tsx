"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { webApiFetch } from "@/lib/api-client";
import { formatDateTime, formatEnumLabel } from "@/lib/format";
import { ConfirmDialog } from "../dashboard-primitives";
import { GlassCard, Pill } from "../glass-card";
import { ZookButton } from "../zook-button";
import { messageTypes, type NotificationType, type TemplateRow } from "./shared";

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
  const [templateToDelete, setTemplateToDelete] = useState<TemplateRow | null>(null);

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

  async function saveTemplate(event: FormEvent<HTMLFormElement>) {
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
    try {
      setBusy(true);
      setStatus("");
      await webApiFetch(`/api/orgs/${orgId}/notifications/templates/${template.id}`, {
        method: "DELETE",
      });
      setTemplateToDelete(null);
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
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Template name"
            maxLength={80}
            className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
            required
          />
          <select
            value={form.type}
            onChange={(event) =>
              setForm((current) => ({ ...current, type: event.target.value as NotificationType }))
            }
            className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
          >
            {messageTypes.map((option) => (
              <option key={option.value} value={option.value} className="bg-black">
                {option.label}
              </option>
            ))}
          </select>
          <input
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="Member-facing title"
            maxLength={120}
            className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
            required
          />
          <textarea
            value={form.body}
            onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
            placeholder="Message"
            maxLength={1000}
            rows={6}
            className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
            required
          />
          <p className="text-xs text-white/42">{form.body.length}/1000 characters</p>
          <div className="flex flex-wrap gap-2">
            <ZookButton
              type="submit"
              size="sm"
              disabled={busy}
              state={busy ? "loading" : "idle"}
            >
              {busy ? "Saving..." : editingId ? "Update template" : "Save template"}
            </ZookButton>
            {editingId ? (
              <ZookButton
                type="button"
                tone="ghost"
                size="sm"
                onClick={() => {
                  setEditingId("");
                  setForm({ name: "", title: "", body: "", type: "OPERATIONAL" });
                }}
              >
                Cancel
              </ZookButton>
            ) : null}
          </div>
          {status ? <p className="text-sm text-white/58">{status}</p> : null}
        </form>
      </GlassCard>

      <GlassCard>
        <h2 className="text-xl font-semibold">Saved templates</h2>
        <div className="mt-5 grid gap-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="rounded-[22px] border border-white/10 bg-black/20 p-4"
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <p className="font-medium text-white">{template.name}</p>
                  <p className="mt-1 text-sm text-white/65">{template.title}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-white/45">{template.body}</p>
                  <p className="mt-2 text-xs text-white/35">
                    Used {template.usageCount ?? 0} times
                    {template.lastUsedAt
                      ? ` · Last used ${formatDateTime(template.lastUsedAt)}`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Pill>{formatEnumLabel(template.type)}</Pill>
                  <ZookButton
                    type="button"
                    tone="ghost"
                    size="sm"
                    onClick={() => startEdit(template)}
                  >
                    Edit
                  </ZookButton>
                  <ZookButton
                    type="button"
                    tone="danger"
                    size="sm"
                    onClick={() => setTemplateToDelete(template)}
                  >
                    Remove
                  </ZookButton>
                </div>
              </div>
            </div>
          ))}
          {!templates.length ? (
            <p className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/50">
              Saved templates show here.
            </p>
          ) : null}
          {templateToDelete ? (
            <ConfirmDialog
              title={`Remove "${templateToDelete.name}"?`}
              description="This removes the saved template. Sent notifications are not changed."
              confirmLabel="Remove"
              onCancel={() => setTemplateToDelete(null)}
              onConfirm={() => void deleteTemplate(templateToDelete)}
            />
          ) : null}
        </div>
      </GlassCard>
    </div>
  );
}
