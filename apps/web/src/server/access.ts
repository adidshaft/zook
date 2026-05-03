import type { Permission, RequestContext } from "@zook/core";
import type { NextRequest } from "next/server";
import { createRequestContext } from "./context";
import { forbiddenError, unauthorizedError } from "./errors";

export async function getRequestContext(request: NextRequest, input: { orgId?: string } = {}) {
  return createRequestContext(request, input);
}

export function requireAuth(ctx: RequestContext) {
  if (!ctx.userId) {
    throw unauthorizedError();
  }
  return ctx.userId;
}

export function requireOrgPermission(ctx: RequestContext, orgId: string, permission: Permission) {
  if (!ctx.userId) {
    throw unauthorizedError();
  }
  if (ctx.orgId !== orgId || !ctx.roles.length) {
    throw forbiddenError("No organization access");
  }
  if (ctx.orgStatus === "SUSPENDED" || ctx.orgStatus === "CANCELLED") {
    throw forbiddenError("Organization is not active.");
  }
  if (!ctx.permissions.includes(permission)) {
    throw forbiddenError(`Permission denied: ${permission}`);
  }
  return ctx.userId;
}

export function requirePlatformAdmin(ctx: RequestContext) {
  if (!ctx.userId) {
    throw unauthorizedError();
  }
  if (!ctx.isPlatformAdmin) {
    throw forbiddenError("Platform admin required");
  }
  return ctx.userId;
}
