import type { NextRequest } from "next/server";
import { permissionsForRoles, type RequestContext, type Role } from "@zook/core";
import { AuthService } from "@zook/core/services";
import { prisma } from "@zook/db";

export const sessionCookieName = "zook_session";

export async function createRequestContext(request: NextRequest): Promise<RequestContext> {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const cookieToken = request.cookies.get(sessionCookieName)?.value;
  const token = bearer || cookieToken;
  if (!token) {
    return {
      roles: [],
      permissions: [],
      ...(request.headers.get("x-forwarded-for")
        ? { ipAddress: request.headers.get("x-forwarded-for") as string }
        : {})
    };
  }
  const session = await prisma.userSession.findUnique({
    where: { tokenHash: AuthService.hash(token) }
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date()) {
    return { roles: [], permissions: [] };
  }
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    return { roles: [], permissions: [] };
  }
  const orgId =
    request.headers.get("x-zook-org-id") ??
    request.nextUrl.searchParams.get("orgId") ??
    undefined;
  const assignments = orgId
    ? await prisma.organizationRoleAssignment.findMany({ where: { orgId, userId: user.id } })
    : [];
  const roles = (user.isPlatformAdmin ? ["PLATFORM_ADMIN"] : assignments.map((assignment) => assignment.role)) as Role[];
  return {
    userId: user.id,
    ...(orgId ? { orgId } : {}),
    roles,
    permissions: permissionsForRoles(roles),
    isPlatformAdmin: user.isPlatformAdmin,
    ...(request.headers.get("x-forwarded-for")
      ? { ipAddress: request.headers.get("x-forwarded-for") as string }
      : {}),
    ...(request.headers.get("user-agent") ? { userAgent: request.headers.get("user-agent") as string } : {})
  };
}

export function requireUser(ctx: RequestContext): string {
  if (!ctx.userId) {
    throw new Error("Authentication required");
  }
  return ctx.userId;
}
