import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleManualPayments } from "./api-router/manual-payments";

const mocks = vi.hoisted(() => ({
  assertBranchAccessForContext: vi.fn(),
  assertOrgUser: vi.fn(),
  createDirectNotification: vi.fn(),
  ensureOrganizationMembership: vi.fn(),
  ensurePaymentInvoiceDocument: vi.fn(),
  getOrganizationScopedFileAsset: vi.fn(),
  getRequestContext: vi.fn(),
  paymentCreate: vi.fn(),
  memberSubscriptionCreate: vi.fn(),
  memberSubscriptionFindFirst: vi.fn(),
  memberSubscriptionUpdate: vi.fn(),
  membershipPlanFindFirst: vi.fn(),
  organizationFindUnique: vi.fn(),
  resolveOrgBranch: vi.fn(),
  userFindUnique: vi.fn(),
  writeAuditLog: vi.fn(),
}));

vi.mock("@zook/db", () => ({
  prisma: {
    organization: { findUnique: mocks.organizationFindUnique },
    user: { findUnique: mocks.userFindUnique },
    membershipPlan: { findFirst: mocks.membershipPlanFindFirst },
    memberSubscription: {
      create: mocks.memberSubscriptionCreate,
      findFirst: mocks.memberSubscriptionFindFirst,
      update: mocks.memberSubscriptionUpdate,
    },
    payment: { create: mocks.paymentCreate },
    shopOrder: { findFirst: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("./access", () => ({
  getRequestContext: mocks.getRequestContext,
}));

vi.mock("./audit", () => ({
  writeAuditLog: mocks.writeAuditLog,
}));

vi.mock("./invoices/generate", () => ({
  ensurePaymentInvoiceDocument: mocks.ensurePaymentInvoiceDocument,
}));

vi.mock("./rate-limit", () => ({
  assertRateLimit: vi.fn(),
}));

vi.mock("./api-router/core", () => ({
  assertBranchAccessForContext: mocks.assertBranchAccessForContext,
  assertOrgUser: mocks.assertOrgUser,
  clean: <T>(value: T) => value,
  createDirectNotification: mocks.createDirectNotification,
  ensureOrganizationMembership: mocks.ensureOrganizationMembership,
  getOrganizationScopedFileAsset: mocks.getOrganizationScopedFileAsset,
  pathMatches: (path: string[], pattern: Array<string | RegExp>) =>
    path.length === pattern.length &&
    pattern.every((segment, index) =>
      typeof segment === "string" ? path[index] === segment : segment.test(path[index] ?? ""),
    ),
  resolveOrgBranch: mocks.resolveOrgBranch,
}));

function request(body: Record<string, unknown>) {
  return new NextRequest("https://dashboard.zook.test/api/orgs/org_1/manual-payments", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const plan = {
  id: "plan_1",
  orgId: "org_1",
  branchId: "branch_1",
  name: "Monthly",
  type: "DURATION",
  pricePaise: 200_000,
  durationDays: 30,
  visitLimit: null,
  validityDays: null,
  startDate: null,
  endDate: null,
  active: true,
  publicVisible: true,
};

describe("manual membership payment amount validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRequestContext.mockResolvedValue({
      userId: "desk_1",
      orgId: "org_1",
      roles: ["RECEPTIONIST"],
      permissions: ["PAYMENTS_RECORD_OFFLINE"],
    });
    mocks.getOrganizationScopedFileAsset.mockResolvedValue(null);
    mocks.organizationFindUnique.mockResolvedValue({ id: "org_1", name: "Aarogya Strength" });
    mocks.userFindUnique.mockResolvedValue({ id: "member_1", profilePhotoUrl: null, marketingOptIn: false });
    mocks.assertOrgUser.mockResolvedValue(undefined);
    mocks.assertBranchAccessForContext.mockResolvedValue("branch_1");
    mocks.membershipPlanFindFirst.mockResolvedValue(plan);
    mocks.resolveOrgBranch.mockResolvedValue({ id: "branch_1" });
    mocks.paymentCreate.mockResolvedValue({ id: "pay_1", amountPaise: 199_900, mode: "CASH" });
    mocks.memberSubscriptionCreate.mockResolvedValue({ id: "sub_1" });
    mocks.ensureOrganizationMembership.mockResolvedValue(undefined);
    mocks.createDirectNotification.mockResolvedValue(undefined);
    mocks.writeAuditLog.mockResolvedValue(undefined);
    mocks.ensurePaymentInvoiceDocument.mockResolvedValue(null);
  });

  it("allows desk membership payments within the small tolerance", async () => {
    const response = await handleManualPayments(
      request({
        purpose: "MEMBERSHIP",
        memberUserId: "member_1",
        planId: "plan_1",
        amountPaise: 199_900,
        mode: "CASH",
      }),
      ["orgs", "org_1", "manual-payments"],
    );

    expect(response?.status).toBe(200);
    expect(mocks.paymentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amountPaise: 199_900, purpose: "MEMBERSHIP" }),
      }),
    );
    expect(mocks.memberSubscriptionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paymentId: "pay_1", status: "ACTIVE" }),
      }),
    );
  });

  it("rejects desk membership payments outside the tolerance before writing payment rows", async () => {
    await expect(
      handleManualPayments(
        request({
          purpose: "MEMBERSHIP",
          memberUserId: "member_1",
          planId: "plan_1",
          amountPaise: 199_899,
          mode: "CASH",
        }),
        ["orgs", "org_1", "manual-payments"],
      ),
    ).rejects.toMatchObject({
      status: 400,
      code: "validation_error",
      message: "Manual membership payments must be within Rs 1.00 of the plan price.",
    });

    expect(mocks.paymentCreate).not.toHaveBeenCalled();
    expect(mocks.memberSubscriptionCreate).not.toHaveBeenCalled();
  });
});
