import type { NextRequest } from "next/server";
import { getOrigins } from "../lib/origins";
import { getForwardedClientIp, sessionCookieName } from "./context";
import { forbiddenError } from "./errors";

export function getClientIp(request: Pick<NextRequest, "headers">) {
  return getForwardedClientIp(request) ?? "unknown";
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

function forwardedRequestOrigin(request: Pick<NextRequest, "headers" | "nextUrl">) {
  const forwardedHost =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host")?.split(",")[0]?.trim();
  if (!forwardedHost) {
    return request.nextUrl.origin;
  }
  const forwardedProto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    request.nextUrl.protocol.replace(/:$/, "");
  try {
    return new URL(`${forwardedProto}://${forwardedHost}`).origin;
  } catch {
    return request.nextUrl.origin;
  }
}

function trustedWebOrigins() {
  const origins = getOrigins();
  return new Set([
    origins.public,
    origins.dashboard,
    "https://zookfit.in",
    "https://app.zookfit.in",
    "https://dashboard.zookfit.in",
  ]);
}

function isTrustedConfiguredOrigin(candidate: string | null) {
  if (!candidate) {
    return false;
  }
  const parsed = parseUrl(candidate);
  return Boolean(parsed && trustedWebOrigins().has(parsed.origin));
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
  const requestOrigin = forwardedRequestOrigin(request);
  const originCandidate = origin ?? referer;
  const allBrowserHintsAbsent =
    origin === null && referer === null && fetchSite === null;
  const requestOriginUrl = parseUrl(requestOrigin);
  const isLocalNonProductionRequest =
    requestOriginUrl !== null &&
    isLoopbackHost(requestOriginUrl.hostname) &&
    process.env.APP_ENV !== "production" &&
    process.env.ENV_PROFILE !== "production";

  if (allBrowserHintsAbsent && !intent && !isLocalNonProductionRequest) {
    throw forbiddenError("Cross-site mutation blocked. Include the x-zook-intent header.");
  }
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
    (fetchSite === "cross-site" && equivalentLoopback);
  const trustedSameSiteIntent =
    Boolean(intent) &&
    sameSiteFetch &&
    isTrustedConfiguredOrigin(originCandidate);

  if ((!originMatches || !sameSiteFetch) && !trustedSameSiteIntent) {
    throw forbiddenError(
      intent
        ? "Cross-site mutation blocked."
        : "Cross-site mutation blocked. Retry from the Zook app or include the expected intent header.",
    );
  }
}
