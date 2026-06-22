import { prisma } from "@zook/db";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getRequestContext, requireOrgAnyPermission } from "../access";
import { writeAuditLog } from "../audit";
import { forbiddenError, notFoundError } from "../errors";
import { ok, readJson } from "../response";
import { assertActiveContextOrg, clean, pathMatches } from "./core";

const starterTemplates = [
  { id: "starter-bench-press", name: "Bench Press", muscleGroup: "Chest", equipment: "Barbell", defaultSets: 4, defaultReps: 8, defaultRestSeconds: 120, tempo: "2-0-1", notes: "Keep shoulder blades pinned and feet planted.", featured: true },
  { id: "starter-back-squat", name: "Back Squat", muscleGroup: "Legs", equipment: "Barbell", defaultSets: 4, defaultReps: 6, defaultRestSeconds: 150, tempo: "3-1-1", notes: "Brace before descent and drive through mid-foot.", featured: true },
  { id: "starter-deadlift", name: "Deadlift", muscleGroup: "Posterior chain", equipment: "Barbell", defaultSets: 3, defaultReps: 5, defaultRestSeconds: 180, tempo: "1-0-1", notes: "Set lats before the pull; bar stays close.", featured: true },
  { id: "starter-overhead-press", name: "Overhead Press", muscleGroup: "Shoulders", equipment: "Barbell", defaultSets: 4, defaultReps: 6, defaultRestSeconds: 120, tempo: "2-0-1", notes: "Squeeze glutes and finish with biceps by ears.", featured: false },
  { id: "starter-pull-up", name: "Pull-up", muscleGroup: "Back", equipment: "Pull-up bar", defaultSets: 3, defaultReps: 8, defaultRestSeconds: 120, tempo: "2-1-1", notes: "Start from a dead hang and pull chest toward bar.", featured: true },
  { id: "starter-barbell-row", name: "Barbell Row", muscleGroup: "Back", equipment: "Barbell", defaultSets: 4, defaultReps: 8, defaultRestSeconds: 90, tempo: "2-1-1", notes: "Hinge, brace, and row toward lower ribs.", featured: false },
  { id: "starter-romanian-deadlift", name: "Romanian Deadlift", muscleGroup: "Hamstrings", equipment: "Barbell", defaultSets: 3, defaultReps: 10, defaultRestSeconds: 120, tempo: "3-1-1", notes: "Soft knees, hips back, feel hamstrings lengthen.", featured: false },
  { id: "starter-leg-press", name: "Leg Press", muscleGroup: "Legs", equipment: "Machine", defaultSets: 4, defaultReps: 12, defaultRestSeconds: 90, tempo: "2-1-1", notes: "Control depth and avoid locking knees hard.", featured: false },
  { id: "starter-lat-pulldown", name: "Lat Pulldown", muscleGroup: "Back", equipment: "Cable", defaultSets: 3, defaultReps: 12, defaultRestSeconds: 75, tempo: "2-1-1", notes: "Pull elbows down, not hands back.", featured: false },
  { id: "starter-plank", name: "Plank", muscleGroup: "Core", equipment: "Bodyweight", defaultSets: 3, defaultReps: 1, defaultRestSeconds: 60, tempo: "hold", notes: "Ribs down, glutes tight, breathe slowly.", featured: true },
] as const;

