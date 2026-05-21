export type WebHost = "public" | "dashboard";

export const STAFF_PATH_PREFIXES = [
  "/dashboard",
  "/desk",
  "/coach",
  "/platform",
  "/staff",
  "/start-gym",
] as const;

export const PUBLIC_PATH_PREFIXES = [
  "/me",
  "/m",
  "/g",
  "/in",
  "/join",
  "/r",
  "/qr",
  "/gyms",
  "/guardian",
  "/guardian-consent",
  "/checkout",
  "/support",
  "/terms",
  "/privacy",
  "/status",
] as const;

export const SHARED_PATH_PREFIXES = ["/login", "/verify-otp", "/api"] as const;

function matchesPathPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function pathBelongsToStaff(pathname: string) {
  return STAFF_PATH_PREFIXES.some((prefix) => matchesPathPrefix(pathname, prefix));
}

export function pathBelongsToPublic(pathname: string) {
  return PUBLIC_PATH_PREFIXES.some((prefix) => matchesPathPrefix(pathname, prefix));
}

export function pathIsShared(pathname: string) {
  return pathname === "/" || SHARED_PATH_PREFIXES.some((prefix) => matchesPathPrefix(pathname, prefix));
}

export function expectedHostForPath(pathname: string): WebHost | "either" {
  if (pathBelongsToStaff(pathname)) {
    return "dashboard";
  }
  if (pathBelongsToPublic(pathname)) {
    return "public";
  }
  return "either";
}
