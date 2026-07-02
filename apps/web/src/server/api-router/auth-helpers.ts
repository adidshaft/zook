import { createHash, createPublicKey, createVerify, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getAppEnv,
  isInternalPhoneEmail,
  isQaDemoIdentifier,
  isQaFreshIdentifier,
  isSeededDemoIdentifier,
  publicUserEmail,
  QA_DEMO_ACCOUNT_EMAIL,
  QA_DEMO_ACCOUNT_PHONE,
  QA_TEST_OTP,
} from "@zook/core";
import { AuthService, type OtpChallengeRecord } from "@zook/core/services";
import { Prisma, prisma } from "@zook/db";

import { refreshSessionCookieName, sessionCookieName } from "../context";
import { conflictError, serviceUnavailableError, unauthorizedError, validationError } from "../errors";
import { createUniqueMemberSlug } from "../member-slug";
import { privateUserHandle } from "../private-user-handle";
import { ok } from "../response";
import { getClientIp } from "../security";
import { resolveSessionSummaryFromToken } from "../session";

function cleanObject<T extends Record<string, unknown>>(input: T): any {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function isHttpsRequest(request: NextRequest) {
  return (
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase() === "https"
  );
}

function shouldUseSecureSessionCookie(request: NextRequest) {
  const appEnv = getAppEnv();
  if (appEnv !== "local" && !isHttpsRequest(request)) {
    throw serviceUnavailableError(
      "HTTPS is required for session cookies outside local environments.",
    );
  }
  return appEnv !== "local" || isHttpsRequest(request);
}

function sessionCookieDomain() {
  return process.env.NODE_ENV === "production" ? ".zookfit.in" : undefined;
}

export function sharedSessionCookieOptions(request: NextRequest, expires: Date, path = "/") {
  const domain = sessionCookieDomain();
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: shouldUseSecureSessionCookie(request),
    expires,
    path,
    ...(domain ? { domain } : {}),
  };
}

type SessionCookieOptions = ReturnType<typeof sharedSessionCookieOptions>;

function serializeCookie(name: string, value: string, options: SessionCookieOptions) {
  const parts = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    `Path=${options.path}`,
    `Expires=${options.expires.toUTCString()}`,
    "SameSite=Lax",
  ];
  if ("domain" in options && options.domain) {
    parts.push(`Domain=${options.domain}`);
  }
  if (options.httpOnly) {
    parts.push("HttpOnly");
  }
  if (options.secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

function setScopedSessionCookie(
  response: NextResponse,
  request: NextRequest,
  name: typeof sessionCookieName | typeof refreshSessionCookieName,
  value: string,
  expiresAt: Date,
  path = "/",
) {
  const options = sharedSessionCookieOptions(request, expiresAt, path);
  response.headers.append("Set-Cookie", serializeCookie(name, value, options));
  if ("domain" in options && options.domain) {
    const { domain: _domain, ...hostOnlyOptions } = options;
    response.headers.append("Set-Cookie", serializeCookie(name, value, hostOnlyOptions));
  }
}

export function setSessionCookie(
  response: NextResponse,
  request: NextRequest,
  token: string,
  expiresAt: Date,
) {
  setScopedSessionCookie(response, request, sessionCookieName, token, expiresAt);
}

export function setRefreshSessionCookie(
  response: NextResponse,
  request: NextRequest,
  refreshToken: string,
  expiresAt: Date,
  path = "/",
) {
  setScopedSessionCookie(response, request, refreshSessionCookieName, refreshToken, expiresAt, path);
}

export function clearAuthCookies(response: NextResponse, request: NextRequest) {
  const expired = new Date(0);
  setSessionCookie(response, request, "", expired);
  setRefreshSessionCookie(response, request, "", expired);
  setRefreshSessionCookie(response, request, "", expired, "/api/auth/refresh");
}

async function getUserByEmailOrCreate(email: string) {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: email.split("@")[0] ?? "Zook User",
      slug: await createUniqueMemberSlug(),
    },
  });
}

