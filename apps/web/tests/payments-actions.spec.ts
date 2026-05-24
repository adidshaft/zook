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
    await expectApiOk(
      await page.request.patch(`/api/orgs/${org.id}/billing-profile`, {
        data: {
          legalName: "Aarogya Strength Private Limited",
          gstNumber: "29ABCDE1234F1Z5",
          contactEmail: "billing@zook.local",
          contactPhone: "9876543210",
          address: "Zook Billing Street",
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "560001",
        },
      }),
    );
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

  test("owner refunds duplicate cash payments quickly and audit log captures the action", async ({
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
        amountPaise: 333300,
        status: "SUCCEEDED",
        mode: "CASH",
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

    await page.goto("/dashboard/payments");
    let dialogCount = 0;
    page.on("dialog", async (dialog) => {
      dialogCount += 1;
      if (dialogCount === 1) {
        expect(dialog.message()).toContain("Refund amount");
        await dialog.accept("500");
        return;
      }
      expect(dialog.message()).toContain("Reason");
      await dialog.accept("Duplicate cash payment");
    });
    await page
      .locator("tr")
      .filter({ hasText: "₹3,333" })
      .getByRole("button", { name: "Refund" })
      .first()
      .click();
    await expect(page.locator("p", { hasText: "Refund submitted from payment history." }).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("Razorpay refund processed webhook updates refund status", async ({ page }) => {
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
        amountPaise: 300000,
        status: "SUCCEEDED",
        mode: "CARD",
        provider: "mock",
        providerRef: `mock_refund_webhook_${Date.now()}`,
        recordedAt: new Date(),
      },
    });
    const refundId = `rfnd_phase4_${Date.now()}`;
    const refund = await prisma.paymentRefund.create({
      data: {
        orgId: org.id,
        branchId: branch.id,
        paymentId: payment.id,
        provider: "mock",
        providerRefundId: refundId,
        amountPaise: 300000,
        status: "REQUESTED",
        reason: "Awaiting provider webhook",
        requestedById: member.id,
      },
    });
    const event = await prisma.paymentEvent.create({
      data: {
        orgId: org.id,
        userId: member.id,
        provider: "mock",
        providerEventId: `refund.processed:${payment.providerRef}:phase4`,
        eventType: "refund.processed",
        status: "QUARANTINED",
        payload: {
          event: "refund.processed",
          payload: {
            refund: {
              entity: {
                id: refundId,
                payment_id: payment.providerRef,
                amount: 300000,
                currency: "INR",
              },
            },
          },
        },
        processedAt: new Date(),
        attemptCount: 1,
      },
    });
    const attempt = await prisma.paymentWebhookAttempt.create({
      data: {
        paymentEventId: event.id,
        attemptNo: 1,
        status: "FAILED",
        processor: "phase4",
      },
    });
    await loginWithSessionCookie(page, "platform@zook.local");
    const replay = await expectApiOk<{ attempt: { status: string } }>(
      await page.request.post(`/api/platform/webhooks/${attempt.id}/replay`, { data: {} }),
    );
    expect(replay.data.attempt.status).toBe("SUCCEEDED");
    await expect(prisma.paymentRefund.findUnique({ where: { id: refund.id } })).resolves.toMatchObject({
      status: "REFUNDED",
      processedAt: expect.any(Date),
    });
    await expect(prisma.payment.findUnique({ where: { id: payment.id } })).resolves.toMatchObject({
      status: "REFUNDED",
    });
  });
});
