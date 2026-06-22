import type { NextRequest } from "next/server";
import { getPaymentProvider, type ParsedPaymentWebhookEvent } from "@zook/core/providers";
import { Prisma, prisma } from "@zook/db";
import { getRequestContext, requirePlatformAdmin } from "../access";
import { writeAuditLog } from "../audit";
import { notFoundError } from "../errors";
import { assertRateLimit } from "../rate-limit";
import { ok, readJson } from "../response";
import {
  ADMIN_DETAIL_LIST_LIMIT,
  assertNotImpersonating,
  clean,
  jsonObject,
  pathMatches,
  paymentRefundSchema,
  processVerifiedPaymentWebhookEvent,
  refundPaymentForActor,
  serializeUserForClient,
} from "./core";

export async function handlePlatformPayments(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["platform", "payments"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    const q = request.nextUrl.searchParams.get("q")?.trim();
    const userIds = q
      ? (
          await prisma.user.findMany({
            where: {
              OR: [
                { email: { contains: q, mode: "insensitive" } },
                { phone: { contains: q } },
                { name: { contains: q, mode: "insensitive" } },
              ],
            },
            select: { id: true },
            take: 25,
          })
        ).map((user) => user.id)
      : [];
    const amountPaise = q && /^\d+(\.\d{1,2})?$/.test(q) ? Math.round(Number(q) * 100) : null;
    const payments = await prisma.payment.findMany({
      where: q
        ? {
            OR: [
              { id: { contains: q } },
              { providerRef: { contains: q } },
              { receiptNumber: { contains: q, mode: "insensitive" } },
              ...(userIds.length ? [{ userId: { in: userIds } }] : []),
              ...(amountPaise ? [{ amountPaise }] : []),
            ],
          }
        : {},
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return ok({ payments });
  }

  if (request.method === "GET" && pathMatches(path, ["platform", "payments", /.+/])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    const paymentId = path[2]!;
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      throw notFoundError("Payment not found");
    }
    const [events, refunds, user, org] = await Promise.all([
      prisma.paymentEvent.findMany({
        where: { paymentId },
        orderBy: { createdAt: "desc" },
        take: ADMIN_DETAIL_LIST_LIMIT,
      }),
      prisma.paymentRefund.findMany({
        where: { paymentId },
        orderBy: { createdAt: "desc" },
        take: ADMIN_DETAIL_LIST_LIMIT,
      }),
      payment.userId ? prisma.user.findUnique({ where: { id: payment.userId } }) : null,
      payment.orgId ? prisma.organization.findUnique({ where: { id: payment.orgId } }) : null,
    ]);
    const attempts = events.length
      ? await prisma.paymentWebhookAttempt.findMany({
          where: { paymentEventId: { in: events.map((event) => event.id) } },
          orderBy: { startedAt: "desc" },
          take: ADMIN_DETAIL_LIST_LIMIT,
        })
      : [];
    return ok({
      payment,
      user: user ? serializeUserForClient(user) : null,
      organization: org,
      refunds,
      events: events.map((event) => ({
        ...event,
        attempts: attempts.filter((attempt) => attempt.paymentEventId === event.id),
      })),
    });
  }

  if (request.method === "POST" && pathMatches(path, ["platform", "payments", /.+/, "refund"])) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    assertNotImpersonating(ctx, "Platform refund");
    await assertRateLimit(
      "paymentRefundByActorOrg",
      `platform:${actorUserId}`,
      "Too many refund attempts from this account.",
    );
    const body = paymentRefundSchema.parse(await readJson(request).catch(() => ({})));
    return ok(
      await refundPaymentForActor({
        request,
        paymentId: path[2]!,
        actorUserId,
        reason: body.reason,
        ...(body.amountPaise ? { amountPaise: body.amountPaise } : {}),
        platformRefund: true,
      }),
    );
  }

  if (request.method === "GET" && pathMatches(path, ["platform", "webhooks"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    const status = request.nextUrl.searchParams.get("status") || undefined;
    const provider = request.nextUrl.searchParams.get("provider") || undefined;
    const orgId = request.nextUrl.searchParams.get("org") || undefined;
    const eventIds =
      provider || orgId
        ? (
            await prisma.paymentEvent.findMany({
              where: clean({ provider, orgId }),
              select: { id: true },
              take: 500,
            })
          ).map((event) => event.id)
        : [];
    const attempts = await prisma.paymentWebhookAttempt.findMany({
      where: clean({
        status: status as Prisma.PaymentWebhookAttemptWhereInput["status"],
        ...(provider || orgId ? { paymentEventId: { in: eventIds } } : {}),
      }),
      orderBy: { startedAt: "desc" },
      take: 100,
    });
    return ok({ attempts });
  }

  if (request.method === "POST" && pathMatches(path, ["platform", "webhooks", /.+/, "replay"])) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    const attempt = await prisma.paymentWebhookAttempt.findUnique({ where: { id: path[2]! } });
    if (!attempt) {
      throw notFoundError("Webhook attempt not found");
    }
    const event = await prisma.paymentEvent.findUnique({ where: { id: attempt.paymentEventId } });
    if (!event) {
      throw notFoundError("Payment event not found");
    }
    const provider = getPaymentProvider();
    let parsed: ParsedPaymentWebhookEvent | null = null;
    if (!event.eventType.startsWith("refund.")) {
      try {
        parsed =
          event.payload && provider.providerName === event.provider
            ? await provider.parseWebhookEvent({
                rawBody: JSON.stringify(event.payload),
                headers: (event.headers ?? {}) as Record<string, string>,
                ...(event.signature ? { signature: event.signature } : {}),
              })
            : null;
      } catch {
        parsed = null;
      }
    }
    if (event.eventType.startsWith("refund.")) {
      const rawPayload = jsonObject(event.payload);
      const payload = jsonObject(rawPayload.payload as Prisma.JsonValue);
      const refundPayload = jsonObject(payload.refund as Prisma.JsonValue);
      const refundEntity = jsonObject(refundPayload.entity as Prisma.JsonValue);
      parsed = {
        provider: event.provider,
        providerEventId: event.providerEventId,
        eventType: event.eventType,
        paymentStatus: event.eventType === "refund.processed" ? "REFUNDED" : "PENDING",
        ...(typeof refundEntity.payment_id === "string"
          ? { providerPaymentId: refundEntity.payment_id }
          : {}),
        ...(typeof refundEntity.amount === "number" ? { amountPaise: refundEntity.amount } : {}),
        ...(typeof refundEntity.currency === "string" ? { currency: refundEntity.currency } : {}),
        rawPayload,
      };
    }
    const nextAttemptNo = event.attemptCount + 1;
    const replay = await prisma.paymentWebhookAttempt.create({
      data: {
        paymentEventId: event.id,
        attemptNo: nextAttemptNo,
        status: "PENDING",
        processor: "platform-replay",
        startedAt: new Date(),
        result: { replayedById: actorUserId, originalAttemptId: attempt.id },
      },
    });
    await prisma.paymentEvent.update({
      where: { id: event.id },
      data: { attemptCount: nextAttemptNo, lastAttemptAt: replay.startedAt },
    });
    await processVerifiedPaymentWebhookEvent({
      event,
      attempt: replay,
      parsed,
      providerEventId: event.providerEventId,
      startedAt: replay.startedAt.getTime(),
    });
    const processedReplay = await prisma.paymentWebhookAttempt.findUniqueOrThrow({
      where: { id: replay.id },
    });
    await writeAuditLog({
      request,
      ...(event.orgId ? { orgId: event.orgId } : {}),
      actorUserId,
      action: "platform.webhook_replayed",
      entityType: "payment_webhook_attempt",
      entityId: attempt.id,
      riskLevel: "HIGH",
      metadata: {
        replayAttemptId: replay.id,
        paymentEventId: event.id,
        status: processedReplay.status,
      },
    });
    return ok({ attempt: processedReplay });
  }
}
