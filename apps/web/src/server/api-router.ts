import { randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  attendanceScanSchema,
  checkoutSchema,
  couponSchema,
  createOrganizationSchema,
  membershipPlanSchema,
  notificationSchema,
  requestOtpSchema,
  verifyOtpSchema,
  type AIRequestType,
  type Role
} from "@zook/core";
import { MockAIProvider, MockEmailProvider, MockMapProvider } from "@zook/core/providers";
import {
  AuthService,
  type OtpChallengeRecord,
  applyCoupon,
  createSignedQrToken,
  createTrialWindow,
  decideAttendanceStatus,
  defaultAIQuotaForRole,
  encodeQrPayload,
  normalizeUsername,
  runAIGuardedRequest
} from "@zook/core/services";
import { Prisma, prisma } from "@zook/db";
import { extractSessionToken, sessionCookieName } from "./context";
import { getRequestContext, requireAuth, requireOrgPermission, requirePlatformAdmin } from "./access";
import { forbiddenError, notFoundError, toErrorResponse } from "./errors";
import { fail, ok, readJson } from "./response";
import { resolveSessionSummaryFromToken } from "./session";
import { writeAuditLog } from "./audit";

const emailProvider = new MockEmailProvider();
const mapProvider = new MockMapProvider();
const aiProvider = new MockAIProvider();

function clean<T extends Record<string, unknown>>(input: T): any {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function dateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function pathMatches(path: string[], pattern: Array<string | RegExp>) {
  if (path.length !== pattern.length) {
    return false;
  }
  return pattern.every((part, index) =>
    typeof part === "string" ? part === path[index] : part.test(path[index] ?? ""),
  );
}

async function getUserByEmailOrCreate(email: string) {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: email.split("@")[0] ?? "Zook User",
      emailVerifiedAt: new Date()
    }
  });
}

class PrismaAuthRepo {
  private toOtpRecord(row: {
    id: string;
    email: string;
    codeHash: string;
    attempts: number;
    maxAttempts: number;
    resendCount: number;
    ipAddress: string | null;
    consumedAt: Date | null;
    expiresAt: Date;
    createdAt: Date;
  }): OtpChallengeRecord {
    return clean({
      id: row.id,
      email: row.email,
      codeHash: row.codeHash,
      attempts: row.attempts,
      maxAttempts: row.maxAttempts,
      resendCount: row.resendCount,
      ipAddress: row.ipAddress ?? undefined,
      consumedAt: row.consumedAt ?? undefined,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt
    }) as OtpChallengeRecord;
  }

  async createOtp(input: {
    email: string;
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
        codeHash: input.codeHash,
        maxAttempts: input.maxAttempts,
        expiresAt: input.expiresAt,
        createdAt: input.createdAt,
        ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
        ...(input.consumedAt ? { consumedAt: input.consumedAt } : {})
      }
    });
    return this.toOtpRecord(row);
  }

  async findLatestOtp(email: string): Promise<OtpChallengeRecord | undefined> {
    const row = await prisma.otpChallenge.findFirst({ where: { email }, orderBy: { createdAt: "desc" } });
    return row ? this.toOtpRecord(row) : undefined;
  }

  async incrementOtpAttempt(id: string) {
    await prisma.otpChallenge.update({ where: { id }, data: { attempts: { increment: 1 } } });
  }

  async refreshOtp(input: { id: string; codeHash: string; expiresAt: Date; ipAddress?: string }) {
    const row = await prisma.otpChallenge.update({
      where: { id: input.id },
      data: {
        codeHash: input.codeHash,
        expiresAt: input.expiresAt,
        attempts: 0,
        resendCount: { increment: 1 },
        createdAt: new Date(),
        ...(input.ipAddress ? { ipAddress: input.ipAddress } : {})
      }
    });
    return this.toOtpRecord(row);
  }

  async consumeOtp(id: string) {
    await prisma.otpChallenge.update({ where: { id }, data: { consumedAt: new Date() } });
  }

  async createSession(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }) {
    await prisma.userSession.create({ data: input });
  }

  async revokeSession(tokenHash: string) {
    await prisma.userSession.updateMany({ where: { tokenHash }, data: { revokedAt: new Date() } });
  }
}

async function handleAuth(request: NextRequest, path: string[]) {
  const auth = new AuthService(new PrismaAuthRepo(), emailProvider);
  if (request.method === "POST" && pathMatches(path, ["auth", "request-otp"])) {
    const body = requestOtpSchema.parse(await readJson(request));
    await getUserByEmailOrCreate(body.email);
    const ipAddress = request.headers.get("x-forwarded-for") ?? undefined;
    const challenge = await auth.requestOtp(body.email, ipAddress ? { ipAddress } : {});
    return ok({
      challengeId: challenge.id,
      expiresAt: challenge.expiresAt,
      devOtp:
        process.env.NODE_ENV === "development" && process.env.OTP_FIXED_CODE_DEV
          ? process.env.OTP_FIXED_CODE_DEV
          : undefined
    });
  }
  if (request.method === "POST" && pathMatches(path, ["auth", "verify-otp"])) {
    const body = verifyOtpSchema.parse(await readJson(request));
    const user = await getUserByEmailOrCreate(body.email);
    const session = await auth.verifyOtp(clean({
      email: body.email,
      code: body.code,
      userId: user.id,
      userAgent: request.headers.get("user-agent") ?? undefined,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined
    }));
    const sessionSummary = await resolveSessionSummaryFromToken(session.token);
    const response = ok({
      user,
      token: session.token,
      expiresAt: session.expiresAt,
      ...(sessionSummary ? { session: sessionSummary } : {})
    });
    response.cookies.set(sessionCookieName, session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      expires: session.expiresAt,
      path: "/"
    });
    return response;
  }
  if (request.method === "POST" && pathMatches(path, ["auth", "logout"])) {
    const token = extractSessionToken(request);
    if (token) {
      await auth.logout(token);
    }
    const response = ok({ loggedOut: true });
    response.cookies.delete(sessionCookieName);
    return response;
  }
  if (
    request.method === "GET" &&
    (pathMatches(path, ["auth", "me"]) || pathMatches(path, ["auth", "session"]))
  ) {
    const token = extractSessionToken(request);
    const summary = await resolveSessionSummaryFromToken(
      token,
      request.headers.get("x-zook-org-id") ?? request.nextUrl.searchParams.get("orgId") ?? undefined
    );
    if (!summary) {
      return fail("UNAUTHORIZED", "Authentication required", 401);
    }
    return ok(summary);
  }
  return undefined;
}