const templateBaseSchema = z.object({
  scope: z.enum(["ORG", "TRAINER"]).default("TRAINER"),
  name: z.string().trim().min(2).max(120).optional(),
  muscleGroup: z.string().trim().max(80).optional().nullable(),
  equipment: z.string().trim().max(80).optional().nullable(),
  defaultSets: z.number().int().positive().max(50).optional().nullable(),
  defaultReps: z.number().int().positive().max(500).optional().nullable(),
  defaultRestSeconds: z.number().int().nonnegative().max(3600).optional().nullable(),
  tempo: z.string().trim().max(40).optional().nullable(),
  notes: z.string().trim().max(600).optional().nullable(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
  starterId: z.string().optional(),
});

const templateSchema = templateBaseSchema.refine((value) => Boolean(value.name || value.starterId), {
  message: "Provide a template name or starterId.",
  path: ["name"],
});

const templatePatchSchema = templateBaseSchema.partial();

function normalizeStarter(starter: (typeof starterTemplates)[number]) {
  return {
    ...starter,
    orgId: null,
    scope: "STARTER",
    createdByUserId: null,
    active: true,
    createdAt: null,
    updatedAt: null,
    readOnly: true,
  };
}

function starterById(id?: string | null) {
  return starterTemplates.find((template) => template.id === id);
}

function canManageOrgTemplates(permissions: string[]) {
  return permissions.includes("TRAINERS_MANAGE") || permissions.includes("PLANS_PUBLISH_ALL");
}

export async function handleExerciseTemplates(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "exercise-templates"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgAnyPermission(ctx, orgId, ["PLANS_CREATE", "TRAINERS_MANAGE", "MEMBERS_VIEW"]);
    assertActiveContextOrg(ctx, orgId);
    const templates = await prisma.exerciseTemplate.findMany({
      where: {
        orgId,
        active: true,
        OR: [
          { scope: "ORG" },
          { scope: "TRAINER", createdByUserId: userId },
        ],
      },
      orderBy: [{ featured: "desc" }, { name: "asc" }],
    });
    return ok({
      templates: [
        ...starterTemplates.map(normalizeStarter),
        ...templates.map((template) => ({ ...template, readOnly: false })),
      ],
    });
  }

  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "exercise-templates"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgAnyPermission(ctx, orgId, ["PLANS_CREATE", "TRAINERS_MANAGE"]);
    assertActiveContextOrg(ctx, orgId);
    const body = templateSchema.parse(await readJson(request));
    const source = starterById(body.starterId);
    const scope = body.scope;
    if (scope === "ORG" && !canManageOrgTemplates(ctx.permissions)) {
      throw forbiddenError("Only gym admins can publish shared exercise templates.");
    }
    const template = await prisma.exerciseTemplate.create({
      data: clean({
        orgId,
        scope,
        createdByUserId: scope === "TRAINER" ? userId : null,
        name: body.name || source?.name,
        muscleGroup: body.muscleGroup ?? source?.muscleGroup ?? null,
        equipment: body.equipment ?? source?.equipment ?? null,
        defaultSets: body.defaultSets ?? source?.defaultSets ?? null,
        defaultReps: body.defaultReps ?? source?.defaultReps ?? null,
        defaultRestSeconds: body.defaultRestSeconds ?? source?.defaultRestSeconds ?? null,
        tempo: body.tempo ?? source?.tempo ?? null,
        notes: body.notes ?? source?.notes ?? null,
        featured: scope === "ORG" ? (body.featured ?? source?.featured ?? false) : false,
        active: body.active ?? true,
      }),
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "exercise_template.created",
      entityType: "exercise_template",
      entityId: template.id,
      metadata: { scope: template.scope },
    });
    return ok({ template });
  }

  if (
    (request.method === "PATCH" || request.method === "DELETE") &&
    pathMatches(path, ["orgs", /.+/, "exercise-templates", /.+/])
  ) {
    const orgId = path[1]!;
    const templateId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgAnyPermission(ctx, orgId, ["PLANS_CREATE", "TRAINERS_MANAGE"]);
    assertActiveContextOrg(ctx, orgId);
    const template = await prisma.exerciseTemplate.findFirst({ where: { id: templateId, orgId } });
    if (!template) {
      throw notFoundError("Exercise template not found");
    }
    const canManage =
      template.scope === "ORG"
        ? canManageOrgTemplates(ctx.permissions)
        : template.createdByUserId === userId || canManageOrgTemplates(ctx.permissions);
    if (!canManage) {
      throw forbiddenError("You cannot manage this exercise template.");
    }
    if (request.method === "DELETE") {
      const deleted = await prisma.exerciseTemplate.update({
        where: { id: template.id },
        data: { active: false },
      });
      return ok({ template: deleted });
    }
    const body = templatePatchSchema.parse(await readJson(request));
    if (body.scope === "ORG" && !canManageOrgTemplates(ctx.permissions)) {
      throw forbiddenError("Only gym admins can publish shared exercise templates.");
    }
    const nextScope = body.scope ?? template.scope;
    const updated = await prisma.exerciseTemplate.update({
      where: { id: template.id },
      data: clean({
        scope: nextScope,
        createdByUserId: nextScope === "TRAINER" ? template.createdByUserId ?? userId : null,
        name: body.name,
        muscleGroup: body.muscleGroup,
        equipment: body.equipment,
        defaultSets: body.defaultSets,
        defaultReps: body.defaultReps,
        defaultRestSeconds: body.defaultRestSeconds,
        tempo: body.tempo,
        notes: body.notes,
        featured: nextScope === "ORG" ? body.featured : false,
        active: body.active,
      }),
    });
    return ok({ template: updated });
  }

  return undefined;
}