function buildPhonePlaceholderEmail(phone: string) {
  return `phone-${sha256(phone).slice(0, 20)}@phone.zook.local`;
}

function nameFromPhone(phone: string) {
  return `Member ${phone.slice(-4)}`;
}

export function serializeUserForClient<T extends { id: string; email: string; phone?: string | null }>(
  user: T,
) {
  const userWithSlug = user as T & { slug?: string | null };
  return {
    ...user,
    email: publicUserEmail(user.email) ?? "",
    slug: userWithSlug.slug ?? undefined,
    privateHandle: privateUserHandle(user.id),
  };
}

async function findSingleUserByPhone(phone: string) {
  const matches = await prisma.user.findMany({
    where: { phone },
    orderBy: { createdAt: "asc" },
    take: 2,
  });
  if (matches.length > 1) {
    throw conflictError(
      "This phone number is linked to multiple accounts. Please sign in with email or contact support.",
    );
  }
  return matches[0] ?? null;
}

async function getUserByPhoneOrCreate(phone: string) {
  const existing = await findSingleUserByPhone(phone);
  if (existing) {
    if (!existing.phoneVerifiedAt && !isInternalPhoneEmail(existing.email)) {
      throw validationError(
        "This phone number is not verified yet. Sign in with email and verify it in Settings.",
      );
    }
    return existing;
  }
  return prisma.user.create({
    data: {
      email: buildPhonePlaceholderEmail(phone),
      name: nameFromPhone(phone),
      slug: await createUniqueMemberSlug(),
      phone,
    },
  });
}

export async function getUserByIdentifierOrCreate(identifier: {
  kind: "email" | "phone";
  value: string;
}) {
  return identifier.kind === "email"
    ? getUserByEmailOrCreate(identifier.value)
    : getUserByPhoneOrCreate(identifier.value);
}

function parseCsvEnv(...names: string[]) {
  return names
    .flatMap((name) => (process.env[name] ?? "").split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

export function getGoogleAuthAudiences() {
  return Array.from(
    new Set(
      parseCsvEnv(
        "GOOGLE_OAUTH_CLIENT_ID",
        "GOOGLE_WEB_CLIENT_ID",
        "NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID",
        "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID",
        "GOOGLE_IOS_CLIENT_ID",
        "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID",
        "GOOGLE_ANDROID_CLIENT_ID",
        "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID",
      ),
    ),
  );
}

export function getAppleAuthAudiences() {
  return Array.from(
    new Set([
      ...parseCsvEnv(
        "APPLE_CLIENT_ID",
        "APPLE_SERVICE_ID",
        "NEXT_PUBLIC_APPLE_CLIENT_ID",
        "EXPO_PUBLIC_APPLE_CLIENT_ID",
        "APPLE_BUNDLE_ID",
        "IOS_BUNDLE_ID",
      ),
      "com.zook.app",
    ]),
  );
}

function decodeBase64UrlJson(value: string) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Record<string, unknown>;
}

export async function verifyRemoteJwt(input: {
  token: string;
  jwksUrl: string;
  issuers: string[];
  audiences: string[];
}) {
  if (!input.audiences.length) {
    throw serviceUnavailableError("Sign-in provider is not configured.");
  }
  const parts = input.token.split(".");
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    throw unauthorizedError("Invalid sign-in token.");
  }
  const header = decodeBase64UrlJson(parts[0]);
  const payload = decodeBase64UrlJson(parts[1]);
  if ((header.alg !== "RS256" && header.alg !== "ES256") || typeof header.kid !== "string") {
    throw unauthorizedError("Invalid sign-in token.");
  }
  const response = await fetch(input.jwksUrl, { cache: "force-cache" });
  if (!response.ok) {
    throw serviceUnavailableError("Sign-in provider is temporarily unavailable.");
  }
  const jwks = (await response.json()) as { keys?: Array<Record<string, unknown>> };
  const jwk = jwks.keys?.find((key) => key.kid === header.kid);
  if (!jwk) {
    throw unauthorizedError("Invalid sign-in token.");
  }
  const verifier = createVerify(header.alg === "RS256" ? "RSA-SHA256" : "SHA256");
  verifier.update(`${parts[0]}.${parts[1]}`);
  verifier.end();
  const signatureValid = verifier.verify(
    createPublicKey({ key: jwk as any, format: "jwk" }),
    Buffer.from(parts[2], "base64url"),
  );
  if (!signatureValid) {
    throw unauthorizedError("Invalid sign-in token.");
  }
  const issuer = typeof payload.iss === "string" ? payload.iss : "";
  if (!input.issuers.includes(issuer)) {
    throw unauthorizedError("Invalid sign-in issuer.");
  }
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.some((value) => typeof value === "string" && input.audiences.includes(value))) {
    throw unauthorizedError("Invalid sign-in audience.");
  }
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp <= nowSeconds) {
    throw unauthorizedError("Sign-in token expired.");
  }
  if (typeof payload.sub !== "string" || !payload.sub) {
    throw unauthorizedError("Sign-in token is missing an account id.");
  }
  return payload;
}