async function handleOrganizations(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["orgs", "public", "search"])) {
    const query = request.nextUrl.searchParams.get("q") ?? "";
    const city = request.nextUrl.searchParams.get("city") ?? undefined;
    const gyms = await prisma.organization.findMany({
      where: {
        visibility: "PUBLIC",
        ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { username: { contains: query, mode: "insensitive" } }
              ]
            }
          : {})
      },
      take: 25
    });
    return ok({ gyms });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", "public", /.+/])) {
    const username = path[2]!;
    const org = await prisma.organization.findUnique({ where: { username } });
    if (!org || org.visibility === "HIDDEN") {
      return fail("NOT_FOUND", "Gym not found", 404);
    }
    const plans = await prisma.membershipPlan.findMany({
      where: { orgId: org.id, active: true, publicVisible: true },
      take: 10
    });
    return ok({ org, plans });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const body = createOrganizationSchema.parse(await readJson(request));
    const username = normalizeUsername(body.username);
    const trial = createTrialWindow();
    const org = await prisma.$transaction(async (tx) => {
      const created = await tx.organization.create({
        data: clean({
          name: body.name,
          username,
          contactPhone: body.contactPhone,
          contactEmail: body.contactEmail,
          address: body.address,
          city: body.city,
          state: body.state,
          pincode: body.pincode,
          latitude: body.latitude ? new Prisma.Decimal(body.latitude) : undefined,
          longitude: body.longitude ? new Prisma.Decimal(body.longitude) : undefined,
          locationSource: "MANUAL",
          amenities: body.amenities,
          visibility: body.visibility,
          joinMode: body.joinMode,
          trialStartAt: trial.trialStartAt,
          trialEndAt: trial.trialEndAt,
          createdByUserId: userId
        })
      });
      const branch = await tx.branch.create({
        data: {
          orgId: created.id,
          name: `${created.name} Main`,
          address: created.address,
          city: created.city,
          state: created.state,
          pincode: created.pincode,
          latitude: created.latitude,
          longitude: created.longitude,
          isDefault: true
        }
      });
      await tx.organizationUser.create({ data: { orgId: created.id, userId } });
      await tx.organizationRoleAssignment.create({
        data: { orgId: created.id, userId, role: "OWNER", assignedById: userId }
      });
      await tx.saaSSubscription.create({
        data: { orgId: created.id, trialStartAt: trial.trialStartAt, trialEndAt: trial.trialEndAt }
      });
      await tx.organizationSetting.create({
        data: { orgId: created.id, keyValues: { defaultBranchId: branch.id, attendanceMode: "EXCEPTION_APPROVAL" } }
      });
      return created;
    });
    await writeAuditLog({
      request,
      orgId: org.id,
      actorUserId: userId,
      action: "organization.created",
      entityType: "organization",
      entityId: org.id,
      metadata: { username: org.username }
    });
    return ok({ org });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", "current"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const membership = await prisma.organizationUser.findFirst({ where: { userId, status: "active" } });
    if (!membership) {
      return ok({ org: null });
    }
    return ok({ org: await prisma.organization.findUnique({ where: { id: membership.orgId } }) });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "location", "resolve"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_LOCATION");
    const body = (await readJson(request)) as { googleMapsUrl?: string; address?: string; city?: string; state?: string; pincode?: string };
    const result = body.googleMapsUrl
      ? await mapProvider.resolveGoogleMapsLink(body.googleMapsUrl)
      : await mapProvider.geocodeAddress({
          address: body.address ?? "Manual address",
          city: body.city ?? "Pune",
          state: body.state ?? "Maharashtra",
          pincode: body.pincode ?? "411001"
        });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "organization.location_resolved",
      entityType: "organization",
      entityId: orgId,
      metadata: body
    });
    return ok({ location: result });
  }
  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "join-mode"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_PROFILE");
    const body = (await readJson(request)) as { joinMode: "OPEN_JOIN" | "APPROVAL_REQUIRED" | "INVITE_ONLY" };
    const org = await prisma.organization.update({ where: { id: orgId }, data: { joinMode: body.joinMode } });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "organization.join_mode_updated",
      entityType: "organization",
      entityId: org.id,
      metadata: { joinMode: body.joinMode }
    });
    return ok({ org });
  }
  return undefined;
}

