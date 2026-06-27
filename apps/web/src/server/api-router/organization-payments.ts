import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@zook/db";
import { getRequestContext, requireOrgAnyPermission, requireOrgPermission } from "../access";
import { writeAuditLog } from "../audit";
import { forbiddenError, notFoundError } from "../errors";
import { getOrganizationRecentPayments } from "../domains/payments/read-models";
import { assertRateLimit } from "../rate-limit";
import { ok, readJson } from "../response";
import {
  assertBranchAccessForContext,
  assertNotImpersonating,
  clean,
  ensurePaymentInvoice,
  ensurePaymentReceipt,
  invoiceHtml,
  invoicePdfResponse,
  invoiceSignedUrl,
  listOrganizationPaymentsPage,
  pathMatches,
  paymentRefundSchema,
  queryBranchId,
  receiptHtml,
  refundPaymentForActor,
  subscriptionReminderResolveSchema,
} from "./core";

const DESK_REFUND_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function handleOrganizationPayments(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "payments", "recent"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "PAYMENTS_RECORD_OFFLINE");
    const branchId = await assertBranchAccessForContext(ctx, orgId, queryBranchId(request));
    return ok({ payments: await getOrganizationRecentPayments(orgId, clean({ branchId })) });
  }

  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "payments"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgAnyPermission(ctx, orgId, ["PAYMENTS_VIEW", "PAYMENTS_RECORD_OFFLINE"]);
    return ok(await listOrganizationPaymentsPage(orgId, request));
  }

  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "invoices"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgAnyPermission(ctx, orgId, ["ORG_MANAGE_BILLING", "PAYMENTS_VIEW"]);
    const invoices = await prisma.invoice.findMany({
      where: { orgId },
      orderBy: [{ issueDate: "desc" }, { issuedAt: "desc" }],
      take: 100,
    });
    const users = invoices.some((invoice) => invoice.userId)
      ? await prisma.user.findMany({
          where: {
            id: { in: invoices.map((invoice) => invoice.userId).filter(Boolean) as string[] },
          },
        })
      : [];
    const usersById = new Map(users.map((user) => [user.id, user]));
    return ok({
      invoices: invoices.map((invoice) => ({
        ...invoice,
        user: invoice.userId ? (usersById.get(invoice.userId) ?? null) : null,
        invoiceUrl: `/api/orgs/${orgId}/invoices/${invoice.id}/pdf`,
      })),
    });
  }

  if (
    (request.method === "POST" || request.method === "GET") &&
    pathMatches(path, ["orgs", /.+/, "invoices", /.+/])
  ) {
    const orgId = path[1]!;
    const paymentId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgAnyPermission(ctx, orgId, ["ORG_MANAGE_BILLING", "PAYMENTS_VIEW"]);
    const invoice = await ensurePaymentInvoice({ orgId, paymentId });
    return ok({
      invoice: invoice.invoice,
      invoiceUrl: `/api/orgs/${orgId}/invoices/${invoice.invoice.id}/pdf`,
      signedUrl: await invoiceSignedUrl(invoice.invoice),
    });
  }

  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "invoices", /.+/, "pdf"])) {
    const orgId = path[1]!;
    const invoiceId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgAnyPermission(ctx, orgId, ["ORG_MANAGE_BILLING", "PAYMENTS_VIEW"]);
    const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, orgId } });
    if (!invoice) throw notFoundError("Invoice not found.");
    const [org, user] = await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId } }),
      invoice.userId ? prisma.user.findUnique({ where: { id: invoice.userId } }) : null,
    ]);
    return invoicePdfResponse({ invoice, org, user });
  }

  if (
    request.method === "GET" &&
    pathMatches(path, ["orgs", /.+/, "saas-subscription", "invoices", /.+/])
  ) {
    const orgId = path[1]!;
    const invoiceId = path[4]!.replace(/\.pdf$/i, "");
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "ORG_MANAGE_BILLING");
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, orgId, kind: "SAAS" },
    });
    if (!invoice) throw notFoundError("SaaS invoice not found.");
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    return invoicePdfResponse({ invoice, org });
  }

  if (
    (request.method === "POST" || request.method === "GET") &&
    pathMatches(path, ["orgs", /.+/, "payments", /.+/, "receipt"])
  ) {
    const orgId = path[1]!;
    const paymentId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgAnyPermission(ctx, orgId, ["PAYMENTS_VIEW", "PAYMENTS_RECORD_OFFLINE"]);
    const receipt = await ensurePaymentReceipt({ orgId, paymentId });
    if (request.method === "GET" && request.nextUrl.searchParams.get("format") === "html") {
      return new NextResponse(receiptHtml(receipt), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    return ok({
      receiptNumber: receipt.receiptNumber,
      payment: receipt.payment,
      receiptUrl: `/api/orgs/${orgId}/payments/${paymentId}/receipt?format=html`,
    });
  }

  if (
    (request.method === "POST" || request.method === "GET") &&
    pathMatches(path, ["orgs", /.+/, "payments", /.+/, "invoice"])
  ) {
    const orgId = path[1]!;
    const paymentId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgAnyPermission(ctx, orgId, ["ORG_MANAGE_BILLING", "PAYMENTS_VIEW"]);
    const invoice = await ensurePaymentInvoice({ orgId, paymentId });
    if (request.method === "GET" && request.nextUrl.searchParams.get("format") === "html") {
      return new NextResponse(invoiceHtml(invoice), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    return ok({
      invoice: invoice.invoice,
      invoiceUrl: `/api/orgs/${orgId}/invoices/${invoice.invoice.id}/pdf`,
      signedUrl: await invoiceSignedUrl(invoice.invoice),
    });
  }

  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "payments", /.+/, "refund"])) {
    const orgId = path[1]!;
    const paymentId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    assertNotImpersonating(ctx, "Refund approval");
    const userId = requireOrgPermission(ctx, orgId, "PAYMENTS_REFUND");
    await assertRateLimit(
      "paymentRefundByActorOrg",
      `${orgId}:${userId}`,
      "Too many refund attempts from this account.",
    );
    const body = paymentRefundSchema.parse(await readJson(request).catch(() => ({})));
    const payment = await prisma.payment.findFirst({ where: { id: paymentId, orgId } });
    if (!payment) {
      throw notFoundError("Payment not found");
    }
    const isManagementActor = ctx.roles.some((role) => role === "OWNER");
    if (!isManagementActor) {
      const referenceDate = payment.recordedAt ?? payment.createdAt;
      const ageMs = Date.now() - new Date(referenceDate).getTime();
      if (ageMs > DESK_REFUND_WINDOW_MS) {
        throw forbiddenError(
          "Desk staff can only refund payments made within the last 24 hours. Ask an admin or owner for older refunds.",
        );
      }
    }
    const result = await refundPaymentForActor({
      request,
      actorUserId: userId,
      paymentId: payment.id,
      reason: body.reason,
      ...(body.amountPaise ? { amountPaise: body.amountPaise } : {}),
    });
    return ok(result);
  }

  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "subscription-reminders"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgAnyPermission(ctx, orgId, [
      "ORG_MANAGE_BILLING",
      "PAYMENTS_VIEW",
      "PAYMENTS_RECORD_OFFLINE",
    ]);
    const status = request.nextUrl.searchParams.get("status")?.trim().toUpperCase();
    const reminders = await prisma.subscriptionReminder.findMany({
      where: clean({
        orgId,
        status:
          status && ["PENDING", "SENT", "RESOLVED", "CANCELLED"].includes(status)
            ? status
            : undefined,
      }),
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: 100,
    });
    return ok({ reminders });
  }

  if (
    request.method === "PATCH" &&
    pathMatches(path, ["orgs", /.+/, "subscription-reminders", /.+/])
  ) {
    const orgId = path[1]!;
    const reminderId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_BILLING");
    const body = subscriptionReminderResolveSchema.parse(await readJson(request).catch(() => ({})));
    const existing = await prisma.subscriptionReminder.findFirst({
      where: { id: reminderId, orgId },
    });
    if (!existing) {
      throw notFoundError("Subscription reminder not found");
    }
    const reminder = await prisma.subscriptionReminder.update({
      where: { id: existing.id },
      data: {
        status: body.status,
        resolvedAt: body.status === "RESOLVED" ? new Date() : existing.resolvedAt,
      },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "subscription_reminder.updated",
      entityType: "subscription_reminder",
      entityId: reminder.id,
      metadata: { status: reminder.status },
    });
    return ok({ reminder });
  }
}
