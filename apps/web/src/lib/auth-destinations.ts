import type { AuthSessionSummary, Role } from "@zook/core";

const ownerDashboardRoles = new Set<Role>(["OWNER", "ADMIN"]);
const receptionistRoles = new Set<Role>(["RECEPTIONIST"]);
const trainerRoles = new Set<Role>(["TRAINER"]);

export function hasOwnerDashboardAccess(session: Pick<AuthSessionSummary, "activeOrganization">) {
  return Boolean(session.activeOrganization?.roles.some((role) => ownerDashboardRoles.has(role)));
}

export function hasDeskAccess(session: Pick<AuthSessionSummary, "activeOrganization">) {
  return Boolean(session.activeOrganization?.roles.some((role) => receptionistRoles.has(role)));
}

export function hasCoachAccess(session: Pick<AuthSessionSummary, "activeOrganization">) {
  return Boolean(session.activeOrganization?.roles.some((role) => trainerRoles.has(role)));
}

function hasMemberAccess(session: Pick<AuthSessionSummary, "activeOrganization">) {
  return Boolean(session.activeOrganization?.roles.includes("MEMBER"));
}

function privateMemberPath(session: Pick<AuthSessionSummary, "user">) {
  return session.user.privateHandle ? `/me/${session.user.privateHandle}` : "/me";
}

export function resolvePostLoginPath(
  session:
    | (Pick<AuthSessionSummary, "activeOrgId" | "activeOrganization" | "user"> &
        Partial<Pick<AuthSessionSummary, "organizations">>)
    | null
    | undefined,
  requestedPath?: string | null,
) {
  if (requestedPath?.startsWith("/dashboard") && session && !hasOwnerDashboardAccess(session)) {
    return resolvePostLoginPath(session);
  }
  if (requestedPath?.startsWith("/desk") && session && !hasDeskAccess(session)) {
    return resolvePostLoginPath(session);
  }
  if (requestedPath?.startsWith("/coach") && session && !hasCoachAccess(session)) {
    return resolvePostLoginPath(session);
  }
  if (requestedPath?.startsWith("/me") && session && !hasMemberAccess(session)) {
    return resolvePostLoginPath(session);
  }
  if (requestedPath?.startsWith("/platform")) {
    if (session?.user.isPlatformAdmin) {
      return requestedPath;
    }
    return resolvePostLoginPath(session);
  }
  if (requestedPath) {
    return requestedPath;
  }
  if (session?.user.isPlatformAdmin) {
    return "/platform";
  }
  const ownerOrg = session?.organizations?.find((organization) =>
    organization.roles.some((role) => ownerDashboardRoles.has(role)),
  );
  if (ownerOrg) {
    return "/dashboard";
  }
  if (session && hasOwnerDashboardAccess(session)) {
    return "/dashboard";
  }
  if (session && hasDeskAccess(session)) {
    return "/desk";
  }
  if (session && hasCoachAccess(session)) {
    return "/coach";
  }
  if (session && hasMemberAccess(session)) {
    return privateMemberPath(session);
  }
  return "/gyms";
}

export function publicAccountLink(
  session:
    | Pick<AuthSessionSummary, "activeOrganization" | "user" | "organizations">
    | null
    | undefined,
  labels: { platform?: string; dashboard: string; desk?: string; coach?: string; membership: string },
) {
  if (!session) {
    return null;
  }
  if (session.user.isPlatformAdmin) {
    return { href: "/platform", label: labels.platform ?? "Platform" };
  }
  const ownerOrg = session.organizations.find((organization) =>
    organization.roles.some((role) => ownerDashboardRoles.has(role)),
  );
  if (ownerOrg) {
    return { href: "/dashboard", label: labels.dashboard };
  }
  if (hasOwnerDashboardAccess(session)) {
    return { href: "/dashboard", label: labels.dashboard };
  }
  if (hasDeskAccess(session)) {
    return { href: "/desk", label: labels.desk ?? "Desk" };
  }
  if (hasCoachAccess(session)) {
    return { href: "/coach", label: labels.coach ?? "Coach" };
  }
  if (hasMemberAccess(session)) {
    return { href: privateMemberPath(session), label: labels.membership };
  }
  return { href: privateMemberPath(session), label: labels.membership };
}