async function handleMembershipPayments(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "membership-plans"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "MEMBERSHIP_PLAN_MANAGE");
    return ok({ plans: await prisma.membershipPlan.findMany({ where: { orgId }, orderBy: { createdAt: "desc" } }) });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "membership-plans"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "MEMBERSHIP_PLAN_MANAGE");
    const body = membershipPlanSchema.parse(await readJson(request));
    const branch = await prisma.branch.findFirst({ where: { orgId, isDefault: true } });
    const plan = await prisma.membershipPlan.create({
      data: clean({
        orgId,
        branchId: branch?.id,
        name: body.name,
        description: body.description,
        type: body.type,
        pricePaise: body.pricePaise,
        durationDays: body.durationDays,
        visitLimit: body.visitLimit,
        validityDays: body.validityDays,
        publicVisible: body.publicVisible,
        createdById: userId
      })
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "membership_plan.created",
      entityType: "membership_plan",
      entityId: plan.id,
      metadata: { name: plan.name, type: plan.type }
    });
    return ok({ plan });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "join-requests"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const orgId = path[1]!;
    const body = (await readJson(request)) as { planId?: string; referralCode?: string; message?: string };
    const requestRow = await prisma.membershipJoinRequest.create({
      data: clean({ orgId, userId, planId: body.planId, referralCode: body.referralCode, message: body.message })
    });
    return ok({ joinRequest: requestRow });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "join-requests", /.+/, "approve"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "MEMBERS_MANAGE");
    const existingJoinRequest = await prisma.membershipJoinRequest.findFirst({
      where: { id: path[3]!, orgId }
    });
    if (!existingJoinRequest) {
      throw notFoundError("Join request not found");
    }
    const joinRequest = await prisma.membershipJoinRequest.update({
      where: { id: existingJoinRequest.id },
      data: { status: "approved", reviewedById: userId, reviewedAt: new Date() }
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "membership_join_request.approved",
      entityType: "membership_join_request",
      entityId: joinRequest.id
    });
    return ok({ joinRequest });
  }
  if (request.method === "POST" && pathMatches(path, ["payments", "checkout"])) {
    const ctx = await getRequestContext(request);
    const userId = ctx.userId;
    const body = checkoutSchema.parse(await readJson(request));
    const session = await prisma.paymentSession.create({
      data: clean({
        orgId: body.orgId,
        userId: body.userId ?? userId,
        purpose: body.purpose,
        amountPaise: body.amountPaise,
        currency: body.currency,
        status: "CREATED",
        checkoutUrl: "",
        metadata: (body.metadata ?? {}) as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      })
    });
    const checkoutUrl = `/checkout/mock/${session.id}`;
    const updated = await prisma.paymentSession.update({ where: { id: session.id }, data: { checkoutUrl } });
    return ok({ session: updated, checkoutUrl });
  }
  if (request.method === "GET" && pathMatches(path, ["payments", "session", /.+/])) {
    const session = await prisma.paymentSession.findUnique({ where: { id: path[2]! } });
    return session ? ok({ session }) : fail("NOT_FOUND", "Payment session not found", 404);
  }
  if (request.method === "POST" && pathMatches(path, ["payments", "mock", /.+/, "complete"])) {
    const sessionId = path[2]!;
    const body = (await readJson(request)) as { status?: "SUCCEEDED" | "FAILED" | "PENDING" };
    const status = body.status ?? "SUCCEEDED";
    const session = await prisma.paymentSession.update({
      where: { id: sessionId },
      data: clean({ status, completedAt: status === "SUCCEEDED" ? new Date() : undefined })
    });
    let payment = null;
    if (status === "SUCCEEDED") {
      payment = await prisma.payment.create({
        data: {
          orgId: session.orgId,
          userId: session.userId,
          sessionId: session.id,
          purpose: session.purpose,
          amountPaise: session.amountPaise,
          status: "SUCCEEDED",
          mode: "MOCK_ONLINE",
          provider: "mock",
          providerRef: `mock_${session.id}`,
          recordedAt: new Date()
        }
      });
      const metadata = session.metadata as { subscriptionId?: string; shopOrderId?: string } | null;
      if (metadata?.subscriptionId) {
        const planSub = await prisma.memberSubscription.findUnique({ where: { id: metadata.subscriptionId } });
        const plan = planSub ? await prisma.membershipPlan.findUnique({ where: { id: planSub.planId } }) : null;
        const startsAt = new Date();
        const endsAt = plan?.durationDays || plan?.validityDays
          ? new Date(startsAt.getTime() + (plan.durationDays ?? plan.validityDays ?? 30) * 24 * 60 * 60 * 1000)
          : undefined;
        await prisma.memberSubscription.update({
          where: { id: metadata.subscriptionId },
          data: clean({
            status: "ACTIVE",
            startsAt,
            endsAt,
            remainingVisits: plan?.visitLimit,
            paymentId: payment.id
          })
        });
      }
      if (metadata?.shopOrderId) {
        await prisma.shopOrder.update({
          where: { id: metadata.shopOrderId },
          data: { status: "READY_FOR_PICKUP", paymentId: payment.id, pickupCode: `ZK-${session.id.slice(-6).toUpperCase()}` }
        });
      }
    }
    return ok({ session, payment });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "subscriptions"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const orgId = path[1]!;
    const body = (await readJson(request)) as { planId: string; couponCode?: string; referralCode?: string };
    const [plan, branch] = await Promise.all([
      prisma.membershipPlan.findUnique({ where: { id: body.planId } }),
      prisma.branch.findFirst({ where: { orgId, isDefault: true } })
    ]);
    if (!plan || !branch) {
      return fail("NOT_FOUND", "Plan or branch not found", 404);
    }
    let amountPaise = plan.pricePaise;
    let couponId: string | undefined;
    if (body.couponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { orgId_code: { orgId, code: body.couponCode.toUpperCase() } } });
      if (coupon) {
        const result = applyCoupon(
          clean({
            id: coupon.id,
            orgId,
            code: coupon.code,
            type: coupon.type,
            valuePaise: coupon.valuePaise ?? undefined,
            valuePercentBps: coupon.valuePercentBps ?? undefined,
            active: coupon.active,
            validFrom: coupon.validFrom ?? undefined,
            validUntil: coupon.validUntil ?? undefined,
            maxRedemptions: coupon.maxRedemptions ?? undefined,
            perUserLimit: coupon.perUserLimit ?? undefined,
            applicablePlanId: coupon.applicablePlanId ?? undefined
          }),
          { amountPaise, planId: plan.id },
        );
        amountPaise = result.finalAmountPaise;
        couponId = coupon.id;
      }
    }
    const subscription = await prisma.memberSubscription.create({
      data: {
        orgId,
        branchId: branch.id,
        memberUserId: userId,
        planId: plan.id,
        status: "PENDING_PAYMENT",
        remainingVisits: plan.visitLimit
      }
    });
    const session = await prisma.paymentSession.create({
      data: {
        orgId,
        userId,
        purpose: "MEMBERSHIP",
        amountPaise,
        status: "CREATED",
        checkoutUrl: `/checkout/mock/pending`,
        metadata: { subscriptionId: subscription.id, couponId, referralCode: body.referralCode },
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      }
    });
    const updated = await prisma.paymentSession.update({
      where: { id: session.id },
      data: { checkoutUrl: `/checkout/mock/${session.id}` }
    });
    return ok({ subscription, checkoutUrl: updated.checkoutUrl, session: updated });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "memberships"])) {
    const userId = requireAuth(await getRequestContext(request));
    return ok({ subscriptions: await prisma.memberSubscription.findMany({ where: { memberUserId: userId } }) });
  }
  return undefined;
}

