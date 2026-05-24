import type { Permission, RequestContext } from "@zook/core";
import { prisma } from "@zook/db";

export type OrgReportType =
  | "members"
  | "attendance"
  | "payments"
  | "revenue"
  | "manual-cash"
  | "expiring-members"
  | "membership-sales"
  | "invoices"
  | "referrals"
  | "shop"
  | "ai-usage"
  | "audit-logs"
  | "trainer-client";

export type ReportFilters = {
  from?: Date;
  to?: Date;
  planId?: string;
  trainerId?: string;
  memberStatus?: string;
  paymentMode?: string;
  branchId?: string;
  exportFormat?: string;
};

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function parseDate(value: string | null) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString();
}

function csvEscape(value: unknown) {
  const raw =
    value === null || value === undefined
      ? ""
      : typeof value === "string"
        ? value
        : typeof value === "number" || typeof value === "boolean"
          ? String(value)
          : JSON.stringify(value);
  const escaped = raw.replace(/"/g, '""');
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

export function renderCsv(input: {
  report: OrgReportType;
  generatedBy: string;
  generatedAt?: Date;
  rows: Array<Record<string, unknown>>;
}) {
  const generatedAt = input.generatedAt ?? new Date();
  const headers = Array.from(new Set(input.rows.flatMap((row) => Object.keys(row))));
  const lines = [
    `# report=${input.report},generatedBy=${input.generatedBy},generatedAt=${generatedAt.toISOString()}`,
    headers.join(","),
  ];

  for (const row of input.rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(","));
  }

  return lines.join("\n");
}

export function parseReportFilters(searchParams: URLSearchParams): ReportFilters {
  return {
    ...(parseDate(searchParams.get("from"))
      ? { from: startOfDay(parseDate(searchParams.get("from")) as Date) }
      : {}),
    ...(parseDate(searchParams.get("to"))
      ? { to: endOfDay(parseDate(searchParams.get("to")) as Date) }
      : {}),
    ...(searchParams.get("planId") ? { planId: searchParams.get("planId") as string } : {}),
    ...(searchParams.get("trainerId")
      ? { trainerId: searchParams.get("trainerId") as string }
      : {}),
    ...(searchParams.get("memberStatus")
      ? { memberStatus: searchParams.get("memberStatus") as string }
      : {}),
    ...(searchParams.get("paymentMode")
      ? { paymentMode: searchParams.get("paymentMode") as string }
      : {}),
    ...(searchParams.get("branchId") ? { branchId: searchParams.get("branchId") as string } : {}),
    ...(searchParams.get("format") ? { exportFormat: searchParams.get("format") as string } : {}),
  };
}

function between(from?: Date, to?: Date) {
  return from || to
    ? {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      }
    : undefined;
}

function hasPermission(ctx: RequestContext, permission: Permission) {
  return ctx.permissions.includes(permission);
}

export function canExportOrgReport(input: {
  report: OrgReportType;
  ctx: RequestContext;
  actorUserId: string;
  trainerId?: string;
}) {
  if (input.report === "audit-logs") {
    return hasPermission(input.ctx, "PRIVACY_VIEW_AUDIT");
  }
  if (input.report === "trainer-client") {
    if (input.trainerId && input.actorUserId === input.trainerId) {
      return hasPermission(input.ctx, "PLANS_CREATE");
    }
    return hasPermission(input.ctx, "MEMBERS_VIEW") || hasPermission(input.ctx, "ORG_VIEW_REPORTS");
  }
  if (input.report === "ai-usage") {
    return (
      hasPermission(input.ctx, "AI_MANAGE_SETTINGS") || hasPermission(input.ctx, "ORG_VIEW_REPORTS")
    );
  }
  return hasPermission(input.ctx, "ORG_VIEW_REPORTS");
}

export class ReportsService {
  async membersReport(orgId: string, filters: ReportFilters) {
    const createdAt = between(filters.from, filters.to);
    const profiles = await prisma.memberProfile.findMany({
      where: {
        orgId,
        ...(createdAt ? { createdAt } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 1_000,
    });
    const memberUserIds = profiles.map((profile) => profile.userId);
    const [users, subscriptions] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: memberUserIds } } }),
      prisma.memberSubscription.findMany({
        where: {
          orgId,
          memberUserId: { in: memberUserIds },
          ...(filters.memberStatus ? { status: filters.memberStatus as never } : {}),
          ...(filters.planId ? { planId: filters.planId } : {}),
          ...(filters.branchId ? { branchId: filters.branchId } : {}),
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    const usersById = new Map(users.map((user) => [user.id, user]));
    const subscriptionsByUserId = new Map(
      subscriptions.map((subscription) => [subscription.memberUserId, subscription]),
    );

    return profiles
      .map((profile) => {
        const subscription = subscriptionsByUserId.get(profile.userId) ?? null;
        if ((filters.memberStatus || filters.planId || filters.branchId) && !subscription) {
          return null;
        }
        const user = usersById.get(profile.userId);
        return {
          memberId: profile.userId,
          memberName: user?.name ?? "",
          memberEmail: user?.email ?? "",
          memberPhone: user?.phone ?? "",
          membershipStatus: subscription?.status ?? "",
          planId: subscription?.planId ?? "",
          branchId: subscription?.branchId ?? "",
          joinedAt: formatDate(profile.createdAt),
          membershipEndsAt: formatDate(subscription?.endsAt),
        };
      })
      .filter(Boolean) as Array<Record<string, unknown>>;
  }

  async attendanceReport(orgId: string, filters: ReportFilters) {
    const checkedInAt = between(filters.from, filters.to);
    const records = await prisma.attendanceRecord.findMany({
      where: {
        orgId,
        ...(checkedInAt ? { checkedInAt } : {}),
        ...(filters.branchId ? { branchId: filters.branchId } : {}),
        ...(filters.memberStatus ? { status: filters.memberStatus as never } : {}),
      },
      orderBy: { checkedInAt: "desc" },
      take: 500,
    });
    const users = await prisma.user.findMany({
      where: { id: { in: records.map((record) => record.userId) } },
    });
    const usersById = new Map(users.map((user) => [user.id, user]));

    return records.map((record) => ({
      attendanceId: record.id,
      memberId: record.userId,
      memberName: usersById.get(record.userId)?.name ?? "",
      branchId: record.branchId,
      status: record.status,
      source: record.source,
      checkedInAt: formatDate(record.checkedInAt),
      approvedAt: formatDate(record.approvedAt),
      rejectionReason: record.rejectionReason ?? "",
      suspiciousFlags: record.suspiciousFlags ?? "",
    }));
  }

  async revenueReport(orgId: string, filters: ReportFilters) {
    const createdAt = between(filters.from, filters.to);
    const payments = await prisma.payment.findMany({
      where: {
        orgId,
        status: { in: ["SUCCEEDED", "REFUNDED", "PARTIALLY_REFUNDED"] },
        ...(createdAt ? { createdAt } : {}),
        ...(filters.paymentMode ? { mode: filters.paymentMode as never } : {}),
        ...(filters.branchId ? { branchId: filters.branchId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    const users = await prisma.user.findMany({
      where: { id: { in: payments.map((payment) => payment.userId).filter(Boolean) as string[] } },
    });
    const usersById = new Map(users.map((user) => [user.id, user]));

    return payments.map((payment) => ({
      paymentId: payment.id,
      purpose: payment.purpose,
      status: payment.status,
      branchId: payment.branchId ?? "",
      mode: payment.mode,
      amountPaise: payment.amountPaise,
      memberName: payment.userId ? (usersById.get(payment.userId)?.name ?? "") : "",
      receiptNumber: payment.receiptNumber ?? "",
      provider: payment.provider ?? "",
      createdAt: formatDate(payment.createdAt),
    }));
  }

  async paymentsReport(orgId: string, filters: ReportFilters) {
    const createdAt = between(filters.from, filters.to);
    const payments = await prisma.payment.findMany({
      where: {
        orgId,
        ...(createdAt ? { createdAt } : {}),
        ...(filters.paymentMode ? { mode: filters.paymentMode as never } : {}),
        ...(filters.branchId ? { branchId: filters.branchId } : {}),
      },
      orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
      take: 1_000,
    });
    const users = await prisma.user.findMany({
      where: { id: { in: payments.map((payment) => payment.userId).filter(Boolean) as string[] } },
    });
    const usersById = new Map(users.map((user) => [user.id, user]));

    return payments.map((payment) => ({
      paymentId: payment.id,
      sessionId: payment.sessionId ?? "",
      purpose: payment.purpose,
      status: payment.status,
      branchId: payment.branchId ?? "",
      mode: payment.mode,
      amountPaise: payment.amountPaise,
      memberId: payment.userId ?? "",
      memberName: payment.userId ? (usersById.get(payment.userId)?.name ?? "") : "",
      provider: payment.provider ?? "",
      providerRef: payment.providerRef ?? "",
      receiptNumber: payment.receiptNumber ?? "",
      recordedById: payment.recordedById ?? "",
      recordedAt: formatDate(payment.recordedAt),
      createdAt: formatDate(payment.createdAt),
    }));
  }

  async manualCashReport(orgId: string, filters: ReportFilters) {
    const recordedAt = between(filters.from, filters.to);
    const payments = await prisma.payment.findMany({
      where: {
        orgId,
        status: "SUCCEEDED",
        mode: { in: ["CASH", "DIRECT_UPI", "BANK_TRANSFER", "OTHER"] },
        ...(recordedAt ? { recordedAt } : {}),
        ...(filters.branchId ? { branchId: filters.branchId } : {}),
      },
      orderBy: { recordedAt: "desc" },
      take: 500,
    });

    return payments.map((payment) => ({
      paymentId: payment.id,
      branchId: payment.branchId ?? "",
      mode: payment.mode,
      amountPaise: payment.amountPaise,
      recordedById: payment.recordedById ?? "",
      recordedAt: formatDate(payment.recordedAt),
      proofAssetId: payment.proofAssetId ?? "",
      metadata: payment.metadata ?? "",
    }));
  }

  async membershipExpiryReport(orgId: string, filters: ReportFilters) {
    const subscriptions = await prisma.memberSubscription.findMany({
      where: {
        orgId,
        status: "ACTIVE",
        endsAt: between(filters.from, filters.to) ?? { not: null },
        ...(filters.planId ? { planId: filters.planId } : {}),
        ...(filters.branchId ? { branchId: filters.branchId } : {}),
      },
      orderBy: { endsAt: "asc" },
      take: 500,
    });
    const users = await prisma.user.findMany({
      where: { id: { in: subscriptions.map((subscription) => subscription.memberUserId) } },
    });
    const plans = await prisma.membershipPlan.findMany({
      where: { id: { in: subscriptions.map((subscription) => subscription.planId) } },
    });
    const usersById = new Map(users.map((user) => [user.id, user]));
    const plansById = new Map(plans.map((plan) => [plan.id, plan]));

    return subscriptions.map((subscription) => ({
      subscriptionId: subscription.id,
      memberId: subscription.memberUserId,
      memberName: usersById.get(subscription.memberUserId)?.name ?? "",
      planName: plansById.get(subscription.planId)?.name ?? "",
      endsAt: formatDate(subscription.endsAt),
      remainingVisits: subscription.remainingVisits ?? "",
      status: subscription.status,
    }));
  }

  async membershipSalesReport(orgId: string, filters: ReportFilters) {
    const createdAt = between(filters.from, filters.to);
    const subscriptions = await prisma.memberSubscription.findMany({
      where: {
        orgId,
        ...(createdAt ? { createdAt } : {}),
        ...(filters.planId ? { planId: filters.planId } : {}),
        ...(filters.branchId ? { branchId: filters.branchId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    const plans = await prisma.membershipPlan.findMany({
      where: { id: { in: subscriptions.map((subscription) => subscription.planId) } },
    });
    const payments = await prisma.payment.findMany({
      where: {
        id: {
          in: subscriptions
            .map((subscription) => subscription.paymentId)
            .filter(Boolean) as string[],
        },
      },
    });
    const plansById = new Map(plans.map((plan) => [plan.id, plan]));
    const paymentsById = new Map(payments.map((payment) => [payment.id, payment]));

    return subscriptions.map((subscription) => {
      const payment = subscription.paymentId ? paymentsById.get(subscription.paymentId) : undefined;
      return {
        subscriptionId: subscription.id,
        planName: plansById.get(subscription.planId)?.name ?? "",
        status: subscription.status,
        amountPaise: payment?.amountPaise ?? "",
        paymentMode: payment?.mode ?? "",
        activatedAt: formatDate(subscription.startsAt),
        createdAt: formatDate(subscription.createdAt),
      };
    });
  }

  async invoiceReport(orgId: string, filters: ReportFilters) {
    const issueDate = between(filters.from, filters.to);
    const invoices = await prisma.invoice.findMany({
      where: {
        orgId,
        ...(issueDate ? { issueDate } : {}),
      },
      orderBy: [{ issueDate: "desc" }, { issuedAt: "desc" }],
      take: 1_000,
    });
    const users = await prisma.user.findMany({
      where: { id: { in: invoices.map((invoice) => invoice.userId).filter(Boolean) as string[] } },
    });
    const usersById = new Map(users.map((user) => [user.id, user]));

    return invoices.map((invoice) => ({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber ?? invoice.invoiceNo ?? "",
      issueDate: formatDate(invoice.issueDate ?? invoice.issuedAt),
      status: invoice.invoiceStatus,
      paymentStatus: invoice.status,
      memberId: invoice.userId ?? "",
      memberName: invoice.userId ? (usersById.get(invoice.userId)?.name ?? "") : "",
      gstNumber: invoice.gstNumber ?? "",
      gstRateBps: invoice.gstRateBps ?? "",
      subtotalPaise: invoice.subtotalPaise || Math.max(invoice.amountPaise - invoice.taxPaise, 0),
      gstPaise: invoice.gstPaise || invoice.taxPaise,
      totalPaise: invoice.totalPaise || invoice.amountPaise,
      paymentId: invoice.paymentId ?? "",
      subscriptionId: invoice.subscriptionId ?? "",
      shopOrderId: invoice.shopOrderId ?? "",
      pdfAssetId: invoice.pdfAssetId ?? "",
    }));
  }

  async referralReport(orgId: string, filters: ReportFilters) {
    const createdAt = between(filters.from, filters.to);
    const redemptions = await prisma.referralRedemption.findMany({
      where: {
        orgId,
        ...(createdAt ? { createdAt } : {}),
        ...(filters.branchId ? { branchId: filters.branchId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    const codes = await prisma.referralCode.findMany({
      where: { id: { in: redemptions.map((redemption) => redemption.referralCodeId) } },
    });
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: [
            ...redemptions.map((redemption) => redemption.referredUserId),
            ...codes.map((code) => code.referrerUserId),
          ],
        },
      },
    });
    const codesById = new Map(codes.map((code) => [code.id, code]));
    const usersById = new Map(users.map((user) => [user.id, user]));

    return redemptions.map((redemption) => {
      const code = codesById.get(redemption.referralCodeId);
      return {
        redemptionId: redemption.id,
        code: code?.code ?? "",
        referrerName: code ? (usersById.get(code.referrerUserId)?.name ?? "") : "",
        referredName: usersById.get(redemption.referredUserId)?.name ?? "",
        suspicious: redemption.suspicious,
        createdAt: formatDate(redemption.createdAt),
      };
    });
  }

  async shopReport(orgId: string, filters: ReportFilters) {
    const createdAt = between(filters.from, filters.to);
    const orders = await prisma.shopOrder.findMany({
      where: {
        orgId,
        ...(createdAt ? { createdAt } : {}),
        ...(filters.branchId ? { branchId: filters.branchId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    const items = await prisma.shopOrderItem.findMany({
      where: { orderId: { in: orders.map((order) => order.id) } },
    });

    return orders.map((order) => ({
      orderId: order.id,
      branchId: order.branchId ?? "",
      status: order.status,
      totalPaise: order.totalPaise,
      pickupCode: order.pickupCode ?? "",
      itemCount: items.filter((item) => item.orderId === order.id).length,
      createdAt: formatDate(order.createdAt),
      fulfilledAt: formatDate(order.fulfilledAt),
    }));
  }

  async aiUsageReport(orgId: string, filters: ReportFilters) {
    const createdAt = between(filters.from, filters.to);
    const usage = await prisma.aIUsageLog.findMany({
      where: {
        orgId,
        ...(createdAt ? { createdAt } : {}),
        ...(filters.trainerId ? { userId: filters.trainerId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    const users = await prisma.user.findMany({
      where: { id: { in: usage.map((entry) => entry.userId) } },
    });
    const usersById = new Map(users.map((user) => [user.id, user]));

    return usage.map((entry) => ({
      usageId: entry.id,
      userId: entry.userId,
      userName: usersById.get(entry.userId)?.name ?? "",
      role: entry.role,
      requestType: entry.requestType,
      provider: entry.provider,
      tokenEstimate: entry.tokenEstimate,
      quotaConsumed: entry.quotaConsumed,
      imageCount: entry.imageCount,
      createdAt: formatDate(entry.createdAt),
    }));
  }

  async trainerClientReport(orgId: string, trainerId: string, filters: ReportFilters) {
    const assignments = await prisma.trainerAssignment.findMany({
      where: { orgId, trainerUserId: trainerId, active: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    const users = await prisma.user.findMany({
      where: { id: { in: assignments.map((assignment) => assignment.memberUserId) } },
    });
    const subscriptions = await prisma.memberSubscription.findMany({
      where: {
        orgId,
        memberUserId: { in: assignments.map((assignment) => assignment.memberUserId) },
        ...(filters.memberStatus ? { status: filters.memberStatus as never } : {}),
      },
    });
    const usersById = new Map(users.map((user) => [user.id, user]));
    const subscriptionsByUser = new Map(
      subscriptions.map((subscription) => [subscription.memberUserId, subscription]),
    );

    return assignments.map((assignment) => {
      const subscription = subscriptionsByUser.get(assignment.memberUserId);
      return {
        assignmentId: assignment.id,
        memberId: assignment.memberUserId,
        memberName: usersById.get(assignment.memberUserId)?.name ?? "",
        membershipStatus: subscription?.status ?? "",
        endsAt: formatDate(subscription?.endsAt),
        assignedAt: formatDate(assignment.createdAt),
      };
    });
  }

  async auditLogReport(orgId: string, filters: ReportFilters) {
    const createdAt = between(filters.from, filters.to);
    const logs = await prisma.auditLog.findMany({
      where: {
        orgId,
        ...(createdAt ? { createdAt } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return logs.map((log) => ({
      auditLogId: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId ?? "",
      actorUserId: log.actorUserId ?? "",
      requestId: log.requestId ?? "",
      createdAt: formatDate(log.createdAt),
    }));
  }
}
