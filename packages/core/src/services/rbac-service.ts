import type { Permission, RequestContext } from "../types";

export class ServiceAuthorizationError extends Error {
  readonly code: "unauthorized" | "forbidden";
  readonly status: 401 | 403;

  constructor(code: "unauthorized" | "forbidden", message: string) {
    super(message);
    this.name = "ServiceAuthorizationError";
    this.code = code;
    this.status = code === "unauthorized" ? 401 : 403;
  }
}

export function assertAuthenticatedContext(ctx: RequestContext): string {
  if (!ctx.userId) {
    throw new ServiceAuthorizationError("unauthorized", "Authentication required");
  }
  return ctx.userId;
}

export function assertActiveOrgContext(ctx: RequestContext, orgId: string): string {
  const userId = assertAuthenticatedContext(ctx);
  if (ctx.orgId !== orgId || !ctx.roles.length) {
    throw new ServiceAuthorizationError("forbidden", "No organization access");
  }
  if (ctx.orgStatus === "SUSPENDED" || ctx.orgStatus === "CANCELLED") {
    throw new ServiceAuthorizationError("forbidden", "Organization is not active.");
  }
  return userId;
}

export function assertOrgServicePermission(
  ctx: RequestContext,
  orgId: string,
  permission: Permission,
): string {
  const userId = assertActiveOrgContext(ctx, orgId);
  if (!ctx.permissions.includes(permission)) {
    throw new ServiceAuthorizationError("forbidden", `Permission denied: ${permission}`);
  }
  return userId;
}

export function assertOrgAnyServicePermission(
  ctx: RequestContext,
  orgId: string,
  permissions: Permission[],
): string {
  const userId = assertActiveOrgContext(ctx, orgId);
  if (!permissions.some((permission) => ctx.permissions.includes(permission))) {
    throw new ServiceAuthorizationError(
      "forbidden",
      `Permission denied: ${permissions.join(" or ")}`,
    );
  }
  return userId;
}

export function assertSelfServiceMutation(ctx: RequestContext, userId: string): string {
  const actorUserId = assertAuthenticatedContext(ctx);
  if (actorUserId !== userId) {
    throw new ServiceAuthorizationError("forbidden", "Cannot mutate another user's record");
  }
  return actorUserId;
}
