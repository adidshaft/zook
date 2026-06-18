import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { checkoutSchema, isMockPaymentCompletionAllowed, type Permission } from "@zook/core";
import { getPaymentProviderDiagnostics } from "@zook/core/providers";
import { Prisma, prisma } from "@zook/db";
import { getRequestContext, requireAuth } from "../access";
import { conflictError, forbiddenError, notFoundError, unauthorizedError, validationError } from "../errors";
import { applyPaymentSessionStatus } from "../payment-runtime";
import { assertRateLimit } from "../rate-limit";
import { getClientIp } from "../security";
import { fail, ok, readJson } from "../response";
import {
  clean,
  createDirectNotification,
  ensureOrganizationMembership,
  ensureOrganizationMembershipWithClient,
  getPaymentProviderOrThrow,
  pathMatches,
  processVerifiedPaymentWebhookEvent,
  responseBodyForStorage,
  startPaymentSessionCheckout,
} from "./core";
import { z } from "zod";

const completeMockPaymentSchema = z.object({
  status: z.enum(["SUCCEEDED", "FAILED", "PENDING"]).optional(),
});

const mockPaymentCompletionAdminPermissions: Permission[] = [
  "PAYMENTS_VIEW",
  "PAYMENTS_RECORD_OFFLINE",
  "ORG_MANAGE_BILLING",
];

function hasAnyPermission(ctx: { permissions: Permission[] }, permissionOptions: Permission[]) {
  return permissionOptions.some((permission) => ctx.permissions.includes(permission));
}

function assertCanCompleteMockPayment(
  ctx: Awaited<ReturnType<typeof getRequestContext>>,
  session: {
    orgId: string | null;
    userId: string | null;
  },
) {
  if (!ctx.userId) {
    throw unauthorizedError();
  }
  const ownsSession = Boolean(session.userId && ctx.userId === session.userId);
  const canManageOrgPayment = Boolean(
    session.orgId &&
      ctx.orgId === session.orgId &&
      hasAnyPermission(ctx, mockPaymentCompletionAdminPermissions),
  );
  if (!ownsSession && !canManageOrgPayment && !ctx.isPlatformAdmin) {
    throw forbiddenError("Payment session does not belong to this user.");
  }
}

function assertCanReadPaymentSession(
  ctx: Awaited<ReturnType<typeof getRequestContext>>,
  session: {
    orgId: string | null;
    userId: string | null;
  },
  userId: string,
) {
  const canReadOwnSession = Boolean(session.userId && session.userId === userId);
  const canReadOrgSession = Boolean(
    session.orgId &&
      ctx.orgId === session.orgId &&
      ctx.permissions.includes("PAYMENTS_VIEW") &&
      ctx.orgStatus !== "SUSPENDED" &&
      ctx.orgStatus !== "CANCELLED",
  );
  if (!canReadOwnSession && !canReadOrgSession) {
    throw forbiddenError("No payment session access.");
  }
}

