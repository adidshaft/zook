import type { Permission, Role } from "@zook/core";

type RoutePermissionRule = Permission | Permission[] | null;

export const routePermissions: Record<string, RoutePermissionRule> = {
  "/owner": "ORG_VIEW_REPORTS",
  "/owner/member": "MEMBERS_VIEW",
  "/owner/members": "MEMBERS_VIEW",
  "/owner/approvals": "ATTENDANCE_APPROVE",
  "/owner/billing": "ORG_MANAGE_BILLING",
  "/owner/revenue": "ORG_VIEW_REPORTS",
  "/owner/stock": "SHOP_MANAGE_PRODUCTS",
  "/reception": "ATTENDANCE_APPROVE",
  "/reception/members": "MEMBERS_VIEW",
  "/reception/payments": "PAYMENTS_RECORD_OFFLINE",
  "/reception/orders": "SHOP_FULFILL_ORDER",
  "/trainer": "PT_RECORD",
  "/trainer/client": ["MEMBERS_VIEW", "PT_RECORD"],
  "/trainer/clients": ["MEMBERS_VIEW", "PT_RECORD"],
  "/trainer/plans": "PT_RECORD",
  "/trainer/payouts": "PT_RECORD",
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

export function permissionForPath(pathname: string): RoutePermissionRule | undefined {
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
  perms: ReadonlySet<Permission>,
  isPlatformAdmin: boolean,
) {
  const required = permissionForPath(pathname);
  if (required === undefined) return true;
  if (required === null) return isPlatformAdmin;
  if (Array.isArray(required)) {
    return required.some((permission) => perms.has(permission));
  }
  return perms.has(required);
}

export function routeForRole(role: Role): string {
  if (role === "PLATFORM_ADMIN") return "/platform";
  if (role === "OWNER" || role === "ADMIN") return "/owner";
  if (role === "RECEPTIONIST") return "/reception";
  if (role === "TRAINER") return "/trainer";
  return "/";
}