async function handleCouponsReferrals(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "coupons"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "COUPONS_MANAGE");
    return ok({ coupons: await prisma.coupon.findMany({ where: { orgId } }) });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "coupons"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "COUPONS_MANAGE");
    const body = couponSchema.parse(await readJson(request));
    const coupon = await prisma.coupon.create({
      data: clean({
        orgId,
        code: body.code,
        type: body.type,
        valuePaise: body.valuePaise,
        valuePercentBps: body.valuePercentBps,
        maxRedemptions: body.maxRedemptions,
        perUserLimit: body.perUserLimit,
        applicablePlanId: body.applicablePlanId,
        createdById: userId
      })
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "coupon.created",
      entityType: "coupon",
      entityId: coupon.id,
      metadata: { code: coupon.code }
    });
    return ok({ coupon });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "referrals"])) {
    const userId = requireAuth(await getRequestContext(request));
    const orgId = path[1]!;
    const code = `ZK${randomBytes(4).toString("hex").toUpperCase()}`;
    const referral = await prisma.referralCode.create({
      data: { orgId, referrerUserId: userId, code, createdByRole: "MEMBER", maxUses: 20 }
    });
    return ok({ referral, links: { web: `/join/${orgId}?ref=${code}`, short: `/r/${code}` } });
  }
  if (request.method === "GET" && pathMatches(path, ["r", /.+/])) {
    const referral = await prisma.referralCode.findUnique({ where: { code: path[1]! } });
    if (!referral) return fail("NOT_FOUND", "Referral not found", 404);
    const org = await prisma.organization.findUnique({ where: { id: referral.orgId } });
    return ok({ referral, org });
  }
  return undefined;
}

