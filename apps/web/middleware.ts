import { NextResponse, type NextRequest } from "next/server";

const sessionCookieName = "zook_session";

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
  if (process.env.NODE_ENV === "development") {
    connectSources.add("http://localhost:*");
    connectSources.add("http://127.0.0.1:*");
    connectSources.add("ws://localhost:*");
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

export function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const contentSecurityPolicy = buildContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);
  const responseInit = { request: { headers: requestHeaders } };
  let response: NextResponse;
  const hasSession = Boolean(request.cookies.get(sessionCookieName)?.value);
  if (request.nextUrl.pathname.startsWith("/platform") && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    response = NextResponse.redirect(loginUrl);
  } else {
    response = NextResponse.next(responseInit);
  }
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|icons).*)"],
};