export function providerEmailVerified(payload: Record<string, unknown>) {
  return payload.email_verified === true || payload.email_verified === "true";
}

export function displayNameFromProvider(input: {
  explicitName?: string;
  name?: unknown;
  email?: string | null;
  fallback: string;
}) {
  const explicit = input.explicitName?.trim();
  if (explicit) {
    return explicit;
  }
  if (typeof input.name === "string" && input.name.trim()) {
    return input.name.trim().slice(0, 160);
  }
  if (input.email) {
    return input.email.split("@")[0] || input.fallback;
  }
  return input.fallback;
}

export async function getUserBySsoIdentityOrCreate(input: {
  provider: "APPLE" | "GOOGLE";
  providerUserId: string;
  email?: string | null;
  emailVerified: boolean;
  name: string;
}) {
  const identity = await prisma.authIdentity.findUnique({
    where: {
      provider_providerUserId: {
        provider: input.provider,
        providerUserId: input.providerUserId,
      },
    },
  });
  if (identity) {
    return prisma.user.findUniqueOrThrow({ where: { id: identity.userId } });
  }
  if (!input.email || !input.emailVerified) {
    throw validationError("This sign-in provider did not share a verified email address.");
  }
  const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
  const user =
    existingUser ??
    (await prisma.user.create({
      data: {
        email: input.email,
        emailVerifiedAt: new Date(),
        name: input.name,
        slug: await createUniqueMemberSlug(),
      },
    }));
  if (!user.emailVerifiedAt) {
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    });
  }
  await prisma.authIdentity.create({
    data: {
      userId: user.id,
      provider: input.provider,
      providerUserId: input.providerUserId,
      email: input.email,
      emailVerified: input.emailVerified,
    },
  });
  return user;
}

export async function createAuthSessionResponse(
  request: NextRequest,
  user: Awaited<ReturnType<typeof getUserByEmailOrCreate>>,
) {
  const token = AuthService.createToken();
  const refreshToken = AuthService.createToken();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get("user-agent") ?? undefined;
  await new PrismaAuthRepo().createSession({
    userId: user.id,
    tokenHash: AuthService.hash(token),
    refreshTokenHash: AuthService.hash(refreshToken),
    expiresAt,
    refreshExpiresAt,
    deviceFingerprintHash: AuthService.createDeviceFingerprint(cleanObject({ userAgent, ipAddress })),
    ...(userAgent ? { userAgent } : {}),
    ipAddress,
  });
  const sessionSummary = await resolveSessionSummaryFromToken(token);
  const response = ok({
    user: serializeUserForClient(user),
    token,
    refreshToken,
    expiresAt,
    refreshExpiresAt,
    ...(sessionSummary ? { session: sessionSummary } : {}),
  });
  setSessionCookie(response, request, token, expiresAt);
  setRefreshSessionCookie(response, request, refreshToken, refreshExpiresAt);
  return response;
}

