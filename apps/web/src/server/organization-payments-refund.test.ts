import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleOrganizationPayments } from "./api-router/organization-payments";

const mocks = vi.hoisted(() => ({
  getRequestContext: vi.fn(),
  paymentFindFirst: vi.fn(),
  assertRateLimit: vi.fn(),
  refundPaymentForActor: vi.fn(),
  assertNotImpersonating: vi.fn(),
  requireOrgPermission: vi.fn(),
}));

vi.mock("@zook/db", () => ({
  prisma: {
    payment: { findFirst: mocks.paymentFindFirst },
  },
}));

vi.mock("./access", () => ({
  getRequestContext: mocks.getRequestContext,
  requireOrgPermission: (...args: Parameters<typeof mocks.requireOrgPermission>) =>
    mocks.requireOrgPermission(...args),
  requireOrgAnyPermission: (ctx: { userId: string }) => ctx.userId,
}));

vi.mock("./audit", () => ({
  writeAuditLog: vi.fn(),
}));

vi.mock("./rate-limit", () => ({
  assertRateLimit: mocks.assertRateLimit,
}));

vi.mock("./domains/payments/read-models", () => ({
  getOrganizationRecentPayments: vi.fn(),
}));

vi.mock("./api-router/core", () => ({
  assertBranchAccessForContext: vi.fn(),
  assertNotImpersonating: mocks.assertNotImpersonating,
  clean: <T>(value: T) => value,
  ensurePaymentInvoice: vi.fn(),
  ensurePaymentReceipt: vi.fn(),
  invoiceHtml: vi.fn(),
  invoicePdfResponse: vi.fn(),
  invoiceSignedUrl: vi.fn(),
  listOrganizationPaymentsPage: vi.fn(),
  pathMatches: (path: string[], pattern: Array<string | RegExp>) =>
    path.length === pattern.length &&
    pattern.every((segment, index) =>
      typeof segment === "string" ? path[index] === segment : segment.test(path[index] ?? ""),
    ),
  paymentRefundSchema: {
    parse: (value: unknown) => ({
      reason: (value as { reason?: string })?.reason ?? "Owner requested refund",
      ...((value as { amountPaise?: number })?.amountPaise
        ? { amountPaise: (value as { amountPaise?: number }).amountPaise }
        : {}),
    }),
  },
  queryBranchId: vi.fn(),
  receiptHtml: vi.fn(),
  refundPaymentForActor: mocks.refundPaymentForActor,
  subscriptionReminderResolveSchema: { parse: vi.fn() },
}));

function refundRequest(orgId: string, paymentId: string, body: Record<string, unknown> = {}) {
  return new NextRequest(`https://dashboard.zook.test/api/orgs/${orgId}/payments/${paymentId}/refund`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("desk refund 24h guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.refundPaymentForActor.mockResolvedValue({ refund: { id: "refund_1" } });
    mocks.requireOrgPermission.mockImplementation((ctx: { userId: string }) => ctx.userId);
  });

  it("allows a receptionist to refund a payment recorded within 24 hours", async () => {
    mocks.getRequestContext.mockResolvedValue({
      userId: "desk_1",
      orgId: "org_1",
      roles: ["RECEPTIONIST"],
      permissions: ["PAYMENTS_REFUND"],
    });
    mocks.paymentFindFirst.mockResolvedValue({
      id: "pay_1",
      orgId: "org_1",
      recordedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    });

    const response = await handleOrganizationPayments(
      refundRequest("org_1", "pay_1", { reason: "Member requested" }),
      ["orgs", "org_1", "payments", "pay_1", "refund"],
    );

    expect(response?.status).toBe(200);
    expect(mocks.refundPaymentForActor).toHaveBeenCalled();
  });

  it("blocks a receptionist from refunding a payment older than 24 hours", async () => {
    mocks.getRequestContext.mockResolvedValue({
      userId: "desk_1",
      orgId: "org_1",
      roles: ["RECEPTIONIST"],
      permissions: ["PAYMENTS_REFUND"],
    });
    mocks.paymentFindFirst.mockResolvedValue({
      id: "pay_1",
      orgId: "org_1",
      recordedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
    });

    await expect(
      handleOrganizationPayments(
        refundRequest("org_1", "pay_1", { reason: "Member requested" }),
        ["orgs", "org_1", "payments", "pay_1", "refund"],
      ),
    ).rejects.toThrow(/24 hours/);

    expect(mocks.refundPaymentForActor).not.toHaveBeenCalled();
  });

  it("allows an owner to refund a payment older than 24 hours", async () => {
    mocks.getRequestContext.mockResolvedValue({
      userId: "owner_1",
      orgId: "org_1",
      roles: ["OWNER"],
      permissions: ["PAYMENTS_REFUND"],
    });
    mocks.paymentFindFirst.mockResolvedValue({
      id: "pay_1",
      orgId: "org_1",
      recordedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
    });

    const response = await handleOrganizationPayments(
      refundRequest("org_1", "pay_1", { reason: "Owner requested refund" }),
      ["orgs", "org_1", "payments", "pay_1", "refund"],
    );

    expect(response?.status).toBe(200);
    expect(mocks.refundPaymentForActor).toHaveBeenCalled();
  });

  it("blocks a user lacking PAYMENTS_REFUND permission with a 403", async () => {
    mocks.getRequestContext.mockResolvedValue({
      userId: "admin_1",
      orgId: "org_1",
      roles: ["ADMIN"],
      permissions: [],
    });
    mocks.requireOrgPermission.mockImplementation(() => {
      const err = new Error("Forbidden");
      (err as NodeJS.ErrnoException).code = "FORBIDDEN";
      throw err;
    });

    await expect(
      handleOrganizationPayments(
        refundRequest("org_1", "pay_1", { reason: "Admin requested refund" }),
        ["orgs", "org_1", "payments", "pay_1", "refund"],
      ),
    ).rejects.toThrow("Forbidden");

    expect(mocks.refundPaymentForActor).not.toHaveBeenCalled();
  });
});
