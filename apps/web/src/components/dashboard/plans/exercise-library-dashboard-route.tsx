"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Dumbbell, Star } from "lucide-react";
import { DashboardPageShell, SectionHeader } from "@/components/dashboard-primitives/layout";
import { GlassCard, Pill } from "@/components/glass-card";
import { ZookButton } from "@/components/zook-button";
import { webApiFetch } from "@/lib/api-client";

type ExerciseTemplate = {
  id: string;
  scope: "STARTER" | "ORG" | "TRAINER";
  name: string;
  muscleGroup?: string | null;
  equipment?: string | null;
  defaultSets?: number | null;
  defaultReps?: number | null;
  defaultRestSeconds?: number | null;
  tempo?: string | null;
  notes?: string | null;
  featured?: boolean;
  readOnly?: boolean;
};

type TemplateForm = {
  name: string;
  muscleGroup: string;
  equipment: string;
  defaultSets: string;
  defaultReps: string;
  defaultRestSeconds: string;
  tempo: string;
  notes: string;
  featured: boolean;
};

function emptyForm(): TemplateForm {
  return {
    name: "",
    muscleGroup: "",
    equipment: "",
    defaultSets: "3",
    defaultReps: "10",
    defaultRestSeconds: "90",
    tempo: "",
    notes: "",
    featured: false,
  };
}

function formFromTemplate(template: ExerciseTemplate): TemplateForm {
  return {
    name: template.name,
    muscleGroup: template.muscleGroup ?? "",
    equipment: template.equipment ?? "",
    defaultSets: template.defaultSets ? String(template.defaultSets) : "",
    defaultReps: template.defaultReps ? String(template.defaultReps) : "",
    defaultRestSeconds: template.defaultRestSeconds ? String(template.defaultRestSeconds) : "",
    tempo: template.tempo ?? "",
    notes: template.notes ?? "",
    featured: Boolean(template.featured),
  };
}

function templateBody(form: TemplateForm) {
  return {
    scope: "ORG",
    name: form.name.trim(),
    muscleGroup: form.muscleGroup.trim() || null,
    equipment: form.equipment.trim() || null,
    defaultSets: Number.parseInt(form.defaultSets, 10) || null,
    defaultReps: Number.parseInt(form.defaultReps, 10) || null,
    defaultRestSeconds: Number.parseInt(form.defaultRestSeconds, 10) || null,
    tempo: form.tempo.trim() || null,
    notes: form.notes.trim() || null,
    featured: form.featured,
  };
}

