import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizePhoneNumber, publicUserEmail, requestOtpSchema, verifyOtpSchema } from "@zook/core";
import { AuthService } from "@zook/core/services";
import { Prisma, prisma } from "@zook/db";
import { getRequestContext, requireAuth } from "../access";
import { extractSessionToken } from "../context";
import { getMemberHomeData } from "../domains/members/read-models";
import { invalidateOrganizationDashboardCache } from "../domains/overview/read-models";
import { getMyShopOrders } from "../domains/shop-orders/read-models";
import { conflictError, forbiddenError, notFoundError, unauthorizedError, validationError } from "../errors";
import { getDevOtpResponseValue } from "../auth-response";
import { assertRateLimit } from "../rate-limit";
import { ok, readJson } from "../response";
import { resolveSessionSummaryFromToken } from "../session";
import { getClientIp } from "../security";
import { writeAuditLog } from "../audit";
import {
  assertActiveContextOrg,
  assertContactIdentifierAvailable,
  attendanceCheckoutSchema,
  attendanceDetailParamsSchema,
  clean,
  closeAttendanceSession,
  contactOtpPurpose,
  enrichAttendanceRecords,
  ensurePaymentInvoice,
  ensurePaymentReceipt,
  getEmailProviderOrThrow,
  getEngagementSummary,
  getReferralCodesPayload,
  getSmsProviderOrThrow,
  getUserScopedFileAsset,
  invoiceHtml,
  invoicePdfResponse,
  invoiceSignedUrl,
  isDateUnder18,
  memberWellnessProfileSchema,
  parseMemberProfileNotes,
  pathMatches,
  PrismaAuthRepo,
  profilePhotoAssetSchema,
  receiptHtml,
  sanitizeRichText,
  serializeUserForClient,
} from "./core";

