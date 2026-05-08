import type { Permission, Role } from "@zook/core";

export const routePermissions: Record<string, Permission | null> = {
  "/owner": "ORG_VIEW_REPORTS",
  "/owner/member": "MEMBERS_VIEW",
  "/reception": "ATTENDANCE_APPROVE",
  "/trainer": "PT_RECORD",
  "/trainer/client": "MEMBERS_VIEW",
  "/platform": null,
};

const routeRoles: Record<string, Role[]> = {
  "/owner": ["OWNER", "ADMIN"],
  "/reception": ["RECEPTIONIST", "OWNER", "ADMIN"],
  "/trainer": ["TRAINER", "OWNER", "ADMIN"],
  "/platform": ["PLATFORM_ADMIN"],
};

function routeMatches(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function longestMatchingRoute<T>(pathname: string, routes: Record<string, T>) {
  return Object.keys(routes)
    .filter((route) => routeMatches(pathname, route))
    .sort((left, right) => right.length - left.length)[0];
}

export function permissionForPath(pathname: string): Permission | null | undefined {
  const route = longestMatchingRoute(pathname, routePermissions);
  return route ? routePermissions[route] : undefined;
}

export function requiredRolesForPath(pathname: string): Role[] | null {
  const route = longestMatchingRoute(pathname, routeRoles);
  return route ? routeRoles[route] : null;
}

export function requiredRoleForPath(pathname: string): Role | null {
  return requiredRolesForPath(pathname)?.[0] ?? null;
}

export function checkRouteAccess(
  pathname: string,
  perms: Set<Permission>,
  isPlatformAdmin: boolean,
) {
  const required = permissionForPath(pathname);
  if (required === undefined) return true;
  if (required === null) return isPlatformAdmin;
  return perms.has(required);
}

export function routeForRole(role: Role): string {
  if (role === "PLATFORM_ADMIN") return "/platform";
  if (role === "OWNER" || role === "ADMIN") return "/owner";
  if (role === "RECEPTIONIST") return "/reception";
  if (role === "TRAINER") return "/trainer";
  return "/";
}
