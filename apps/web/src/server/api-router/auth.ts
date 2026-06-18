import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  requestOtpSchema,
  verifyOtpSchema,
  isQaDemoIdentifier,
  isQaFreshIdentifier,
  isSeededDemoIdentifier,
} from "@zook/core";
import { AuthService } from "@zook/core/services";
import { extractSessionToken, refreshSessionCookieName, sessionCookieName } from "../context";
import { getDevOtpResponseValue } from "../auth-response";
import { assertRateLimit } from "../rate-limit";
import { getClientIp } from "../security";
import { fail, ok, readJson } from "../response";
import { resolveSessionSummaryFromToken } from "../session";
import { writeAuditLog } from "../audit";
import {
  appleAuthCallbackSchema,
  assertLocalQaIdentityAllowed,
  clean,
  createAuthSessionResponse,
  createSeededDemoOtpChallenge,
  displayNameFromProvider,
  getAppleAuthAudiences,
  getAuthUserForVerifiedIdentifier,
  getDemoQaUserOrCreate,
  getEmailProviderOrThrow,
  getGoogleAuthAudiences,
  getSmsProviderOrThrow,
  getUserByIdentifierOrCreate,
  getUserBySsoIdentityOrCreate,
  googleAuthCallbackSchema,
  localSeededSimulatorAuthBypass,
  markUserIdentifierVerified,
  pathMatches,
  PrismaAuthRepo,
  providerEmailVerified,
  refreshAuthSession,
  setSessionCookie,
  sharedSessionCookieOptions,
  verifyRemoteJwt,
  serializeUserForClient,
} from "./core";