export async function refreshAuthSession(refreshToken: string) {
  if (!refreshToken) {
    throw unauthorizedError("Refresh token required");
  }
  const now = new Date();
  const currentSession = await prisma.userSession.findFirst({
    where: {
      refreshTokenHash: AuthService.hash(refreshToken),
      revokedAt: null,
      refreshExpiresAt: { gt: now },
    },
  });
  if (!currentSession) {
    throw unauthorizedError("Refresh token expired");
  }
  const token = AuthService.createToken();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await prisma.userSession.update({
    where: { id: currentSession.id },
    data: { tokenHash: AuthService.hash(token), expiresAt, lastSeenAt: now },
  });
  const sessionSummary = await resolveSessionSummaryFromToken(token);
  return {
    token,
    refreshToken,
    expiresAt,
    refreshExpiresAt: currentSession.refreshExpiresAt,
    ...(sessionSummary ? { session: sessionSummary } : {}),
  };
}

function localQaIdentitiesAllowed() {
  return (
    process.env.APP_ENV === "local" ||
    process.env.ENV_PROFILE === "local" ||
    process.env.NODE_ENV !== "production"
  );
}

export function assertLocalQaIdentityAllowed() {
  if (!localQaIdentitiesAllowed()) {
    throw validationError("Fresh QA identities are only available in local development.");
  }
}

export function localSeededSimulatorAuthBypass(
  request: NextRequest,
  identifier: { kind: "email" | "phone"; value: string },
) {
  return (
    localQaIdentitiesAllowed() &&
    request.headers.get("x-zook-qa-auth") === "simulator" &&
    isSeededDemoIdentifier(identifier)
  );
}

async function createFreshQaUser(identifier: { kind: "email" | "phone"; value: string }) {
  assertLocalQaIdentityAllowed();
  const nonce = `${Date.now().toString(36)}${randomBytes(4).toString("hex")}`;
  return prisma.user.create({
    data: {
      email:
        identifier.kind === "email"
          ? `fresh+${nonce}@zook.local`
          : `fresh-phone+${nonce}@zook.local`,
      name: "Fresh QA User",
      slug: await createUniqueMemberSlug(),
      ...(identifier.kind === "phone"
        ? { phone: identifier.value, phoneVerifiedAt: new Date() }
        : {}),
      ...(identifier.kind === "email" ? { emailVerifiedAt: new Date() } : {}),
      marketingOptIn: false,
      aiConsent: false,
    },
  });
}

export async function getDemoQaUserOrCreate() {
  const existing = await prisma.user.findUnique({ where: { email: QA_DEMO_ACCOUNT_EMAIL } });
  const data = {
    phone: QA_DEMO_ACCOUNT_PHONE,
    emailVerifiedAt: new Date(),
    phoneVerifiedAt: new Date(),
  };
  if (existing) {
    return prisma.user.update({ where: { id: existing.id }, data });
  }
  return prisma.user.create({
    data: {
      email: QA_DEMO_ACCOUNT_EMAIL,
      name: "Nisha Member",
      slug: await createUniqueMemberSlug(),
      ...data,
    },
  });
}

async function getSeededDemoUserOrThrow(identifier: { kind: "email" | "phone"; value: string }) {
  const user =
    identifier.kind === "email"
      ? await prisma.user.findUnique({ where: { email: identifier.value.toLowerCase() } })
      : await prisma.user.findFirst({ where: { phone: identifier.value } });
  if (!user) {
    throw validationError("Demo account is not seeded yet.");
  }
  return user;
}

