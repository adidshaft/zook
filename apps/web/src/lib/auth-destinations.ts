import type { AuthSessionSummary, Role } from "@zook/core";
import { expectedHostForPath, type WebHost } from "./host-routing";
import type { WebOrigins } from "./origins";

const ownerDashboardRoles = new Set<Role>(["OWNER", "ADMIN"]);
const receptionistRoles = new Set<Role>(["RECEPTIONIST"]);
const trainerRoles = new Set<Role>(["TRAINER"]);

type AuthDestinationSession =
  | (Pick<AuthSessionSummary, "activeOrgId" | "activeOrganization" | "user"> &
      Partial<Pick<AuthSessionSummary, "organizations">>)
  | null
  | undefined;

export type AuthDestination = {
  host: WebHost;
  path: string;
};

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

function safePath(value?: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : null;
}

function pathnameForHostMatch(path: string) {
  try {
    return new URL(path, "https://zook.local").pathname;
  } catch {
    return path.split(/[?#]/)[0] || "/";
  }
}

function requestedHost(path: string): WebHost | null {
  const host = expectedHostForPath(pathnameForHostMatch(path));
  return host === "public" || host === "dashboard" ? host : null;
}

function matchesPathPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function privateMemberPath(session: Pick<AuthSessionSummary, "user">) {
  const user = session.user as AuthSessionSummary["user"] & {
    slug?: string | null;
    publicSlug?: string | null;
  };
  const slug = user.slug ?? user.publicSlug;
  if (slug) {
    return `/m/${slug}`;
  }
  return session.user.privateHandle ? `/me/${session.user.privateHandle}` : "/me";
}

function hasOwnerAccessAcrossOrgs(session: AuthDestinationSession) {
  return Boolean(
    session?.organizations?.some((organization) =>
      organization.roles.some((role) => ownerDashboardRoles.has(role)),
    ),
  );
}

function defaultDestination(session: AuthDestinationSession): AuthDestination {
  if (session?.user.isPlatformAdmin) {
    return { host: "dashboard", path: "/platform" };
  }
  if (hasOwnerAccessAcrossOrgs(session) || (session && hasOwnerDashboardAccess(session))) {
    return { host: "dashboard", path: "/dashboard" };
  }
  if (session && hasDeskAccess(session)) {
    return { host: "dashboard", path: "/desk" };
  }
  if (session && hasCoachAccess(session)) {
    return { host: "dashboard", path: "/coach" };
  }
  if (session && hasMemberAccess(session)) {
    return { host: "public", path: privateMemberPath(session) };
  }
  return { host: "public", path: "/gyms" };
}

function requestedPathIsAllowed(
  session: AuthDestinationSession,
  destination: AuthDestination,
  requested: string,
) {
  if (requestedHost(requested) !== destination.host) {
    return false;
  }

  const pathname = pathnameForHostMatch(requested);
  if (session?.user.isPlatformAdmin) {
    return matchesPathPrefix(pathname, "/platform");
  }

  if (destination.host === "dashboard") {
    if (matchesPathPrefix(pathname, "/dashboard")) {
      return (
        hasOwnerAccessAcrossOrgs(session) || Boolean(session && hasOwnerDashboardAccess(session))
      );
    }
    if (matchesPathPrefix(pathname, "/desk")) {
      return Boolean(session && (hasOwnerDashboardAccess(session) || hasDeskAccess(session)));
    }
    if (matchesPathPrefix(pathname, "/coach")) {
      return Boolean(session && hasCoachAccess(session));
    }
    if (matchesPathPrefix(pathname, "/start-gym") || matchesPathPrefix(pathname, "/staff")) {
      return Boolean(session && hasOwnerDashboardAccess(session));
    }
    return false;
  }

  if (matchesPathPrefix(pathname, "/me") || matchesPathPrefix(pathname, "/m")) {
    return Boolean(session && hasMemberAccess(session));
  }
  return true;
}

export function resolvePostLoginDestination(
  session: AuthDestinationSession,
  requestedPath?: string | null,
): AuthDestination {
  const requested = safePath(requestedPath);
  const requestedPathname = requested ? pathnameForHostMatch(requested) : null;
  if (
    requested &&
    session &&
    !session.user.isPlatformAdmin &&
    requestedPathname &&
    matchesPathPrefix(requestedPathname, "/start-gym")
  ) {
    return { host: "dashboard", path: requested };
  }

  const destination = defaultDestination(session);
  if (requested && requestedPathIsAllowed(session, destination, requested)) {
    return { ...destination, path: requested };
  }
  return destination;
}

export function destinationToUrl(destination: AuthDestination, origins: WebOrigins) {
  const origin = destination.host === "dashboard" ? origins.dashboard : origins.public;
  return new URL(destination.path, origin).toString();
}

export function destinationToHref(
  destination: AuthDestination,
  currentHost: WebHost,
  origins: WebOrigins,
) {
  return destination.host === currentHost
    ? destination.path
    : destinationToUrl(destination, origins);
}

export function publicAccountDestination(
  session:
    | Pick<AuthSessionSummary, "activeOrganization" | "user" | "organizations">
    | null
    | undefined,
) {
  if (!session) {
    return null;
  }
  return defaultDestination(session);
}

export function accountDestinationLabel(
  destination: AuthDestination,
  labels: {
    platform?: string;
    dashboard: string;
    desk?: string;
    coach?: string;
    membership: string;
  },
) {
  if (destination.path.startsWith("/platform")) {
    return labels.platform ?? "Platform";
  }
  if (destination.path.startsWith("/desk")) {
    return labels.desk ?? "Desk";
  }
  if (destination.path.startsWith("/coach")) {
    return labels.coach ?? "Coach";
  }
  if (destination.host === "dashboard") {
    return labels.dashboard;
  }
  return labels.membership;
}
