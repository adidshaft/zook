import type { NextRequest } from "next/server";
import { z } from "zod";
import type { RequestContext } from "@zook/core";
import { prisma } from "@zook/db";

import { getRequestContext, requireAuth, requireOrgAnyPermission, requireOrgPermission } from "../access";
import { forbiddenError, notFoundError, validationError } from "../errors";
import { ok, readJson } from "../response";
import { assertActiveContextOrg, clean, pathMatches, sanitizeRichText } from "./core";

const resourceInputSchema = z.object({
  title: z.string().trim().min(2).max(140),
  url: z.string().trim().url().max(500).optional(),
  summary: z.string().trim().max(500).optional(),
  content: z.string().trim().max(10000).optional(),
  approved: z.boolean().optional(),
});

const resourceUpdateSchema = resourceInputSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Provide at least one resource field to update.");

function canApproveResources(ctx: { permissions: string[] }) {
  return ctx.permissions.includes("ORG_MANAGE_PROFILE") || ctx.permissions.includes("ORG_MANAGE_STAFF");
}

async function assertResourceEditor(input: {
  ctx: RequestContext;
  orgId: string;
  resource: { createdById: string };
}) {
  if (input.resource.createdById === input.ctx.userId) {
    requireOrgPermission(input.ctx, input.orgId, "PLANS_CREATE");
    return;
  }
  if (!canApproveResources(input.ctx)) {
    throw forbiddenError("You can only edit your own resources.");
  }
}

export async function handleResources(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "resources"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireAuth(ctx);
    assertActiveContextOrg(ctx, orgId);
    if (!userId) {
      throw forbiddenError("Authentication required.");
    }
    const canSeeDrafts = ctx.permissions.includes("PLANS_CREATE") || canApproveResources(ctx);
    return ok({
      resources: await prisma.resourceLibraryItem.findMany({
        where: { orgId, ...(canSeeDrafts ? {} : { approved: true }) },
        orderBy: [{ approved: "asc" }, { updatedAt: "desc" }],
        take: 100,
      }),
    });
  }

  if (request.method === "GET" && pathMatches(path, ["me", "resources"])) {
    const ctx = await getRequestContext(request);
    requireAuth(ctx);
    if (!ctx.orgId) {
      throw validationError("Select an organization before viewing resources.");
    }
    return ok({
      resources: await prisma.resourceLibraryItem.findMany({
        where: { orgId: ctx.orgId, approved: true },
        orderBy: { updatedAt: "desc" },
        take: 100,
      }),
    });
  }

  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "resources"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "PLANS_CREATE");
    const body = resourceInputSchema.parse(await readJson(request));
    const approved = body.approved === true && canApproveResources(ctx);
    const resource = await prisma.resourceLibraryItem.create({
      data: clean({
        orgId,
        createdById: userId,
        title: body.title,
        url: body.url,
        summary: sanitizeRichText(body.summary),
        content: sanitizeRichText(body.content),
        approved,
      }),
    });
    return ok({ resource });
  }

  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "resources", /.+/])) {
    const orgId = path[1]!;
    const resourceId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireAuth(ctx);
    assertActiveContextOrg(ctx, orgId);
    const existing = await prisma.resourceLibraryItem.findFirst({ where: { id: resourceId, orgId } });
    if (!existing) {
      throw notFoundError("Resource not found.");
    }
    await assertResourceEditor({ ctx, orgId, resource: existing });
    const body = resourceUpdateSchema.parse(await readJson(request));
    if (body.approved !== undefined && !canApproveResources(ctx)) {
      throw forbiddenError("Only organization admins can approve resources.");
    }
    const resource = await prisma.resourceLibraryItem.update({
      where: { id: existing.id },
      data: clean({
        title: body.title,
        url: body.url,
        summary: sanitizeRichText(body.summary),
        content: sanitizeRichText(body.content),
        approved: body.approved,
      }),
    });
    return ok({ resource, actorUserId: userId });
  }

  if (request.method === "DELETE" && pathMatches(path, ["orgs", /.+/, "resources", /.+/])) {
    const orgId = path[1]!;
    const resourceId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    requireAuth(ctx);
    assertActiveContextOrg(ctx, orgId);
    requireOrgAnyPermission(ctx, orgId, ["PLANS_CREATE", "ORG_MANAGE_PROFILE", "ORG_MANAGE_STAFF"]);
    const existing = await prisma.resourceLibraryItem.findFirst({ where: { id: resourceId, orgId } });
    if (!existing) {
      throw notFoundError("Resource not found.");
    }
    await assertResourceEditor({ ctx, orgId, resource: existing });
    await prisma.resourceLibraryItem.delete({ where: { id: existing.id } });
    return ok({ ok: true });
  }

  return undefined;
}