export async function createSeededDemoOtpChallenge(input: {
  identifier: { kind: "email" | "phone"; value: string };
  ipAddress?: string;
}) {
  const user = await getSeededDemoUserOrThrow(input.identifier);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);
  const row = await prisma.otpChallenge.create({
    data: {
      email: user.email,
      identifier: input.identifier.value,
      channel: input.identifier.kind,
      ...(input.identifier.kind === "phone" ? { phone: input.identifier.value } : {}),
      purpose: "login",
      codeHash: AuthService.hash(QA_TEST_OTP),
      maxAttempts: 5,
      expiresAt,
      createdAt: now,
      ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
    },
  });
  return {
    id: row.id,
    expiresAt: row.expiresAt,
  };
}

export async function getAuthUserForVerifiedIdentifier(identifier: {
  kind: "email" | "phone";
  value: string;
}) {
  if (isSeededDemoIdentifier(identifier)) {
    return getSeededDemoUserOrThrow(identifier);
  }
  if (isQaFreshIdentifier(identifier)) {
    return createFreshQaUser(identifier);
  }
  if (isQaDemoIdentifier(identifier)) {
    return getDemoQaUserOrCreate();
  }
  return getUserByIdentifierOrCreate(identifier);
}

export async function markUserIdentifierVerified(
  userId: string,
  identifier: { kind: "email" | "phone"; value: string },
) {
  if (identifier.kind === "email") {
    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerifiedAt: new Date(),
      },
    });
    return;
  }
  await prisma.user.update({
    where: { id: userId },
    data: {
      phone: identifier.value,
      phoneVerifiedAt: new Date(),
    },
  });
}

export function contactOtpPurpose(userId: string, kind: "email" | "phone") {
  return `contact_update:${userId}:${kind}`;
}

export async function assertContactIdentifierAvailable(
  userId: string,
  identifier: { kind: "email" | "phone"; value: string },
) {
  if (identifier.kind === "email") {
    const duplicate = await prisma.user.findUnique({ where: { email: identifier.value } });
    if (duplicate && duplicate.id !== userId) {
      throw conflictError("This email is already linked to another Zook account.");
    }
    return;
  }
  const duplicate = await prisma.user.findFirst({
    where: { phone: identifier.value, NOT: { id: userId } },
  });
  if (duplicate) {
    throw conflictError("This phone number is already linked to another Zook account.");
  }
}

export class PrismaAuthRepo {
  private toOtpRecord(row: {
    id: string;
    email: string;
    identifier: string;
    channel: string;
    phone: string | null;
    purpose: string;
    codeHash: string;
    attempts: number;
    maxAttempts: number;
    resendCount: number;
    ipFailureCount: number;
    lockedUntil: Date | null;
    ipAddress: string | null;
    consumedAt: Date | null;
    expiresAt: Date;
    createdAt: Date;
  }): OtpChallengeRecord {
    return cleanObject({
      id: row.id,
      email: row.email,
      identifier: row.identifier,
      channel: row.channel === "phone" ? "phone" : "email",
      phone: row.phone ?? undefined,
      purpose: row.purpose,
      codeHash: row.codeHash,
      attempts: row.attempts,
      maxAttempts: row.maxAttempts,
      resendCount: row.resendCount,
      ipFailureCount: row.ipFailureCount,
      lockedUntil: row.lockedUntil ?? undefined,
      ipAddress: row.ipAddress ?? undefined,
      consumedAt: row.consumedAt ?? undefined,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
    }) as OtpChallengeRecord;
  }

  async createOtp(input: {
    email: string;
    identifier: string;
    channel: "email" | "phone";
    phone?: string;
    purpose: string;
    codeHash: string;
    maxAttempts: number;
    expiresAt: Date;
    consumedAt?: Date;
    ipAddress?: string;
    createdAt: Date;
  }): Promise<OtpChallengeRecord> {
    const row = await prisma.otpChallenge.create({
      data: {
        email: input.email,
        identifier: input.identifier,
        channel: input.channel,
        ...(input.phone ? { phone: input.phone } : {}),
        purpose: input.purpose,
        codeHash: input.codeHash,
        maxAttempts: input.maxAttempts,
        expiresAt: input.expiresAt,
        createdAt: input.createdAt,
        ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
        ...(input.consumedAt ? { consumedAt: input.consumedAt } : {}),
      },
    });
    return this.toOtpRecord(row);
  }

