import type { NextRequest } from "next/server";
import { isOrgRole, platformPermissions, type RequestContext } from "@zook/core";
import { resolveSessionSummaryFromToken } from "./session";

export const sessionCookieName = "zook_session";
export const refreshSessionCookieName = "zook_refresh";

export function extractSessionToken(request: Pick<NextRequest, "headers" | "cookies">): string | undefined {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const cookieToken = request.cookies.get(sessionCookieName)?.value;
  return bearer || cookieToken || undefined;
}

export async function createRequestContext(
  request: NextRequest,
  input: { orgId?: string } = {},
): Promise<RequestContext> {
  const token = extractSessionToken(request);
  if (!token) {
    return {
      roles: [],
      permissions: [],
      ...(request.headers.get("x-forwarded-for")
        ? { ipAddress: request.headers.get("x-forwarded-for") as string }
        : {})
    };
  }

  const preferredOrgId =
    input.orgId ??
    request.headers.get("x-zook-org-id") ??
    request.nextUrl.searchParams.get("orgId") ??
    undefined;
  const session = await resolveSessionSummaryFromToken(token, preferredOrgId);
  if (!session) {
    return { roles: [], permissions: [] };
  }

  const activeOrganization =
    session.organizations.find((organization) => organization.orgId === preferredOrgId) ??
    session.activeOrganization;
  const roles = (activeOrganization?.roles ?? []).filter(isOrgRole);
  const permissions = Array.from(
    new Set([
      ...(activeOrganization?.permissions ?? []),
      ...(session.user.isPlatformAdmin ? platformPermissions : [])
    ])
  );

  return {
    userId: session.user.id,
    ...(session.originalUser ? { originalUserId: session.originalUser.id } : {}),
    ...(session.impersonation ? { impersonationSessionId: session.impersonation.id } : {}),
    ...(activeOrganization ? { orgId: activeOrganization.orgId } : {}),
    ...(activeOrganization ? { orgStatus: activeOrganization.status } : {}),
    roles,
    permissions,
    isPlatformAdmin: session.user.isPlatformAdmin,
    ...(request.headers.get("x-forwarded-for")
      ? { ipAddress: request.headers.get("x-forwarded-for") as string }
      : {}),
    ...(request.headers.get("user-agent") ? { userAgent: request.headers.get("user-agent") as string } : {})
  };
}

export const getRequestContext = createRequestContext;

export function requireUser(ctx: RequestContext): string {
  if (!ctx.userId) {
    throw new Error("Authentication required");
  }
  return ctx.userId;
}