export async function handleMeData(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["me", "orgs"])) {
    const token = extractSessionToken(request);
    const summary = await resolveSessionSummaryFromToken(
      token,
      request.headers.get("x-zook-org-id") ??
        request.nextUrl.searchParams.get("orgId") ??
        undefined,
    );
    if (!summary) {
      throw unauthorizedError();
    }
    return ok({ organizations: summary.organizations, activeOrgId: summary.activeOrgId });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "saas-subscription"])) {
    const requestedOrgId = request.nextUrl.searchParams.get("orgId") ?? undefined;
    const ctx = await getRequestContext(request, requestedOrgId ? { orgId: requestedOrgId } : {});
    requireAuth(ctx);
    const orgId = requestedOrgId ?? ctx.orgId;
    if (!orgId || !ctx.roles.some((role) => role === "OWNER" || role === "ADMIN")) {
      throw forbiddenError("Gym billing access required.");
    }
    const [org, subscription, mandate] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { id: true, name: true, status: true, trialStartAt: true, trialEndAt: true },
      }),
      prisma.saaSSubscription.findUnique({ where: { orgId } }),
      prisma.saaSBillingMandate.findUnique({ where: { orgId } }),
    ]);
    return ok({ org, subscription, mandate });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "dashboard"])) {
    const requestedOrgId = request.nextUrl.searchParams.get("orgId") ?? undefined;
    const ctx = await getRequestContext(request, requestedOrgId ? { orgId: requestedOrgId } : {});
    const userId = requireAuth(ctx);
    assertActiveContextOrg(ctx, requestedOrgId);
    const orgId = requestedOrgId ?? ctx.orgId;
    const [home, engagement, referral, preferences] = await Promise.all([
      getMemberHomeData(userId, orgId),
      getEngagementSummary(userId, orgId),
      getReferralCodesPayload({ userId, orgId, roles: ctx.roles }),
      prisma.userNotificationPreference.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      }),
    ]);
    return ok({ home, engagement, referral, preferences });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "home"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    return ok(await getMemberHomeData(userId, ctx.orgId));
  }
  if (request.method === "GET" && pathMatches(path, ["me", "coaching"])) {
    const requestedOrgId = request.nextUrl.searchParams.get("orgId") ?? undefined;
    const ctx = await getRequestContext(request, requestedOrgId ? { orgId: requestedOrgId } : {});
    const userId = requireAuth(ctx);
    const orgId = requestedOrgId ?? ctx.orgId;
    const subscription = await prisma.personalTrainingSubscription.findFirst({
      where: {
        memberUserId: userId,
        ...(orgId ? { orgId } : {}),
        status: { in: ["ACTIVE", "PENDING_PAYMENT"] },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!subscription) {
      return ok({ subscription: null, trainer: null, plan: null, sessions: [] });
    }
    const [trainer, plan, sessions] = await Promise.all([
      prisma.user.findUnique({
        where: { id: subscription.trainerUserId },
        select: { id: true, name: true },
      }),
      subscription.ptPlanId
        ? prisma.personalTrainingPlan.findUnique({ where: { id: subscription.ptPlanId } })
        : Promise.resolve(null),
      prisma.personalTrainingSessionLog.findMany({
        where: { subscriptionId: subscription.id },
        orderBy: { sessionAt: "desc" },
        take: 20,
        select: { id: true, sessionAt: true, notes: true },
      }),
    ]);
    return ok({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        planName: plan?.name ?? null,
        totalSessions: subscription.totalSessions,
        remainingSessions: subscription.remainingSessions,
        amountPaise: subscription.amountPaise,
        startsAt: subscription.startsAt,
        endsAt: subscription.endsAt,
      },
      trainer: trainer ? { id: trainer.id, name: trainer.name } : null,
      plan: plan
        ? { id: plan.id, name: plan.name, description: plan.description, sessionCount: plan.sessionCount }
        : null,
      sessions,
    });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "pt-subscriptions", "request"])) {
    const requestedOrgId = request.nextUrl.searchParams.get("orgId") ?? undefined;
    const ctx = await getRequestContext(request, requestedOrgId ? { orgId: requestedOrgId } : {});
    const userId = requireAuth(ctx);
    assertActiveContextOrg(ctx, requestedOrgId);
    const orgId = requestedOrgId ?? ctx.orgId;
    if (!orgId) {
      throw validationError("An active gym context is required.");
    }
    const body = z
      .object({
        ptPlanId: z.string(),
        trainerUserId: z.string().optional(),
        amountPaise: z.number().int().positive().optional(),
        totalSessions: z.number().int().positive().optional(),
      })
      .parse(await readJson(request));
    const plan = await prisma.personalTrainingPlan.findFirst({
      where: { id: body.ptPlanId, orgId, active: true },
    });
    if (!plan) {
      throw notFoundError("PT plan not found.");
    }
    const trainerUserId = body.trainerUserId ?? plan.trainerUserId;
    if (trainerUserId !== plan.trainerUserId) {
      throw validationError("Trainer does not own this PT plan.");
    }
    await assertRateLimit(
      "subscriptionChangeByActor",
      `pt-request:${userId}:${orgId}`,
      "Too many PT subscription requests.",
    );
    const sessions = body.totalSessions ?? plan.sessionCount ?? undefined;
    const subscription = await prisma.personalTrainingSubscription.create({
      data: clean({
        orgId,
        memberUserId: userId,
        trainerUserId,
        ptPlanId: plan.id,
        status: "PENDING_APPROVAL",
        amountPaise: body.amountPaise ?? plan.pricePaise,
        totalSessions: sessions,
        remainingSessions: sessions,
        paymentMode: "OTHER",
        recordedById: userId,
      }),
    });
    return ok({ subscription });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "engagement"])) {
    const requestedOrgId = request.nextUrl.searchParams.get("orgId") ?? undefined;
    const ctx = await getRequestContext(request, requestedOrgId ? { orgId: requestedOrgId } : {});
    const userId = requireAuth(ctx);
    assertActiveContextOrg(ctx, requestedOrgId);
    return ok(await getEngagementSummary(userId, requestedOrgId ?? ctx.orgId));
  }
  if (request.method === "GET" && pathMatches(path, ["me", "referral-codes"])) {
    const requestedOrgId = request.nextUrl.searchParams.get("orgId") ?? undefined;
    const ctx = await getRequestContext(request, requestedOrgId ? { orgId: requestedOrgId } : {});
    const userId = requireAuth(ctx);
    assertActiveContextOrg(ctx, requestedOrgId);
    const orgId = requestedOrgId ?? ctx.orgId;
    return ok(await getReferralCodesPayload({ userId, orgId, roles: ctx.roles }));
  }
  if (request.method === "GET" && pathMatches(path, ["me", "referral-rewards"])) {
    const requestedOrgId = request.nextUrl.searchParams.get("orgId") ?? undefined;
    const ctx = await getRequestContext(request, requestedOrgId ? { orgId: requestedOrgId } : {});
    const userId = requireAuth(ctx);
    assertActiveContextOrg(ctx, requestedOrgId);
    const orgId = requestedOrgId ?? ctx.orgId;
    return ok({
      rewards: await prisma.referralReward.findMany({
        where: { referrerUserId: userId, ...(orgId ? { orgId } : {}) },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "contact", "request-otp"])) {
    const body = requestOtpSchema.parse(await readJson(request));
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const ipAddress = getClientIp(request);
    await assertContactIdentifierAvailable(userId, body.identifier);
    await assertRateLimit(
      "otpRequestByIdentifier",
      body.identifier.value,
      "Too many one-time code requests for this contact.",
    );
    await assertRateLimit(
      "otpRequestByIp",
      ipAddress,
      "Too many one-time code requests from this IP.",
    );
    const auth = new AuthService(
      new PrismaAuthRepo(),
      getEmailProviderOrThrow(),
      () => new Date(),
      body.identifier.kind === "phone" ? getSmsProviderOrThrow() : undefined,
    );
    const challenge = await auth.requestOtp(body.identifier, {
      purpose: contactOtpPurpose(userId, body.identifier.kind),
      ...(ipAddress !== "unknown" ? { ipAddress } : {}),
    });
    return ok({
      challengeId: challenge.id,
      expiresAt: challenge.expiresAt,
      devOtp: getDevOtpResponseValue(),
    });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "contact", "verify-otp"])) {
    const body = verifyOtpSchema.parse(await readJson(request));
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const ipAddress = getClientIp(request);
    await assertContactIdentifierAvailable(userId, body.identifier);
    await assertRateLimit(
      "otpVerifyByIdentifier",
      body.identifier.value,
      "Too many one-time code attempts for this contact.",
    );
    await assertRateLimit(
      "otpVerifyByIp",
      ipAddress,
      "Too many one-time code attempts from this IP.",
    );
    const auth = new AuthService(new PrismaAuthRepo(), getEmailProviderOrThrow());
    await auth.verifyOtpChallenge({
      identifier: body.identifier,
      code: body.code,
      purpose: contactOtpPurpose(userId, body.identifier.kind),
    });
    const user = await prisma.user.update({
      where: { id: userId },
      data:
        body.identifier.kind === "email"
          ? { email: body.identifier.value, emailVerifiedAt: new Date() }
          : { phone: body.identifier.value, phoneVerifiedAt: new Date() },
    });
    const token = extractSessionToken(request);
    const session = token ? await resolveSessionSummaryFromToken(token, ctx.orgId) : null;
    return ok({
      user: serializeUserForClient(user),
      ...(session ? { session } : {}),
    });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "profile"])) {
    const requestedOrgId = request.nextUrl.searchParams.get("orgId") ?? undefined;
    const ctx = await getRequestContext(request, requestedOrgId ? { orgId: requestedOrgId } : {});
    const userId = requireAuth(ctx);
    assertActiveContextOrg(ctx, requestedOrgId);
    const orgId = requestedOrgId ?? ctx.orgId;
    const [user, profile, latestBodyProgress] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      orgId
        ? prisma.memberProfile.findUnique({ where: { orgId_userId: { orgId, userId } } })
        : Promise.resolve(null),
      prisma.bodyProgressEntry.findFirst({
        where: { userId, ...(orgId ? { organizationId: orgId } : {}) },
        orderBy: { measuredAt: "desc" },
      }),
    ]);
    return ok({
      user: serializeUserForClient(user),
      profile,
      wellness: {
        ...parseMemberProfileNotes(profile?.notes),
        weightKg: latestBodyProgress?.weightKg ? Number(latestBodyProgress.weightKg) : undefined,
        latestMeasurementAt: latestBodyProgress?.measuredAt ?? undefined,
      },
    });
  }
  if (request.method === "PATCH" && pathMatches(path, ["me", "profile"])) {
    const body = memberWellnessProfileSchema.parse(await readJson(request));
    const ctx = await getRequestContext(request, body.orgId ? { orgId: body.orgId } : {});
    if (ctx.impersonationSessionId && (body.email !== undefined || body.phone !== undefined)) {
      throw forbiddenError("Email and phone changes are blocked during impersonation.");
    }
    const userId = requireAuth(ctx);
    assertActiveContextOrg(ctx, body.orgId);
    const orgId = body.orgId ?? ctx.orgId;
    const dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : undefined;
    if (dateOfBirth && Number.isNaN(dateOfBirth.getTime())) {
      throw validationError("Date of birth must be a valid date.");
    }
    const minorFromDate = dateOfBirth ? isDateUnder18(dateOfBirth) : undefined;
    const [user, profile, latestBodyProgress] = await prisma.$transaction(async (tx) => {
      const currentUser = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      if (body.email && body.email !== publicUserEmail(currentUser.email)) {
        throw validationError("Verify the new email before adding it to your account.");
      }
      if (body.phone !== undefined) {
        let requestedPhone: string | null;
        try {
          requestedPhone = body.phone === null ? null : normalizePhoneNumber(body.phone);
        } catch {
          throw validationError("Enter a valid phone number.");
        }
        if (requestedPhone !== currentUser.phone) {
          throw validationError("Verify the new phone number before adding it to your account.");
        }
      }
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: clean({
          name: body.name,
          dateOfBirth,
          ...(minorFromDate !== undefined
            ? {
                isMinor: minorFromDate,
                guardianPending: false,
              }
            : {}),
          gender: body.gender,
          emergencyContact:
            body.emergencyContact !== undefined
              ? {
                  name: body.emergencyContact.name?.trim() || null,
                  phone: body.emergencyContact.phone?.trim() || null,
                }
              : undefined,
          fitnessGoal: body.fitnessGoal,
          marketingOptIn: body.marketingOptIn,
          aiConsent: body.aiConsent,
          preferredLocale: body.preferredLocale,
          weeklyWorkoutGoal: body.weeklyWorkoutGoal,
        }),
      });
      const currentProfile = orgId
        ? await tx.memberProfile.findUnique({ where: { orgId_userId: { orgId, userId } } })
        : null;
      const existingNotes = parseMemberProfileNotes(currentProfile?.notes);
      const nextNotes = {
        ...existingNotes,
        ...(body.dietPreference !== undefined
          ? { dietPreference: sanitizeRichText(body.dietPreference) }
          : {}),
        ...(body.allergies !== undefined ? { allergies: sanitizeRichText(body.allergies) } : {}),
        ...(body.summaryNote !== undefined
          ? { summaryNote: sanitizeRichText(body.summaryNote) }
          : {}),
      };
      const updatedProfile = orgId
        ? await tx.memberProfile.upsert({
            where: { orgId_userId: { orgId, userId } },
            update: { notes: JSON.stringify(nextNotes) },
            create: {
              orgId,
              userId,
              marketingOptIn: updatedUser.marketingOptIn,
              notes: JSON.stringify(nextNotes),
            },
          })
        : null;
      const progress =
        body.weightKg !== undefined
          ? await tx.bodyProgressEntry.create({
              data: clean({
                userId,
                ...(orgId ? { organizationId: orgId } : {}),
                measuredAt: new Date(),
                weightKg: new Prisma.Decimal(body.weightKg),
                notes: "Updated from profile summary.",
                visibility: "TRAINER_VISIBLE",
              }),
            })
          : await tx.bodyProgressEntry.findFirst({
              where: { userId, ...(orgId ? { organizationId: orgId } : {}) },
              orderBy: { measuredAt: "desc" },
            });
      return [updatedUser, updatedProfile, progress] as const;
    });
    return ok({
      user: serializeUserForClient(user),
      profile,
      wellness: {
        ...parseMemberProfileNotes(profile?.notes),
        weightKg: latestBodyProgress?.weightKg ? Number(latestBodyProgress.weightKg) : undefined,
        latestMeasurementAt: latestBodyProgress?.measuredAt ?? undefined,
      },
    });
  }
  if (request.method === "PATCH" && pathMatches(path, ["me", "profile-photo"])) {
    const body = profilePhotoAssetSchema.parse(await readJson(request));
    const ctx = await getRequestContext(request, body.orgId ? { orgId: body.orgId } : {});
    const userId = requireAuth(ctx);
    assertActiveContextOrg(ctx, body.orgId);
    const asset = await getUserScopedFileAsset({
      fileAssetId: body.fileAssetId,
      userId,
      allowedCategories: ["profile_photo"],
      ...(body.orgId ? { orgId: body.orgId } : {}),
    });
    if (!asset) {
      throw validationError("Profile photo asset is required.");
    }
    const [user, profile] = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { profilePhotoUrl: asset.url },
      });
      const updatedProfile = body.orgId
        ? await tx.memberProfile.upsert({
            where: { orgId_userId: { orgId: body.orgId, userId } },
            update: clean({
              profilePhotoUrl: asset.url,
              profilePhotoConsentAt: body.consentToAttendanceUse ? new Date() : undefined,
            }),
            create: clean({
              orgId: body.orgId,
              userId,
              profilePhotoUrl: asset.url,
              marketingOptIn: updatedUser.marketingOptIn,
              profilePhotoConsentAt: body.consentToAttendanceUse ? new Date() : undefined,
            }),
          })
        : null;
      if (body.consentToAttendanceUse !== undefined) {
        await tx.consentRecord.create({
          data: clean({
            orgId: body.orgId,
            userId,
            type: "PROFILE_PHOTO_ATTENDANCE",
            status: body.consentToAttendanceUse ? "GRANTED" : "REVOKED",
            metadata: { fileAssetId: asset.id } as Prisma.InputJsonValue,
            recordedById: userId,
          }),
        });
      }
      return [updatedUser, updatedProfile] as const;
    });
    return ok({ user: serializeUserForClient(user), profile, file: asset });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "attendance", /.+/, "checkout"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const { id } = attendanceDetailParamsSchema.parse({ id: path[2] });
    const body = attendanceCheckoutSchema.parse(await readJson(request));
    const record = await prisma.attendanceRecord.findFirst({
      where: { id, userId },
    });
    if (!record) {
      throw notFoundError("Attendance record not found");
    }
    if (record.status === "REJECTED") {
      throw conflictError("Rejected attendance records cannot be checked out.");
    }
    const checkedOutRecord = await closeAttendanceSession(record, body.reason);
    await invalidateOrganizationDashboardCache(record.orgId, { branchId: record.branchId });
    await writeAuditLog({
      request,
      orgId: record.orgId,
      actorUserId: userId,
      action: "attendance.checked_out",
      entityType: "AttendanceRecord",
      entityId: record.id,
      metadata: clean({
        reason: body.reason,
        latitude: body.latitude,
        longitude: body.longitude,
      }),
    });
    const [attendance] = await enrichAttendanceRecords([checkedOutRecord]);
    return ok({
      attendance,
      action: record.checkedOutAt ? "already_checked_out" : "checkout",
      checkedOut: true,
    });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "attendance", /.+/])) {
    const userId = requireAuth(await getRequestContext(request));
    const { id } = attendanceDetailParamsSchema.parse({ id: path[2] });
    const record = await prisma.attendanceRecord.findFirst({
      where: { id, userId },
    });
    if (!record) {
      throw notFoundError("Attendance record not found");
    }
    const [attendance] = await enrichAttendanceRecords([record]);
    return ok({ attendance });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "attendance"])) {
    const userId = requireAuth(await getRequestContext(request));
    const records = await prisma.attendanceRecord.findMany({
      where: { userId },
      orderBy: { checkedInAt: "desc" },
      take: 50,
    });
    return ok({
      attendance: await enrichAttendanceRecords(records),
    });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "shop-orders"])) {
    const userId = requireAuth(await getRequestContext(request));
    return ok({ orders: await getMyShopOrders(userId) });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "invoices"])) {
    const userId = requireAuth(await getRequestContext(request));
    const invoices = await prisma.invoice.findMany({
      where: { userId },
      orderBy: [{ issueDate: "desc" }, { issuedAt: "desc" }],
      take: 100,
    });
    const pdfAssetIds = invoices.map((invoice) => invoice.pdfAssetId).filter(Boolean) as string[];
    const assets = pdfAssetIds.length
      ? await prisma.fileAsset.findMany({
          where: { id: { in: pdfAssetIds }, ownerUserId: userId, deletedAt: null },
        })
      : [];
    const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
    return ok({
      invoices: invoices.map((invoice) => ({
        ...invoice,
        invoiceNumber: invoice.invoiceNumber ?? invoice.invoiceNo,
        issueDate: invoice.issueDate ?? invoice.issuedAt,
        subtotalPaise: invoice.subtotalPaise || Math.max(invoice.amountPaise - invoice.taxPaise, 0),
        gstPaise: invoice.gstPaise || invoice.taxPaise,
        totalPaise: invoice.totalPaise || invoice.amountPaise,
        pdfAsset: invoice.pdfAssetId ? (assetsById.get(invoice.pdfAssetId) ?? null) : null,
        invoiceUrl: `/api/me/invoices/${invoice.id}/pdf`,
      })),
    });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "invoices", /.+/, "pdf"])) {
    const userId = requireAuth(await getRequestContext(request));
    const invoice = await prisma.invoice.findFirst({ where: { id: path[2]!, userId } });
    if (!invoice) {
      throw notFoundError("Invoice not found");
    }
    const [org, user] = await Promise.all([
      invoice.orgId ? prisma.organization.findUnique({ where: { id: invoice.orgId } }) : null,
      prisma.user.findUnique({ where: { id: userId } }),
    ]);
    return invoicePdfResponse({ invoice, org, user });
  }
  if (
    (request.method === "POST" || request.method === "GET") &&
    pathMatches(path, ["me", "payments", /.+/, "receipt"])
  ) {
    const userId = requireAuth(await getRequestContext(request));
    const paymentId = path[2]!;
    const payment = await prisma.payment.findFirst({ where: { id: paymentId, userId } });
    if (!payment?.orgId) {
      throw notFoundError("Payment not found");
    }
    const receipt = await ensurePaymentReceipt({ orgId: payment.orgId, paymentId, userId });
    if (request.method === "GET" && request.nextUrl.searchParams.get("format") === "html") {
      return new NextResponse(receiptHtml(receipt), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    return ok({
      receiptNumber: receipt.receiptNumber,
      payment: receipt.payment,
      receiptUrl: `/api/me/payments/${paymentId}/receipt?format=html`,
    });
  }
  if (
    (request.method === "POST" || request.method === "GET") &&
    pathMatches(path, ["me", "payments", /.+/, "invoice"])
  ) {
    const userId = requireAuth(await getRequestContext(request));
    const paymentId = path[2]!;
    const payment = await prisma.payment.findFirst({ where: { id: paymentId, userId } });
    if (!payment?.orgId) {
      throw notFoundError("Payment not found");
    }
    const invoice = await ensurePaymentInvoice({ orgId: payment.orgId, paymentId, userId });
    if (request.method === "GET" && request.nextUrl.searchParams.get("format") === "html") {
      return new NextResponse(invoiceHtml(invoice), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    return ok({
      invoice: invoice.invoice,
      invoiceUrl: `/api/me/invoices/${invoice.invoice.id}/pdf`,
      signedUrl: await invoiceSignedUrl(invoice.invoice),
    });
  }
  return undefined;
}