  async findLatestOtp(
    identifier: string,
    purpose = "login",
  ): Promise<OtpChallengeRecord | undefined> {
    const row = await prisma.otpChallenge.findFirst({
      where: { identifier, purpose },
      orderBy: { createdAt: "desc" },
    });
    return row ? this.toOtpRecord(row) : undefined;
  }

  async recordOtpFailure(input: { id: string; failureCount: number; lockedUntil?: Date }) {
    await prisma.otpChallenge.update({
      where: { id: input.id },
      data: {
        attempts: { increment: 1 },
        ipFailureCount: input.failureCount,
        ...(input.lockedUntil ? { lockedUntil: input.lockedUntil } : {}),
      },
    });
  }

  async refreshOtp(input: { id: string; codeHash: string; expiresAt: Date; ipAddress?: string }) {
    const row = await prisma.otpChallenge.update({
      where: { id: input.id },
      data: {
        codeHash: input.codeHash,
        expiresAt: input.expiresAt,
        attempts: 0,
        ipFailureCount: 0,
        lockedUntil: null,
        resendCount: { increment: 1 },
        createdAt: new Date(),
        ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
      },
    });
    return this.toOtpRecord(row);
  }

  async consumeOtp(id: string) {
    await prisma.otpChallenge.update({ where: { id }, data: { consumedAt: new Date() } });
  }

  async createSession(input: {
    userId: string;
    tokenHash: string;
    refreshTokenHash?: string;
    expiresAt: Date;
    refreshExpiresAt?: Date;
    userAgent?: string;
    ipAddress?: string;
    deviceFingerprintHash?: string;
  }) {
    const existingSessions = await prisma.userSession.findMany({
      where: {
        userId: input.userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true, deviceFingerprintHash: true },
      take: 50,
    });
    const isNewDevice = Boolean(
      input.deviceFingerprintHash &&
      existingSessions.length > 0 &&
      !existingSessions.some(
        (session) => session.deviceFingerprintHash === input.deviceFingerprintHash,
      ),
    );
    const session = await prisma.userSession.create({
      data: {
        ...input,
        ...(isNewDevice ? { newDeviceNotifiedAt: new Date() } : {}),
        lastSeenAt: new Date(),
      },
    });
    if (!isNewDevice) {
      return;
    }
    const notification = await prisma.notification.create({
      data: {
        createdById: input.userId,
        type: "SECURITY",
        status: "SENT",
        title: "New device signed in",
        body: "A new device signed in to your Zook account. If this was not you, sign out and contact support.",
        audience: "selected",
        sentAt: new Date(),
        metadata: cleanObject({
          sessionId: session.id,
          deviceFingerprintHash: input.deviceFingerprintHash,
        }) as Prisma.InputJsonValue,
      },
    });
    await prisma.notificationRecipient.create({
      data: {
        notificationId: notification.id,
        userId: input.userId,
        deliveryStatus: "in_app",
        deliveredAt: new Date(),
      },
    });
  }

  async revokeSession(tokenHash: string) {
    await prisma.userSession.updateMany({
      where: { OR: [{ tokenHash }, { refreshTokenHash: tokenHash }] },
      data: { revokedAt: new Date() },
    });
  }

  async recordSecurityEvent(input: {
    action: string;
    userId?: string;
    identifier?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }) {
    await prisma.auditLog.create({
      data: cleanObject({
        actorUserId: input.userId,
        action: input.action,
        entityType: "auth",
        entityId: input.userId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        riskLevel: "HIGH",
        metadata: cleanObject({
          identifierHash: input.identifier ? sha256(input.identifier) : undefined,
          ...(input.metadata ?? {}),
        }) as Prisma.InputJsonValue,
      }),
    });
  }
}
