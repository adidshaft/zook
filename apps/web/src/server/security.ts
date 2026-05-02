import type { NextRequest } from "next/server";
import { sessionCookieName } from "./context";
import { forbiddenError } from "./errors";

export function getClientIp(request: Pick<NextRequest, "headers">) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function parseUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isLoopbackHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname === "[::1]"
  );
}

function isSameOrEquivalentLocalOrigin(expectedOrigin: string, candidate: string) {
  const expected = parseUrl(expectedOrigin);
  const actual = parseUrl(candidate);
  if (!expected || !actual) {
    return false;
  }
  if (expected.origin === actual.origin) {
    return true;
  }
  return (
    expected.protocol === actual.protocol &&
    expected.port === actual.port &&
    isLoopbackHost(expected.hostname) &&
    isLoopbackHost(actual.hostname)
  );
}

export function assertSafeMutationRequest(
  request: Pick<NextRequest, "method" | "headers" | "cookies" | "nextUrl">,
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
  const requestOrigin = request.nextUrl.origin;
  const originCandidate = origin ?? referer;
  const originMatches = originCandidate
    ? isSameOrEquivalentLocalOrigin(requestOrigin, originCandidate)
    : true;
  const equivalentLoopback =
    originCandidate !== null &&
    originCandidate !== undefined &&
    isSameOrEquivalentLocalOrigin(requestOrigin, originCandidate) &&
    parseUrl(requestOrigin)?.origin !== parseUrl(originCandidate)?.origin;

  const sameSiteFetch =
    fetchSite === null ||
    fetchSite === "same-origin" ||
    fetchSite === "same-site" ||
    fetchSite === "none" ||
    (fetchSite === "cross-site" && equivalentLoopback);

  if (!originMatches || !sameSiteFetch) {
    throw forbiddenError(
      intent
        ? "Cross-site mutation blocked."
        : "Cross-site mutation blocked. Retry from the Zook app or include the expected intent header.",
    );
  }
}