async function handleAttendance(request: NextRequest, path: string[]) {
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "attendance", "qr-token"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ATTENDANCE_QR_DISPLAY");
    const branch = await prisma.branch.findFirst({ where: { orgId, isDefault: true } });
    if (!branch) return fail("NOT_FOUND", "Default branch not found", 404);
    const payload = createSignedQrToken({
      orgId,
      branchId: branch.id,
      secret: process.env.ZOOK_QR_SECRET ?? "dev-secret"
    });
    await prisma.attendanceQrToken.create({
      data: {
        orgId,
        branchId: branch.id,
        nonce: payload.nonce,
        issuedAt: new Date(payload.timestamp),
        expiresAt: new Date(payload.expiry),
        signature: payload.signature,
        createdById: userId
      }
    });
    return ok({ qrPayload: encodeQrPayload(payload), expiresAt: new Date(payload.expiry) });
  }
  if (request.method === "POST" && pathMatches(path, ["attendance", "scan"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const body = attendanceScanSchema.parse(await readJson(request));
    const decoded = JSON.parse(Buffer.from(body.qrPayload, "base64url").toString("utf8")) as { orgId: string; branchId: string; expiry: number; nonce: string };
    if (decoded.expiry < Date.now()) {
      return fail("QR_EXPIRED", "QR token expired", 400);
    }
    const [org, memberProfile, subscription, duplicate] = await Promise.all([
      prisma.organization.findUnique({ where: { id: decoded.orgId } }),
      prisma.memberProfile.findUnique({ where: { orgId_userId: { orgId: decoded.orgId, userId } } }),
      prisma.memberSubscription.findFirst({
        where: { orgId: decoded.orgId, branchId: decoded.branchId, memberUserId: userId, status: "ACTIVE" },
        orderBy: { createdAt: "desc" }
      }),
      prisma.attendanceRecord.findUnique({
        where: {
          orgId_branchId_userId_dateKey: {
            orgId: decoded.orgId,
            branchId: decoded.branchId,
            userId,
            dateKey: dateKey()
          }
        }
      })
    ]);
    if (!org || !subscription) {
      return fail("NO_ACTIVE_MEMBERSHIP", "No active membership", 400);
    }
    const plan = await prisma.membershipPlan.findUnique({ where: { id: subscription.planId } });
    if (!plan) return fail("PLAN_NOT_FOUND", "Plan not found", 400);
    const flags = duplicate ? ["duplicate_same_day"] : [];
    if (!memberProfile?.profilePhotoUrl) flags.push("profile_photo_required");
    const status = decideAttendanceStatus({ mode: org.attendanceMode, suspiciousFlags: flags });
    const record = await prisma.attendanceRecord.create({
      data: clean({
        orgId: decoded.orgId,
        branchId: decoded.branchId,
        userId,
        subscriptionId: subscription.id,
        dateKey: dateKey(),
        status,
        source: "QR_SCAN",
        qrTokenId: decoded.nonce,
        suspiciousFlags: flags,
        deviceId: body.deviceId
      })
    });
    if (status === "APPROVED" && (plan.type === "VISIT_PACK" || plan.type === "HYBRID" || plan.type === "TRIAL")) {
      await prisma.memberSubscription.update({
        where: { id: subscription.id },
        data: { remainingVisits: Math.max((subscription.remainingVisits ?? 0) - 1, 0) }
      });
    }
    return ok({ attendance: record, status, suspiciousFlags: flags });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "attendance", "live"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "ATTENDANCE_APPROVE");
    return ok({
      records: await prisma.attendanceRecord.findMany({ where: { orgId }, take: 20, orderBy: { checkedInAt: "desc" } })
    });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "attendance", /.+/, "approve"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ATTENDANCE_APPROVE");
    const existingRecord = await prisma.attendanceRecord.findFirst({ where: { id: path[3]!, orgId } });
    if (!existingRecord) {
      throw notFoundError("Attendance record not found");
    }
    const record = await prisma.attendanceRecord.update({
      where: { id: existingRecord.id },
      data: { status: "APPROVED", approvedById: userId, approvedAt: new Date() }
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "attendance.approved",
      entityType: "attendance_record",
      entityId: record.id
    });
    return ok({
      record
    });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "attendance", "manual"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ATTENDANCE_MANUAL_OVERRIDE");
    const body = (await readJson(request)) as { memberUserId: string; branchId?: string; reason?: string };
    if (!body.reason?.trim()) return fail("REASON_REQUIRED", "Manual override reason required", 400);
    const branch = body.branchId
      ? await prisma.branch.findUnique({ where: { id: body.branchId } })
      : await prisma.branch.findFirst({ where: { orgId, isDefault: true } });
    if (!branch) return fail("NOT_FOUND", "Branch not found", 404);
    const record = await prisma.attendanceRecord.create({
      data: {
        orgId,
        branchId: branch.id,
        userId: body.memberUserId,
        dateKey: dateKey(),
        status: "APPROVED",
        source: "MANUAL",
        approvedById: userId,
        approvedAt: new Date(),
        suspiciousFlags: ["manual_override"]
      }
    });
    await prisma.attendanceOverride.create({
      data: { orgId, attendanceRecordId: record.id, userId: body.memberUserId, reason: body.reason, createdById: userId }
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "attendance.manual_override",
      entityType: "attendance_record",
      entityId: record.id,
      metadata: { memberUserId: body.memberUserId, reason: body.reason }
    });
    return ok({ record });
  }
  return undefined;
}

