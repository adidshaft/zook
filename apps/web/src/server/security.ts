import type { NextRequest } from "next/server";
import { sessionCookieName } from "./context";
import { forbiddenError } from "./errors";

export function getClientIp(request: Pick<NextRequest, "headers">) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export function assertSafeMutationRequest(
  request: Pick<NextRequest, "method" | "headers" | "cookies" | "nextUrl">
) {
  if (!["POST", "PATCH", "DELETE"].includes(request.method)) {
    return;
  }

  const hasBearerToken = Boolean(request.headers.get("authorization"));
  const hasCookieSession = Boolean(request.cookies.get(sessionCookieName)?.value);

  if (hasBearerToken || !hasCookieSession) {
    return;
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const fetchSite = request.headers.get("sec-fetch-site");
  const intent = request.headers.get("x-zook-intent");

  const sameOrigin =
    origin !== null
      ? origin === request.nextUrl.origin
      : referer !== null
        ? referer.startsWith(request.nextUrl.origin)
        : true;
  const sameSiteFetch =
    fetchSite === null || fetchSite === "same-origin" || fetchSite === "same-site" || fetchSite === "none";

  if (!sameOrigin || !sameSiteFetch) {
    throw forbiddenError(
      intent
        ? "Cross-site mutation blocked."
        : "Cross-site mutation blocked. Retry from the Zook app or include the expected intent header."
    );
  }
}
