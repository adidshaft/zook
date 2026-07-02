type DemoExerciseTemplate = {
  id: string;
  orgId?: string | null;
  scope: "STARTER" | "ORG" | "TRAINER";
  createdByUserId?: string | null;
  name: string;
  muscleGroup?: string | null;
  equipment?: string | null;
  defaultSets?: number | null;
  defaultReps?: number | null;
  defaultRestSeconds?: number | null;
  tempo?: string | null;
  notes?: string | null;
  featured?: boolean;
  active?: boolean;
  readOnly?: boolean;
};

const demoExerciseStarters: DemoExerciseTemplate[] = [
  { id: "starter-bench-press", scope: "STARTER", name: "Bench Press", muscleGroup: "Chest", equipment: "Barbell", defaultSets: 4, defaultReps: 8, defaultRestSeconds: 120, featured: true, active: true, readOnly: true },
  { id: "starter-back-squat", scope: "STARTER", name: "Back Squat", muscleGroup: "Legs", equipment: "Barbell", defaultSets: 4, defaultReps: 6, defaultRestSeconds: 150, featured: true, active: true, readOnly: true },
  { id: "starter-deadlift", scope: "STARTER", name: "Deadlift", muscleGroup: "Posterior chain", equipment: "Barbell", defaultSets: 3, defaultReps: 5, defaultRestSeconds: 180, featured: true, active: true, readOnly: true },
  { id: "starter-pull-up", scope: "STARTER", name: "Pull-up", muscleGroup: "Back", equipment: "Pull-up bar", defaultSets: 3, defaultReps: 8, defaultRestSeconds: 120, featured: true, active: true, readOnly: true },
  { id: "starter-plank", scope: "STARTER", name: "Plank", muscleGroup: "Core", equipment: "Bodyweight", defaultSets: 3, defaultReps: 1, defaultRestSeconds: 60, tempo: "hold", featured: true, active: true, readOnly: true },
];

const demoExerciseTemplates: DemoExerciseTemplate[] = [
  { id: "exercise-org-leg-press", orgId: "org-demo", scope: "ORG", name: "Leg Press", muscleGroup: "Legs", equipment: "Machine", defaultSets: 4, defaultReps: 12, defaultRestSeconds: 90, featured: true, active: true },
];

function demoBody(init: { body?: unknown }) {
  return init.body && typeof init.body === "object" ? (init.body as Record<string, unknown>) : {};
}

function demoExerciseTemplatePayload(body: Record<string, unknown>, existing?: DemoExerciseTemplate) {
  const starter = demoExerciseStarters.find((template) => template.id === body.starterId);
  return {
    ...existing,
    id: existing?.id ?? `exercise-template-${Date.now()}`,
    orgId: "org-demo",
    scope: (body.scope === "ORG" || body.scope === "TRAINER" ? body.scope : existing?.scope ?? "TRAINER") as "ORG" | "TRAINER",
    createdByUserId: body.scope === "ORG" ? null : "user-trainer-demo",
    name: String(body.name ?? starter?.name ?? existing?.name ?? "Custom exercise"),
    muscleGroup: (body.muscleGroup as string | null | undefined) ?? starter?.muscleGroup ?? existing?.muscleGroup ?? null,
    equipment: (body.equipment as string | null | undefined) ?? starter?.equipment ?? existing?.equipment ?? null,
    defaultSets: Number(body.defaultSets ?? starter?.defaultSets ?? existing?.defaultSets ?? 3) || null,
    defaultReps: Number(body.defaultReps ?? starter?.defaultReps ?? existing?.defaultReps ?? 10) || null,
    defaultRestSeconds: Number(body.defaultRestSeconds ?? starter?.defaultRestSeconds ?? existing?.defaultRestSeconds ?? 90) || null,
    tempo: (body.tempo as string | null | undefined) ?? starter?.tempo ?? existing?.tempo ?? null,
    notes: (body.notes as string | null | undefined) ?? starter?.notes ?? existing?.notes ?? null,
    featured: Boolean(body.featured ?? starter?.featured ?? existing?.featured ?? false),
    active: body.active !== false,
    readOnly: false,
  };
}

function demoExerciseTemplatesResponse() {
  return {
    templates: [
      ...demoExerciseStarters,
      ...demoExerciseTemplates.filter((template) => template.active !== false),
    ],
  };
}

export function exerciseTemplatesDemoResponse(
  pathname: string,
  method: string,
  init: { body?: unknown },
) {
  const exerciseTemplateMatch = pathname.match(/^\/orgs\/[^/]+\/exercise-templates(?:\/([^/]+))?$/);
  if (!exerciseTemplateMatch) {
    return undefined;
  }

  const templateId = exerciseTemplateMatch[1];
  if (method === "POST") {
    const template = demoExerciseTemplatePayload(demoBody(init));
    demoExerciseTemplates.unshift(template);
    return { template };
  }
  if (method === "PATCH" && templateId) {
    const index = demoExerciseTemplates.findIndex((template) => template.id === templateId);
    const template = demoExerciseTemplatePayload(demoBody(init), demoExerciseTemplates[index]);
    if (index >= 0) demoExerciseTemplates[index] = template;
    else demoExerciseTemplates.unshift(template);
    return { template };
  }
  if (method === "DELETE" && templateId) {
    const template = demoExerciseTemplates.find((entry) => entry.id === templateId);
    if (template) template.active = false;
    return { template: template ?? { id: templateId, active: false } };
  }
  return demoExerciseTemplatesResponse();
}