async function handleStaffPlansGoals(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "staff"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "ORG_MANAGE_STAFF");
    const staff = await prisma.organizationRoleAssignment.findMany({ where: { orgId, role: { not: "MEMBER" } } });
    const users = await prisma.user.findMany({ where: { id: { in: staff.map((row) => row.userId) } } });
    return ok({ staff, users });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "staff", "invite"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_STAFF");
    const body = (await readJson(request)) as { email: string; role: Role };
    const invite = await prisma.staffInvitation.create({
      data: {
        orgId,
        email: body.email,
        role: body.role,
        token: randomBytes(18).toString("base64url"),
        invitedById: userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "staff.invited",
      entityType: "staff_invitation",
      entityId: invite.id,
      metadata: { email: body.email, role: body.role }
    });
    return ok({ invite });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "permissions"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "ORG_MANAGE_PERMISSIONS");
    return ok({ permissions: await prisma.organizationRolePermission.findMany({ where: { orgId } }) });
  }
  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "permissions"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_PERMISSIONS");
    const body = (await readJson(request)) as { role: Role; permission: string; enabled: boolean };
    const permission = await prisma.organizationRolePermission.upsert({
      where: { orgId_role_permission: { orgId, role: body.role, permission: body.permission as never } },
      update: { enabled: body.enabled, overriddenByUserId: userId },
      create: { orgId, role: body.role, permission: body.permission as never, enabled: body.enabled, overriddenByUserId: userId }
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "permissions.updated",
      entityType: "organization_role_permission",
      entityId: permission.id,
      metadata: body
    });
    return ok({ permission });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "manual-payments"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "PAYMENTS_RECORD_OFFLINE");
    const body = (await readJson(request)) as {
      memberUserId?: string;
      amountPaise: number;
      mode: "CASH" | "DIRECT_UPI" | "BANK_TRANSFER" | "OTHER";
      receiptNumber?: string;
      notes?: string;
    };
    const payment = await prisma.payment.create({
      data: clean({
        orgId,
        userId: body.memberUserId,
        purpose: "MEMBERSHIP",
        amountPaise: body.amountPaise,
        status: "SUCCEEDED",
        mode: body.mode,
        receiptNumber: body.receiptNumber,
        notes: body.notes,
        recordedById: userId,
        recordedAt: new Date()
      })
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "payment.manual_recorded",
      entityType: "payment",
      entityId: payment.id,
      metadata: { amountPaise: payment.amountPaise, mode: payment.mode }
    });
    return ok({ payment });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "trainers", /.+/, "clients"])) {
    const orgId = path[1]!;
    const trainerId = path[3]!;
    return ok({
      clients: await prisma.trainerAssignment.findMany({
        where: { orgId, trainerUserId: trainerId, active: true }
      })
    });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "trainers", /.+/, "pt-plans"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "PT_RECORD");
    const body = (await readJson(request)) as { name: string; description?: string; sessionCount?: number; durationDays?: number; pricePaise: number };
    const plan = await prisma.personalTrainingPlan.create({
      data: clean({
        orgId,
        trainerUserId: path[3]!,
        name: body.name,
        description: body.description,
        sessionCount: body.sessionCount,
        durationDays: body.durationDays,
        pricePaise: body.pricePaise
      })
    });
    return ok({ plan });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "pt-subscriptions"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "PT_RECORD");
    const body = (await readJson(request)) as {
      memberUserId: string;
      trainerUserId: string;
      ptPlanId?: string;
      amountPaise: number;
      paymentMode: "CASH" | "DIRECT_UPI" | "OTHER";
      totalSessions?: number;
      notes?: string;
    };
    const sub = await prisma.personalTrainingSubscription.create({
      data: clean({
        orgId,
        memberUserId: body.memberUserId,
        trainerUserId: body.trainerUserId,
        ptPlanId: body.ptPlanId,
        status: "ACTIVE",
        startsAt: new Date(),
        totalSessions: body.totalSessions,
        remainingSessions: body.totalSessions,
        amountPaise: body.amountPaise,
        paymentMode: body.paymentMode,
        notes: body.notes,
        recordedById: userId
      })
    });
    return ok({ subscription: sub });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "plans"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "PLANS_CREATE");
    const body = (await readJson(request)) as { title: string; type?: string; description?: string; content?: Record<string, unknown>; aiGenerated?: boolean };
    const plan = await prisma.planContent.create({
      data: clean({
        orgId,
        creatorUserId: userId,
        type: (body.type ?? "WORKOUT") as never,
        title: body.title,
        description: body.description,
        content: (body.content ?? { blocks: [] }) as Prisma.InputJsonValue,
        aiGenerated: body.aiGenerated ?? false
      })
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "plan.created",
      entityType: "plan_content",
      entityId: plan.id,
      metadata: { title: plan.title, type: plan.type }
    });
    return ok({ plan });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "plans", /.+/, "publish"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "PLANS_PUBLISH_ALL");
    const existingPlan = await prisma.planContent.findFirst({ where: { id: path[3]!, orgId } });
    if (!existingPlan) {
      throw notFoundError("Plan not found");
    }
    const plan = await prisma.planContent.update({
      where: { id: existingPlan.id },
      data: { status: "PUBLISHED", reviewed: true, reviewedById: userId }
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "plan.published",
      entityType: "plan_content",
      entityId: plan.id
    });
    return ok({ plan });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "plans", /.+/, "assign"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "PLANS_PUBLISH_ASSIGNED");
    const existingPlan = await prisma.planContent.findFirst({ where: { id: path[3]!, orgId } });
    if (!existingPlan) {
      throw notFoundError("Plan not found");
    }
    const body = (await readJson(request)) as { assignedToUserId?: string; audience?: string };
    const assignment = await prisma.planAssignment.create({
      data: clean({
        orgId,
        planId: existingPlan.id,
        assignedById: userId,
        assignedToUserId: body.assignedToUserId,
        audience: body.audience ?? "selected_member"
      })
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "plan.assigned",
      entityType: "plan_assignment",
      entityId: assignment.id,
      metadata: { assignedToUserId: body.assignedToUserId, audience: body.audience ?? "selected_member" }
    });
    return ok({ assignment });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "plans"])) {
    const userId = requireAuth(await getRequestContext(request));
    return ok({ plans: await prisma.planAssignment.findMany({ where: { assignedToUserId: userId, active: true } }) });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "plans", /.+/, "progress"])) {
    const userId = requireAuth(await getRequestContext(request));
    const body = (await readJson(request)) as { orgId: string; progressJson?: Record<string, unknown>; completionPct?: number; feedback?: string };
    const progress = await prisma.planProgress.upsert({
      where: { assignmentId_userId: { assignmentId: path[2]!, userId } },
      update: clean({
        progressJson: (body.progressJson ?? {}) as Prisma.InputJsonValue,
        completionPct: body.completionPct ?? 0,
        feedback: body.feedback
      }),
      create: clean({
        orgId: body.orgId,
        assignmentId: path[2]!,
        userId,
        progressJson: (body.progressJson ?? {}) as Prisma.InputJsonValue,
        completionPct: body.completionPct ?? 0,
        feedback: body.feedback
      })
    });
    return ok({ progress });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "goals"])) {
    const userId = requireAuth(await getRequestContext(request));
    return ok({ goals: await prisma.userGoal.findMany({ where: { userId, active: true } }) });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "goals"])) {
    const userId = requireAuth(await getRequestContext(request));
    const body = (await readJson(request)) as { orgId?: string; type: string; title: string; targetValue?: number; period?: string };
    const goal = await prisma.userGoal.create({
      data: clean({ orgId: body.orgId, userId, type: body.type, title: body.title, targetValue: body.targetValue, period: body.period })
    });
    return ok({ goal });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "badges"])) {
    const userId = requireAuth(await getRequestContext(request));
    return ok({ badges: await prisma.userBadge.findMany({ where: { userId } }) });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "challenges"])) {
    return ok({ challenges: await prisma.challenge.findMany({ where: { orgId: path[1]!, active: true } }) });
  }
  return undefined;
}

