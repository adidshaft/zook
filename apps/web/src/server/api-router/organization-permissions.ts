import { orgRoles, permissions } from "@zook/core";
import { prisma } from "@zook/db";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getRequestContext, requireOrgPermission } from "../access";
import { writeAuditLog } from "../audit";
import { ok, readJson } from "../response";
import {
  ANALYTICS_SUMMARY_LIST_LIMIT,
  pathMatches,
  revokeActiveSessionsForUsers,
} from "./core";

const permissionOverrideSchema = z.object({
  role: z.enum(orgRoles),
  permission: z
    .enum(permissions)
    .refine(
      (permission) => !permission.startsWith("PLATFORM_"),
      "Platform permissions are not tenant scoped.",
    ),
  enabled: z.boolean(),
});

export async function handleOrganizationPermissions(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "permissions"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "ORG_MANAGE_PERMISSIONS");
    return ok({
      permissions: await prisma.organizationRolePermission.findMany({
        where: { orgId },
        orderBy: { createdAt: "desc" },
        take: ANALYTICS_SUMMARY_LIST_LIMIT,
      }),
    });
  }
  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "permissions"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_PERMISSIONS");
    const body = permissionOverrideSchema.parse(await readJson(request));
    const permission = await prisma.organizationRolePermission.upsert({
      where: {
        orgId_role_permission: { orgId, role: body.role, permission: body.permission },
      },
      update: { enabled: body.enabled, overriddenByUserId: userId },
      create: {
        orgId,
        role: body.role,
        permission: body.permission,
        enabled: body.enabled,
        overriddenByUserId: userId,
      },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "permissions.updated",
      entityType: "organization_role_permission",
      entityId: permission.id,
      metadata: body,
    });
    const affectedAssignments = await prisma.organizationRoleAssignment.findMany({
      where: { orgId, role: body.role },
      select: { userId: true },
    });
    await revokeActiveSessionsForUsers(affectedAssignments.map((assignment) => assignment.userId));
    return ok({ permission });
  }
  return undefined;
}
