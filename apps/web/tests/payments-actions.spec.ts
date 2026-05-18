import { expect, test } from "@playwright/test";
import { prisma } from "@zook/db";
import {
  createMembershipPlan,
  expectApiOk,
  loginWithSessionCookie,
  seedAndGetOrg,
} from "./helpers";
import { requireDb } from "./helpers/db";

test.describe("payments actions", () => {
  test.beforeEach(() => {
    requireDb();
  });

  test("owner records an offline payment, generates documents, and sees DB persistence", async ({
    page,
  }) => {
    test.setTimeout(150_000);
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const member = await prisma.user.findUniqueOrThrow({ where: { email: "member@zook.local" } });
    const plan = await createMembershipPlan(page, org.id, {
      name: `Payment Plan ${Date.now()}`,
      pricePaise: 180000,
    });

    const paymentPayload = await expectApiOk<{ payment: { id: string; status: string } }>(
      await page.request.post(`/api/orgs/${org.id}/manual-payments`, {
        data: {
          memberUserId: member.id,
          planId: plan.id,
          amountPaise: 180000,
          mode: "CASH",
          receiptNumber: `RCPT-${Date.now()}`,
          notes: "Playwright offline payment",
        },
      }),
    );
    expect(paymentPayload.data.payment.status).toBe("SUCCEEDED");

    await expect(
      prisma.payment.findUnique({ where: { id: paymentPayload.data.payment.id } }),
    ).resolves.toMatchObject({
      orgId: org.id,
      userId: member.id,
      amountPaise: 180000,
      status: "SUCCEEDED",
      mode: "CASH",
    });

    const receipt = await expectApiOk<{ receiptUrl: string }>(
      await page.request.post(
        `/api/orgs/${org.id}/payments/${paymentPayload.data.payment.id}/receipt`,
      ),
    );
    expect(receipt.data.receiptUrl).toContain("/receipt?format=html");
    const invoice = await expectApiOk<{ invoiceUrl: string }>(
      await page.request.post(
        `/api/orgs/${org.id}/payments/${paymentPayload.data.payment.id}/invoice`,
      ),
    );
    expect(invoice.data.invoiceUrl).toContain("/invoice?format=html");

    await page.goto("/dashboard/payments");
    await expect(page.getByText("Payment history")).toBeVisible();
    await expect(page.getByText("₹1,800").first()).toBeVisible({ timeout: 15_000 });
  });

  test("owner refunds mock-provider payments and audit log captures the action", async ({
    page,
  }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const branch = await prisma.branch.findFirstOrThrow({
      where: { orgId: org.id, isDefault: true },
    });
    const member = await prisma.user.findUniqueOrThrow({ where: { email: "member@zook.local" } });
    const payment = await prisma.payment.create({
      data: {
        orgId: org.id,
        branchId: branch.id,
        userId: member.id,
        purpose: "MEMBERSHIP",
        amountPaise: 250000,
        status: "SUCCEEDED",
        mode: "MOCK_ONLINE",
        provider: "mock",
        providerRef: `mock_refund_${Date.now()}`,
        recordedAt: new Date(),
      },
    });

    const refundPayload = await expectApiOk<{
      payment: { id: string; status: string };
      refund: { paymentId: string; status: string; amountPaise: number };
    }>(
      await page.request.post(`/api/orgs/${org.id}/payments/${payment.id}/refund`, {
        data: { amountPaise: 100000, reason: "Playwright partial refund" },
      }),
    );
    expect(refundPayload.data.payment.status).toBe("PARTIALLY_REFUNDED");
    expect(refundPayload.data.refund).toMatchObject({
      paymentId: payment.id,
      status: "REFUNDED",
      amountPaise: 100000,
    });
    await expect(
      prisma.auditLog.findFirst({
        where: { orgId: org.id, action: "payment.refunded", entityId: payment.id },
      }),
    ).resolves.toBeTruthy();
  });
});
