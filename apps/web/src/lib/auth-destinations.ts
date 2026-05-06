import type { AuthSessionSummary, Role } from "@zook/core";

const gymDashboardRoles = new Set<Role>(["OWNER", "ADMIN", "RECEPTIONIST"]);

function hasGymDashboardAccess(session: Pick<AuthSessionSummary, "activeOrganization">) {
  return Boolean(
    session.activeOrganization?.roles.some((role) => gymDashboardRoles.has(role)),
  );
}

function hasMemberAccess(session: Pick<AuthSessionSummary, "activeOrganization">) {
  return Boolean(session.activeOrganization?.roles.includes("MEMBER"));
}

export function resolvePostLoginPath(
  session:
    | Pick<AuthSessionSummary, "activeOrgId" | "activeOrganization" | "user">
    | null
    | undefined,
  requestedPath?: string | null,
) {
  if (requestedPath?.startsWith("/platform")) {
    return session?.user.isPlatformAdmin ? requestedPath : "/dashboard";
  }
  if (requestedPath) {
    return requestedPath;
  }
  if (session?.user.isPlatformAdmin) {
    return "/platform";
  }
  if (session && hasGymDashboardAccess(session)) {
    return "/dashboard";
  }
  if (session && hasMemberAccess(session)) {
    return "/me";
  }
  return "/gyms";
}

export function publicAccountLink(
  session: Pick<AuthSessionSummary, "activeOrganization" | "user"> | null | undefined,
  labels: { dashboard: string; membership: string },
) {
  if (!session || session.user.isPlatformAdmin) {
    return null;
  }
  if (hasGymDashboardAccess(session)) {
    return { href: "/dashboard", label: labels.dashboard };
  }
  if (hasMemberAccess(session)) {
    return { href: "/me", label: labels.membership };
  }
  return null;
}