export async function handlePaymentSessions(request: NextRequest, path: string[]) {
  if (request.method === "POST" && pathMatches(path, ["payments", "checkout"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    await assertRateLimit(
      "paymentSessionByActor",
      userId ?? getClientIp(request),
      "Too many payment sessions requested.",
    );
    const body = checkoutSchema.parse(await readJson(request));
    getPaymentProviderOrThrow();
    if (body.purpose === "MEMBERSHIP" || body.purpose === "SHOP_ORDER") {
      throw validationError("Use the membership or shop checkout route for this purpose.");
    }
    if (body.metadata?.subscriptionId || body.metadata?.shopOrderId) {
      throw validationError(
        "Generic checkout cannot directly reference membership or shop records.",
      );
    }
    if (body.userId && body.userId !== userId && !ctx.isPlatformAdmin) {
      throw forbiddenError("You cannot start this payment for another person.");
    }

    const customer = await prisma.user.findUnique({ where: { id: body.userId ?? userId } });
    const session = await prisma.paymentSession.create({
      data: clean({
        orgId: body.orgId,
        userId: body.userId ?? userId,
        purpose: body.purpose,
        amountPaise: body.amountPaise,
        currency: body.currency,
        status: "CREATED",
        checkoutUrl: "",
        provider: getPaymentProviderDiagnostics().selectedProvider,
        metadata: (body.metadata ?? {}) as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      }),
    });
    let started;
    try {
      started = await startPaymentSessionCheckout({
        session,
        customer: clean({
          name: customer?.name,
          email: customer?.email,
          phone: customer?.phone ?? undefined,
        }),
      });
    } catch (error) {
      await prisma.paymentSession.update({
        where: { id: session.id },
        data: { status: "FAILED", completedAt: new Date() },
      });
      throw error;
    }
    return ok({
      session: started.session,
      checkoutUrl: started.checkoutUrl,
      checkoutData: started.checkout.checkoutData ?? null,
      provider: started.checkout.providerSessionId ? started.session.provider : session.provider,
    });
  }

  if (request.method === "GET" && pathMatches(path, ["payments", "session", /.+/])) {
    const session = await prisma.paymentSession.findUnique({ where: { id: path[2]! } });
    if (!session) {
      return fail("NOT_FOUND", "Payment session not found", 404);
    }
    const ctx = await getRequestContext(request, session.orgId ? { orgId: session.orgId } : {});
    const userId = requireAuth(ctx);
    await assertRateLimit(
      "paymentSessionByActor",
      `${userId}:${path[2]!}`,
      "Too many payment session checks. Please wait before trying again.",
    );
    assertCanReadPaymentSession(ctx, session, userId);
    return ok({ session });
  }

  if (request.method === "POST" && pathMatches(path, ["payments", "session", /.+/, "refresh"])) {
    const session = await prisma.paymentSession.findUnique({ where: { id: path[2]! } });
    if (!session) {
      return fail("NOT_FOUND", "Payment session not found", 404);
    }
    const ctx = await getRequestContext(request, session.orgId ? { orgId: session.orgId } : {});
    const userId = requireAuth(ctx);
    await assertRateLimit(
      "paymentSessionByActor",
      `${userId}:${path[2]!}:refresh`,
      "Too many payment session checks. Please wait before trying again.",
    );
    assertCanReadPaymentSession(ctx, session, userId);

    if (["SUCCEEDED", "FAILED", "CANCELLED", "EXPIRED", "REFUNDED"].includes(session.status)) {
      return ok({ session, refreshed: false });
    }

    const provider = getPaymentProviderOrThrow();
    const providerStatus = await provider.getPaymentStatus(
      session.providerRef
        ? { providerOrderId: session.providerRef }
        : { paymentSessionId: session.id },
    );

    if (providerStatus === session.status) {
      return ok({ session, refreshed: true });
    }

    const processed = await applyPaymentSessionStatus({
      sessionId: session.id,
      nextStatus: providerStatus,
      provider: provider.providerName,
      providerRef: session.providerRef ?? session.id,
      paymentMode: provider.providerName === "mock" ? "MOCK_ONLINE" : "CARD",
      expectedAmountPaise: session.amountPaise,
      createNotification: createDirectNotification,
      ensureMembership: (membershipInput, tx) =>
        tx
          ? ensureOrganizationMembershipWithClient(tx, membershipInput)
          : ensureOrganizationMembership(membershipInput),
    });
    return ok({ session: processed.session, payment: processed.payment ?? null, refreshed: true });
  }

  if (request.method === "POST" && pathMatches(path, ["payments", "webhooks", "razorpay"])) {
    const provider = getPaymentProviderOrThrow();
    if (provider.providerName !== "razorpay") {
      throw validationError(
        "Razorpay webhooks are unavailable while PAYMENT_PROVIDER is not set to razorpay.",
      );
    }

    const startedAt = Date.now();
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") ?? undefined;
    const headers = Object.fromEntries(request.headers.entries());
    const rawPayloadHash = createHash("sha256").update(rawBody).digest("hex");
    const verificationInput = {
      rawBody,
      headers,
      ...(signature ? { signature } : {}),
    };
    const verification = await provider.verifyWebhook(verificationInput);
    const parsed = verification.valid ? await provider.parseWebhookEvent(verificationInput) : null;
    const providerEventId =
      parsed?.providerEventId ??
      verification.providerEventId ??
      `invalid:${rawPayloadHash.slice(0, 24)}`;

    let event;
    try {
      event = await prisma.paymentEvent.create({
        data: clean({
          provider: "razorpay",
          providerEventId,
          eventType: parsed?.eventType ?? "payment.unknown",
          eventVersion: parsed?.eventVersion,
          status: verification.valid ? "VERIFIED" : "FAILED",
          payload: (parsed?.rawPayload ?? responseBodyForStorage(rawBody)) as Prisma.InputJsonValue,
          headers: headers as Prisma.InputJsonValue,
          rawPayloadHash,
          sourceIpAddress: getClientIp(request),
          signature,
          signatureVerified: verification.valid,
          signatureVerifiedAt: verification.valid ? new Date() : undefined,
          attemptCount: 1,
          lastAttemptAt: new Date(),
          processingError: verification.valid ? null : verification.reason,
        }),
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
        throw error;
      }
      const existing = await prisma.paymentEvent.update({
        where: {
          provider_providerEventId: {
            provider: "razorpay",
            providerEventId,
          },
        },
        data: {
          lastAttemptAt: new Date(),
          attemptCount: { increment: 1 },
        },
      });
      const replayAttempt = await prisma.paymentWebhookAttempt.create({
        data: {
          paymentEventId: existing.id,
          attemptNo: existing.attemptCount,
          processor: "api.payments.webhooks.razorpay",
          status: "SUCCEEDED",
          httpStatusCode: 200,
          durationMs: Date.now() - startedAt,
          completedAt: new Date(),
          result: { duplicate: true } as Prisma.InputJsonValue,
        },
      });
      return ok({
        received: true,
        duplicate: true,
        providerEventId,
        attemptNo: replayAttempt.attemptNo,
      });
    }

    const attempt = await prisma.paymentWebhookAttempt.create({
      data: {
        paymentEventId: event.id,
        attemptNo: event.attemptCount,
        processor: "api.payments.webhooks.razorpay",
        status: "PENDING",
      },
    });

    if (!verification.valid) {
      await prisma.paymentWebhookAttempt.update({
        where: {
          paymentEventId_attemptNo: { paymentEventId: event.id, attemptNo: attempt.attemptNo },
        },
        data: {
          status: "FAILED",
          httpStatusCode: 401,
          errorCode: "invalid_signature",
          errorMessage: verification.reason ?? "Signature verification failed.",
          durationMs: Date.now() - startedAt,
          completedAt: new Date(),
        },
      });
      return fail(
        "invalid_signature",
        verification.reason ?? "Signature verification failed.",
        401,
      );
    }

    return processVerifiedPaymentWebhookEvent({
      event,
      attempt,
      parsed,
      providerEventId,
      startedAt,
    });
  }

  if (request.method === "POST" && pathMatches(path, ["payments", "mock", /.+/, "complete"])) {
    if (!isMockPaymentCompletionAllowed()) {
      throw forbiddenError("Test payment confirmation is not available here.");
    }
    const sessionId = path[2]!;
    const body = completeMockPaymentSchema.parse(await readJson(request));
    const status = body.status ?? "SUCCEEDED";
    const currentSession = await prisma.paymentSession.findUnique({ where: { id: sessionId } });
    if (!currentSession) {
      throw notFoundError("Payment session not found");
    }
    if (
      status === "SUCCEEDED" &&
      currentSession.status !== "SUCCEEDED" &&
      currentSession.expiresAt.getTime() < Date.now()
    ) {
      throw conflictError("Payment session expired. Start payment again.");
    }
    const ctx = await getRequestContext(
      request,
      currentSession.orgId ? { orgId: currentSession.orgId } : {},
    );
    assertCanCompleteMockPayment(ctx, currentSession);
    const providerEventId = `mock:${sessionId}:${status}`;
    const existingEvent = await prisma.paymentEvent.findUnique({
      where: {
        provider_providerEventId: {
          provider: "mock",
          providerEventId,
        },
      },
    });
    if (existingEvent?.processedAt) {
      const existingPayment = await prisma.payment.findFirst({
        where: { sessionId: currentSession.id },
        orderBy: { createdAt: "desc" },
      });
      return ok({ session: currentSession, payment: existingPayment, duplicateEvent: true });
    }
    if (!existingEvent) {
      await prisma.paymentEvent.create({
        data: {
          orgId: currentSession.orgId,
          userId: currentSession.userId,
          sessionId: currentSession.id,
          paymentId: null,
          status: "VERIFIED",
          provider: "mock",
          providerEventId,
          eventType: `payment.${status.toLowerCase()}`,
          payload: body as Prisma.InputJsonValue,
          signatureVerified: true,
        },
      });
    }
    const processed = await applyPaymentSessionStatus({
      sessionId,
      nextStatus: status,
      provider: "mock",
      providerRef: `mock_${sessionId}`,
      paymentMode: "MOCK_ONLINE",
      createNotification: createDirectNotification,
      ensureMembership: (membershipInput, tx) =>
        tx
          ? ensureOrganizationMembershipWithClient(tx, membershipInput)
          : ensureOrganizationMembership(membershipInput),
    });
    await prisma.paymentEvent.update({
      where: {
        provider_providerEventId: {
          provider: "mock",
          providerEventId,
        },
      },
      data: clean({
        sessionId: processed.session.id,
        paymentId: processed.payment?.id,
        status: "PROCESSED",
        processedAt: new Date(),
        processingError: null,
      }),
    });
    return ok({ session: processed.session, payment: processed.payment });
  }
}