async function handleAiNotificationsShopPrivacyPlatform(request: NextRequest, path: string[]) {
  if (request.method === "POST" && pathMatches(path, ["ai", "chat"])) {
    const body = (await readJson(request)) as { prompt: string; orgId?: string };
    const ctx = await getRequestContext(request, body.orgId ? { orgId: body.orgId } : {});
    const userId = requireAuth(ctx);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (body.orgId) {
      requireOrgPermission(ctx, body.orgId, "AI_USE_TEXT");
    }
    const role = (ctx.roles.find((candidate) => candidate !== "PLATFORM_ADMIN") ?? "MEMBER") as Exclude<Role, "PLATFORM_ADMIN">;
    const quota = defaultAIQuotaForRole(role);
    const result = await runAIGuardedRequest({
      provider: aiProvider,
      prompt: body.prompt,
      role,
      requestType: "CHAT",
      quota,
      user: {
        isMinor: user.isMinor,
        guardianConsentGranted: !user.guardianPending,
        marketingOptIn: user.marketingOptIn,
        aiConsent: user.aiConsent || process.env.NODE_ENV === "development",
        hasProfilePhoto: Boolean(user.profilePhotoUrl)
      }
    });
    await prisma.aIUsageLog.create({
      data: clean({
        orgId: body.orgId,
        userId,
        role,
        provider: "MOCK",
        requestType: "CHAT",
        promptSummary: body.prompt.slice(0, 120),
        responseSummary: typeof result.response === "string" ? result.response.slice(0, 120) : "structured",
        tokenEstimate: result.tokenEstimate,
        quotaConsumed: result.quotaConsumed,
        safetyFlags: result.safetyFlags
      })
    });
    return ok(result);
  }
  if (request.method === "POST" && (pathMatches(path, ["ai", "generate-plan"]) || pathMatches(path, ["ai", "generate-image"]))) {
    const body = (await readJson(request)) as { prompt: string; orgId?: string };
    const ctx = await getRequestContext(request, body.orgId ? { orgId: body.orgId } : {});
    const userId = requireAuth(ctx);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const requestType: AIRequestType = path[1] === "generate-image" ? "IMAGE" : "STRUCTURED_PLAN";
    if (body.orgId) {
      requireOrgPermission(ctx, body.orgId, requestType === "IMAGE" ? "AI_GENERATE_IMAGE" : "AI_GENERATE_PLAN");
    }
    const role = (ctx.roles.find((candidate) => candidate !== "PLATFORM_ADMIN") ?? "TRAINER") as Exclude<Role, "PLATFORM_ADMIN">;
    const result = await runAIGuardedRequest({
      provider: aiProvider,
      prompt: body.prompt,
      role,
      requestType,
      quota: defaultAIQuotaForRole(role),
      user: {
        isMinor: user.isMinor,
        guardianConsentGranted: !user.guardianPending,
        marketingOptIn: user.marketingOptIn,
        aiConsent: true,
        hasProfilePhoto: Boolean(user.profilePhotoUrl)
      }
    });
    return ok(result);
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "ai", "usage"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "AI_MANAGE_SETTINGS");
    return ok({ usage: await prisma.aIUsageLog.findMany({ where: { orgId }, take: 50, orderBy: { createdAt: "desc" } }) });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "notifications"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "NOTIFICATION_CREATE_DRAFT");
    const body = notificationSchema.parse(await readJson(request));
    const notification = await prisma.notification.create({
      data: clean({
        orgId,
        createdById: userId,
        type: body.type,
        title: body.title,
        body: body.body,
        audience: body.audience,
        pushEnabled: body.pushEnabled,
        scheduledAt: body.scheduleAt ? new Date(body.scheduleAt) : undefined,
        status: body.scheduleAt ? "SCHEDULED" : "SENT",
        sentAt: body.scheduleAt ? undefined : new Date()
      })
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "notification.created",
      entityType: "notification",
      entityId: notification.id,
      metadata: { type: notification.type, audience: notification.audience }
    });
    return ok({ notification });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "notifications"])) {
    const userId = requireAuth(await getRequestContext(request));
    return ok({ notifications: await prisma.notificationRecipient.findMany({ where: { userId }, take: 30 }) });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "audit-logs"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "PRIVACY_VIEW_AUDIT");
    return ok({
      auditLogs: await prisma.auditLog.findMany({ where: { orgId }, orderBy: { createdAt: "desc" }, take: 100 })
    });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "products"])) {
    return ok({ products: await prisma.product.findMany({ where: { orgId: path[1]!, active: true } }) });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "products"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "SHOP_MANAGE_PRODUCTS");
    const body = (await readJson(request)) as { name: string; pricePaise: number; stock: number; category?: string };
    const product = await prisma.product.create({
      data: {
        orgId,
        name: body.name,
        pricePaise: body.pricePaise,
        stock: body.stock,
        category: (body.category ?? "OTHER") as never
      }
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "product.created",
      entityType: "product",
      entityId: product.id
    });
    return ok({ product });
  }
  if (request.method === "POST" && pathMatches(path, ["shop", "orders"])) {
    const userId = requireAuth(await getRequestContext(request));
    const body = (await readJson(request)) as { orgId: string; items: Array<{ productId: string; quantity: number }> };
    const products = await prisma.product.findMany({ where: { id: { in: body.items.map((item) => item.productId) }, orgId: body.orgId } });
    const total = body.items.reduce((sum, item) => {
      const product = products.find((candidate) => candidate.id === item.productId);
      if (!product || product.stock < item.quantity) throw new Error("Product out of stock");
      return sum + product.pricePaise * item.quantity;
    }, 0);
    const order = await prisma.shopOrder.create({ data: { orgId: body.orgId, userId, totalPaise: total } });
    await prisma.shopOrderItem.createMany({
      data: body.items.map((item) => ({
        orgId: body.orgId,
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPaise: products.find((product) => product.id === item.productId)?.pricePaise ?? 0
      }))
    });
    const session = await prisma.paymentSession.create({
      data: {
        orgId: body.orgId,
        userId,
        purpose: "SHOP_ORDER",
        amountPaise: total,
        checkoutUrl: "/checkout/mock/pending",
        metadata: { shopOrderId: order.id },
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      }
    });
    const updated = await prisma.paymentSession.update({ where: { id: session.id }, data: { checkoutUrl: `/checkout/mock/${session.id}` } });
    return ok({ order, checkoutUrl: updated.checkoutUrl });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "shop", "orders", /.+/, "fulfill"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "SHOP_FULFILL_ORDER");
    const existingOrder = await prisma.shopOrder.findFirst({ where: { id: path[4]!, orgId } });
    if (!existingOrder) {
      throw notFoundError("Shop order not found");
    }
    const order = await prisma.shopOrder.update({
      where: { id: existingOrder.id },
      data: { status: "FULFILLED", fulfilledById: userId, fulfilledAt: new Date() }
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "shop_order.fulfilled",
      entityType: "shop_order",
      entityId: order.id
    });
    return ok({ order });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "consents"])) {
    const userId = requireAuth(await getRequestContext(request));
    return ok({ consents: await prisma.consentRecord.findMany({ where: { userId } }) });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "data-export-request"])) {
    const userId = requireAuth(await getRequestContext(request));
    return ok({ request: await prisma.consentRecord.create({ data: { userId, type: "DATA_EXPORT", status: "PENDING" } }) });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "account-deletion-request"])) {
    const userId = requireAuth(await getRequestContext(request));
    return ok({ request: await prisma.consentRecord.create({ data: { userId, type: "ACCOUNT_DELETION", status: "PENDING" } }) });
  }
  if (request.method === "GET" && pathMatches(path, ["platform", "orgs"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    return ok({ orgs: await prisma.organization.findMany({ orderBy: { createdAt: "desc" } }) });
  }
  if (request.method === "PATCH" && pathMatches(path, ["platform", "orgs", /.+/, "status"])) {
    const ctx = await getRequestContext(request);
    const userId = requirePlatformAdmin(ctx);
    const body = (await readJson(request)) as { status: "ACTIVE" | "SUSPENDED" | "CANCELLED" };
    const org = await prisma.organization.update({ where: { id: path[2]! }, data: { status: body.status } });
    await writeAuditLog({
      request,
      orgId: org.id,
      actorUserId: userId,
      action: "platform.organization_status_updated",
      entityType: "organization",
      entityId: org.id,
      metadata: { status: body.status }
    });
    return ok({ org });
  }
  if (request.method === "GET" && pathMatches(path, ["platform", "ai-usage"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    return ok({ usage: await prisma.aIUsageLog.findMany({ take: 100, orderBy: { createdAt: "desc" } }) });
  }
  if (request.method === "GET" && pathMatches(path, ["platform", "abuse-flags"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    return ok({ flags: await prisma.organizationAbuseFlag.findMany({ take: 100, orderBy: { createdAt: "desc" } }) });
  }
  return undefined;
}

export async function handleApi(request: NextRequest, rawPath: string[] = []) {
  try {
    const path = rawPath.filter(Boolean);
    for (const handler of [
      handleAuth,
      handleOrganizations,
      handleMembershipPayments,
      handleCouponsReferrals,
      handleAttendance,
      handleStaffPlansGoals,
      handleAiNotificationsShopPrivacyPlatform
    ]) {
      const response = await handler(request, path);
      if (response) {
        return response;
      }
    }
    return fail("not_found", `No API route matched /api/${path.join("/")}`, 404);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export function redirectTo(url: string) {
  return NextResponse.redirect(url);
}
