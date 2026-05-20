import { NextResponse, type NextRequest } from "next/server";
import { expectedHostForPath, pathBelongsToStaff } from "./src/lib/host-routing";

const sessionCookieName = "zook_session";
const refreshSessionCookieName = "zook_refresh";
const canonicalHost = "zookfit.in";
const STAFF_HOST = "dashboard.zookfit.in";
const PUBLIC_HOST = "zookfit.in";
const DEV_STAFF_HOST = "dashboard.localhost";
const DEV_PUBLIC_HOST = "localhost";
const canonicalRedirectHosts = new Set([
  "app.zookfit.in",
  "app.zook.kyokasuigetsu.xyz",
  "zook-gym-app.vercel.app",
]);

function originFromEnv(value: string | undefined) {
  if (!value?.trim()) {
    return undefined;
  }
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

function buildContentSecurityPolicy(nonce: string) {
  const scriptSources = [
    "'self'",
    `'nonce-${nonce}'`,
    "https://accounts.google.com",
    "https://appleid.cdn-apple.com",
    "https://maps.googleapis.com",
    "https://maps.gstatic.com",
    "https://checkout.razorpay.com",
  ];
  if (process.env.NODE_ENV === "development") {
    scriptSources.push("'unsafe-eval'");
  }
  const connectSources = new Set([
    "'self'",
    "https://checkout.razorpay.com",
    "https://api.razorpay.com",
    "https://*.ingest.sentry.io",
    "https://*.sentry.io",
  ]);
  for (const origin of [
    originFromEnv(process.env.NEXT_PUBLIC_APP_URL),
    originFromEnv(process.env.NEXT_PUBLIC_WEB_URL),
    originFromEnv(process.env.NEXT_PUBLIC_SENTRY_DSN),
  ]) {
    if (origin) {
      connectSources.add(origin);
    }
  }
  connectSources.add("https://zookfit.in");
  connectSources.add("https://dashboard.zookfit.in");
  if (process.env.NODE_ENV === "development") {
    connectSources.add("http://localhost:*");
    connectSources.add("http://dashboard.localhost:*");
    connectSources.add("http://127.0.0.1:*");
    connectSources.add("ws://localhost:*");
    connectSources.add("ws://dashboard.localhost:*");
    connectSources.add("ws://127.0.0.1:*");
  }

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "style-src-elem 'self' 'unsafe-inline'",
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    `connect-src ${Array.from(connectSources).join(" ")}`,
    "frame-src 'self' https:",
    "object-src 'none'",
  ].join("; ");
}

function classifyHost(hostname: string): "staff" | "public" | "unknown" {
  if (hostname === STAFF_HOST || hostname === DEV_STAFF_HOST || hostname.startsWith("dashboard.")) {
    return "staff";
  }
  if (hostname === PUBLIC_HOST || hostname === DEV_PUBLIC_HOST || hostname === "www.zookfit.in") {
    return "public";
  }
  return "unknown";
}

function isLocalHost(hostname: string) {
  return hostname === DEV_PUBLIC_HOST || hostname === DEV_STAFF_HOST;
}

function hostnameFromRequest(request: NextRequest) {
  return (
    request.headers.get("host")?.split(":")[0]?.trim().toLowerCase() ??
    request.nextUrl.hostname.toLowerCase()
  );
}

function portFromRequest(request: NextRequest) {
  return request.headers.get("host")?.match(/:(\d+)$/)?.[1] ?? request.nextUrl.port;
}

function redirectToHost(request: NextRequest, hostname: string) {
  const isLocalTarget = isLocalHost(hostname);
  const protocol = isLocalTarget ? "http" : "https";
  const port = isLocalTarget ? portFromRequest(request) : "";
  const origin = `${protocol}://${hostname}${port ? `:${port}` : ""}`;
  const pathAndSearch = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const redirectUrl = new URL(pathAndSearch, origin);
  return new NextResponse(null, {
    status: 308,
    headers: { Location: redirectUrl.toString() },
  });
}

function staffHostForRequest(request: NextRequest) {
  return isLocalHost(hostnameFromRequest(request)) ? DEV_STAFF_HOST : STAFF_HOST;
}

function publicHostForRequest(request: NextRequest) {
  return isLocalHost(hostnameFromRequest(request)) ? DEV_PUBLIC_HOST : PUBLIC_HOST;
}

function isStaffPrivatePath(pathname: string) {
  if (pathname === "/staff/invite" || pathname.startsWith("/staff/invite/")) {
    return false;
  }
  return pathBelongsToStaff(pathname);
}

export function middleware(request: NextRequest) {
  const hostname = hostnameFromRequest(request);
  if (canonicalRedirectHosts.has(hostname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.protocol = "https:";
    redirectUrl.hostname = canonicalHost;
    redirectUrl.port = "";
    return NextResponse.redirect(redirectUrl, 308);
  }

  const nonce = btoa(crypto.randomUUID());
  const contentSecurityPolicy = buildContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);
  const responseInit = { request: { headers: requestHeaders } };
  let response: NextResponse;
  const host = classifyHost(hostname);
  const expectedHost = expectedHostForPath(request.nextUrl.pathname);
  if (expectedHost === "dashboard" && host !== "staff") {
    return redirectToHost(request, staffHostForRequest(request));
  }
  if (expectedHost === "public" && host === "staff") {
    return redirectToHost(request, publicHostForRequest(request));
  }

  const hasSession = Boolean(request.cookies.get(sessionCookieName)?.value);
  const hasRefreshSession = Boolean(request.cookies.get(refreshSessionCookieName)?.value);
  const requiresStaffSession =
    isStaffPrivatePath(request.nextUrl.pathname) ||
    (host === "staff" && request.nextUrl.pathname === "/");
  if (requiresStaffSession && !hasSession) {
    const redirectTarget = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    if (hasRefreshSession) {
      const refreshUrl = new URL("/api/auth/refresh", request.url);
      refreshUrl.searchParams.set("redirect", redirectTarget);
      response = NextResponse.redirect(refreshUrl);
    } else {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", redirectTarget);
      response = NextResponse.redirect(loginUrl);
    }
  } else if (host === "staff" && request.nextUrl.pathname === "/") {
    const dashboardUrl = new URL("/dashboard", request.url);
    response = NextResponse.redirect(dashboardUrl);
  } else {
    response = NextResponse.next(responseInit);
  }
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|icons).*)"],
};