export function ExerciseLibraryDashboardRoute({ orgId }: { orgId: string }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<TemplateForm>(() => emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const templatesQuery = useQuery({
    queryKey: ["exercise-templates", orgId],
    queryFn: () => webApiFetch<{ templates: ExerciseTemplate[] }>(`/api/orgs/${orgId}/exercise-templates`),
  });
  const saveTemplate = useMutation({
    mutationFn: (input: { templateId?: string; body: Record<string, unknown> }) =>
      webApiFetch<{ template: ExerciseTemplate }>(
        `/api/orgs/${orgId}/exercise-templates${input.templateId ? `/${input.templateId}` : ""}`,
        {
          method: input.templateId ? "PATCH" : "POST",
          body: input.body,
          feedback: { success: "Exercise template saved." },
        },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["exercise-templates", orgId] });
      setEditingId(null);
      setForm(emptyForm());
    },
  });
  const deleteTemplate = useMutation({
    mutationFn: (templateId: string) =>
      webApiFetch(`/api/orgs/${orgId}/exercise-templates/${templateId}`, {
        method: "DELETE",
        feedback: { success: "Exercise template removed." },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["exercise-templates", orgId] });
    },
  });
  const templates = templatesQuery.data?.templates ?? [];
  const orgTemplates = templates.filter((template) => template.scope === "ORG");
  const starterTemplates = templates.filter((template) => template.scope === "STARTER");

  function startEdit(template: ExerciseTemplate) {
    setEditingId(template.id);
    setForm(formFromTemplate(template));
  }

  function adoptStarter(template: ExerciseTemplate) {
    saveTemplate.mutate({
      body: {
        scope: "ORG",
        starterId: template.id,
        name: template.name,
        featured: template.featured,
      },
    });
  }

  return (
    <DashboardPageShell
      eyebrow="Plans"
      title="Exercise library"
      action={
        <Pill tone="blue">
          <Dumbbell className="h-3.5 w-3.5" />
          {orgTemplates.length} shared
        </Pill>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <GlassCard variant="strong" className="p-5">
          <SectionHeader eyebrow="Shared defaults" title={editingId ? "Edit template" : "New template"} />
          <div className="mt-5 grid gap-3">
            <input className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none" placeholder="Exercise name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            <div className="grid gap-3 md:grid-cols-2">
              <input className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none" placeholder="Muscle group" value={form.muscleGroup} onChange={(event) => setForm((current) => ({ ...current, muscleGroup: event.target.value }))} />
              <input className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none" placeholder="Equipment" value={form.equipment} onChange={(event) => setForm((current) => ({ ...current, equipment: event.target.value }))} />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <input type="number" className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none" placeholder="Sets" value={form.defaultSets} onChange={(event) => setForm((current) => ({ ...current, defaultSets: event.target.value }))} />
              <input type="number" className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none" placeholder="Reps" value={form.defaultReps} onChange={(event) => setForm((current) => ({ ...current, defaultReps: event.target.value }))} />
              <input type="number" className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none" placeholder="Rest seconds" value={form.defaultRestSeconds} onChange={(event) => setForm((current) => ({ ...current, defaultRestSeconds: event.target.value }))} />
            </div>
            <input className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none" placeholder="Tempo" value={form.tempo} onChange={(event) => setForm((current) => ({ ...current, tempo: event.target.value }))} />
            <textarea className="min-h-24 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none" placeholder="Notes or coaching cues" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
            <label className="flex items-center justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-4 py-3 text-sm text-[var(--text-secondary)]">
              Featured house favorite
              <input type="checkbox" checked={form.featured} onChange={(event) => setForm((current) => ({ ...current, featured: event.target.checked }))} />
            </label>
            <div className="flex flex-wrap gap-2">
              <ZookButton type="button" onClick={() => saveTemplate.mutate({ ...(editingId ? { templateId: editingId } : {}), body: templateBody(form) })} disabled={!form.name.trim() || saveTemplate.isPending} state={saveTemplate.isPending ? "loading" : "idle"}>
                Save template
              </ZookButton>
              {editingId ? (
                <ZookButton type="button" tone="ghost" onClick={() => { setEditingId(null); setForm(emptyForm()); }}>
                  Cancel
                </ZookButton>
              ) : null}
            </div>
          </div>
        </GlassCard>
        <div className="grid gap-4">
          <TemplateList title="Shared library" templates={orgTemplates} loading={templatesQuery.isLoading} onEdit={startEdit} onDelete={(template) => deleteTemplate.mutate(template.id)} />
          <TemplateList title="Starters" templates={starterTemplates} loading={templatesQuery.isLoading} onAdopt={adoptStarter} />
        </div>
      </div>
    </DashboardPageShell>
  );
}

function TemplateList({
  title,
  templates,
  loading,
  onEdit,
  onDelete,
  onAdopt,
}: {
  title: string;
  templates: ExerciseTemplate[];
  loading: boolean;
  onEdit?: (template: ExerciseTemplate) => void;
  onDelete?: (template: ExerciseTemplate) => void;
  onAdopt?: (template: ExerciseTemplate) => void;
}) {
  return (
    <GlassCard variant="strong" className="p-5">
      <SectionHeader title={title} />
      <div className="mt-4 grid gap-3">
        {loading ? <p className="text-sm text-[var(--text-secondary)]">Loading templates.</p> : null}
        {!loading && !templates.length ? <p className="text-sm text-[var(--text-secondary)]">No templates yet.</p> : null}
        {templates.map((template) => (
          <div key={template.id} className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{template.name}</p>
                  {template.featured ? <Pill tone="amber"><Star className="h-3.5 w-3.5" /> Featured</Pill> : null}
                </div>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {[template.muscleGroup, template.equipment, template.defaultSets ? `${template.defaultSets} sets` : null, template.defaultReps ? `${template.defaultReps} reps` : null].filter(Boolean).join(" · ") || "Custom exercise"}
                </p>
              </div>
              <Pill tone={template.scope === "STARTER" ? "blue" : "neutral"}>
                <BarChart3 className="h-3.5 w-3.5" />
                {template.scope.toLowerCase()}
              </Pill>
            </div>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              {onAdopt ? <ZookButton type="button" size="sm" tone="ghost" onClick={() => onAdopt(template)}>Add to shared</ZookButton> : null}
              {onEdit ? <ZookButton type="button" size="sm" tone="ghost" onClick={() => onEdit(template)}>Edit</ZookButton> : null}
              {onDelete ? <ZookButton type="button" size="sm" tone="danger" onClick={() => onDelete(template)}>Remove</ZookButton> : null}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