export async function handleAuth(request: NextRequest, path: string[]) {
  if (request.method === "POST" && pathMatches(path, ["auth", "request-otp"])) {
    const body = requestOtpSchema.parse(await readJson(request));
    const ipAddress = getClientIp(request);
    const seededDemoLogin = isSeededDemoIdentifier(body.identifier);
    if (!localSeededSimulatorAuthBypass(request, body.identifier)) {
      await assertRateLimit(
        "otpRequestByIdentifier",
        body.identifier.value,
        "Too many one-time code requests for this account.",
      );
      await assertRateLimit(
        "otpRequestByIp",
        ipAddress,
        "Too many one-time code requests from this IP.",
      );
    }
    if (seededDemoLogin) {
      const challenge = await createSeededDemoOtpChallenge({
        identifier: body.identifier,
        ...(ipAddress !== "unknown" ? { ipAddress } : {}),
      });
      return ok({
        challengeId: challenge.id,
        expiresAt: challenge.expiresAt,
      });
    }
    if (isQaFreshIdentifier(body.identifier)) {
      assertLocalQaIdentityAllowed();
    } else if (isQaDemoIdentifier(body.identifier)) {
      await getDemoQaUserOrCreate();
    } else {
      await getUserByIdentifierOrCreate(body.identifier);
    }
    const auth = new AuthService(
      new PrismaAuthRepo(),
      getEmailProviderOrThrow(),
      () => new Date(),
      body.identifier.kind === "phone" ? getSmsProviderOrThrow() : undefined,
    );
    const challenge = await auth.requestOtp(
      body.identifier,
      ipAddress !== "unknown" ? { ipAddress } : {},
    );
    return ok({
      challengeId: challenge.id,
      expiresAt: challenge.expiresAt,
      devOtp: getDevOtpResponseValue(),
    });
  }
  if (request.method === "POST" && pathMatches(path, ["auth", "verify-otp"])) {
    const body = verifyOtpSchema.parse(await readJson(request));
    const ipAddress = getClientIp(request);
    const auth = new AuthService(new PrismaAuthRepo(), getEmailProviderOrThrow());
    if (!localSeededSimulatorAuthBypass(request, body.identifier)) {
      await assertRateLimit(
        "otpVerifyByIdentifier",
        body.identifier.value,
        "Too many one-time code attempts for this account.",
      );
      await assertRateLimit(
        "otpVerifyByIp",
        ipAddress,
        "Too many one-time code attempts from this IP.",
      );
    }
    const user = await getAuthUserForVerifiedIdentifier(body.identifier);
    const session = await auth.verifyOtp(
      clean({
        identifier: body.identifier,
        code: body.code,
        userId: user.id,
        userAgent: request.headers.get("user-agent") ?? undefined,
        ipAddress,
      }),
    );
    await markUserIdentifierVerified(user.id, body.identifier);
    const sessionSummary = await resolveSessionSummaryFromToken(session.token);
    const response = ok({
      user: serializeUserForClient(user),
      token: session.token,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
      refreshExpiresAt: session.refreshExpiresAt,
      ...(sessionSummary ? { session: sessionSummary } : {}),
    });
    response.cookies.set(sessionCookieName, session.token, {
      ...sharedSessionCookieOptions(request, session.expiresAt),
    });
    response.cookies.set(refreshSessionCookieName, session.refreshToken, {
      ...sharedSessionCookieOptions(request, session.refreshExpiresAt),
    });
    return response;
  }
  if (request.method === "POST" && pathMatches(path, ["auth", "google", "callback"])) {
    const body = googleAuthCallbackSchema.parse(await readJson(request));
    const payload = await verifyRemoteJwt({
      token: body.idToken,
      jwksUrl: "https://www.googleapis.com/oauth2/v3/certs",
      issuers: ["https://accounts.google.com", "accounts.google.com"],
      audiences: getGoogleAuthAudiences(),
    });
    const email = typeof payload.email === "string" ? payload.email.toLowerCase() : null;
    const emailVerified = providerEmailVerified(payload);
    const user = await getUserBySsoIdentityOrCreate({
      provider: "GOOGLE",
      providerUserId: payload.sub as string,
      email,
      emailVerified,
      name: displayNameFromProvider({
        name: payload.name,
        email,
        fallback: "Zook member",
      }),
    });
    await writeAuditLog({
      request,
      actorUserId: user.id,
      action: "auth.google_login",
      entityType: "auth",
      entityId: user.id,
    });
    return createAuthSessionResponse(request, user);
  }
  if (request.method === "POST" && pathMatches(path, ["auth", "apple", "callback"])) {
    const body = appleAuthCallbackSchema.parse(await readJson(request));
    const payload = await verifyRemoteJwt({
      token: body.identityToken,
      jwksUrl: "https://appleid.apple.com/auth/keys",
      issuers: ["https://appleid.apple.com"],
      audiences: getAppleAuthAudiences(),
    });
    const email = typeof payload.email === "string" ? payload.email.toLowerCase() : null;
    const emailVerified = providerEmailVerified(payload);
    const user = await getUserBySsoIdentityOrCreate({
      provider: "APPLE",
      providerUserId: payload.sub as string,
      email,
      emailVerified,
      name: displayNameFromProvider({
        email,
        fallback: "Zook member",
        ...(body.fullName ? { explicitName: body.fullName } : {}),
      }),
    });
    await writeAuditLog({
      request,
      actorUserId: user.id,
      action: "auth.apple_login",
      entityType: "auth",
      entityId: user.id,
    });
    return createAuthSessionResponse(request, user);
  }
  if (request.method === "POST" && pathMatches(path, ["auth", "logout"])) {
    const token = extractSessionToken(request);
    if (token) {
      const auth = new AuthService(new PrismaAuthRepo(), getEmailProviderOrThrow());
      await auth.logout(token);
    }
    const logoutUrl = process.env.NEXT_PUBLIC_WEB_URL ?? "https://zookfit.in";
    const response = ok({ loggedOut: true, redirectUrl: new URL("/", logoutUrl).toString() });
    response.cookies.set(sessionCookieName, "", {
      ...sharedSessionCookieOptions(request, new Date(0)),
    });
    response.cookies.set(refreshSessionCookieName, "", {
      ...sharedSessionCookieOptions(request, new Date(0)),
    });
    response.cookies.set(refreshSessionCookieName, "", {
      ...sharedSessionCookieOptions(request, new Date(0), "/api/auth/refresh"),
    });
    return response;
  }
  if (request.method === "GET" && pathMatches(path, ["auth", "refresh"])) {
    const redirectTarget = request.nextUrl.searchParams.get("redirect");
    const safeRedirect =
      redirectTarget?.startsWith("/") && !redirectTarget.startsWith("//")
        ? redirectTarget
        : "/dashboard";
    try {
      const session = await refreshAuthSession(
        request.cookies.get(refreshSessionCookieName)?.value ?? "",
      );
      const response = NextResponse.redirect(new URL(safeRedirect, request.url));
      setSessionCookie(response, request, session.token, session.expiresAt);
      return response;
    } catch {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", safeRedirect);
      loginUrl.searchParams.set("reason", "expired");
      return NextResponse.redirect(loginUrl);
    }
  }
  if (request.method === "POST" && pathMatches(path, ["auth", "refresh"])) {
    const body = await readJson(request).catch(() => ({}));
    const refreshToken =
      typeof body === "object" && body && "refreshToken" in body
        ? String((body as { refreshToken?: unknown }).refreshToken ?? "")
        : (request.cookies.get(refreshSessionCookieName)?.value ?? "");
    const session = await refreshAuthSession(refreshToken);
    const response = ok(session);
    setSessionCookie(response, request, session.token, session.expiresAt);
    return response;
  }
  if (
    request.method === "GET" &&
    (pathMatches(path, ["auth", "me"]) ||
      pathMatches(path, ["auth", "session"]) ||
      pathMatches(path, ["auth", "sessions"]))
  ) {
    const token = extractSessionToken(request);
    const summary = await resolveSessionSummaryFromToken(
      token,
      request.headers.get("x-zook-org-id") ??
        request.nextUrl.searchParams.get("orgId") ??
        undefined,
    );
    if (!summary) {
      return fail("UNAUTHORIZED", "Authentication required", 401);
    }
    return ok(summary);
  }
  return undefined;
}
