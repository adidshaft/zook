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

  test("owner records an offline payment from the dashboard form", async ({ page }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const member = await prisma.user.findUniqueOrThrow({ where: { email: "member@zook.local" } });
    const plan = await createMembershipPlan(page, org.id, {
      name: `UI Payment Plan ${Date.now()}`,
      pricePaise: 210000,
    });
    const receiptNumber = `UI-RCPT-${Date.now()}`;

    await page.goto("/dashboard/payments");
    await expect(page.getByRole("heading", { name: "Collected at the desk" })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByLabel("Choose member").click();
    await page.getByPlaceholder("Search members").fill(member.email!);
    await page.getByRole("option", { name: new RegExp(member.email!, "i") }).click();

    await page.getByLabel("Choose plan").click();
    await page.getByPlaceholder("Search plans").fill(plan.name);
    await page.getByRole("option", { name: new RegExp(plan.name, "i") }).click();

    await page.getByPlaceholder("Reference number").fill(receiptNumber);
    await page.getByPlaceholder("Notes").fill("Dashboard UI offline payment");
    await page.getByRole("button", { name: "Record payment" }).click();

    await expect(page.getByText("Payment recorded for ₹2,100.")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Receipt generated")).toBeVisible();
    await expect(
      prisma.payment.findFirst({
        where: {
          orgId: org.id,
          userId: member.id,
          amountPaise: 210000,
          receiptNumber,
          mode: "CASH",
          status: "SUCCEEDED",
        },
      }),
    ).resolves.toBeTruthy();
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
    const autoInvoice = await prisma.invoice.findFirstOrThrow({
      where: { paymentId: paymentPayload.data.payment.id },
    });
    expect(autoInvoice.invoiceNumber).toMatch(/^ZK-AAROGYAS-20\d{2}-\d{2}\/\d{5}$/);
    expect(autoInvoice.gstNumber).toBe("29ABCDE1234F1Z5");
    expect(autoInvoice.pdfAssetId).toBeTruthy();
    const invoice = await expectApiOk<{ invoiceUrl: string }>(
      await page.request.post(
        `/api/orgs/${org.id}/payments/${paymentPayload.data.payment.id}/invoice`,
      ),
    );
    expect(invoice.data.invoiceUrl).toBe(`/api/orgs/${org.id}/invoices/${autoInvoice.id}/pdf`);
    const pdfResponse = await page.request.get(invoice.data.invoiceUrl);
    expect(pdfResponse.ok()).toBeTruthy();
    expect(pdfResponse.headers()["content-type"]).toContain("application/pdf");

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
    const paymentRow = page.locator("tr").filter({ hasText: "₹3,333" }).first();
    await paymentRow.getByRole("button", { name: "Refund" }).click();
    await expect(page.getByText("Refund draft")).toBeVisible();
    await page.getByLabel("Refund amount").fill("500");
    await page.getByLabel("Refund reason").fill("Duplicate cash payment");
    await page.getByRole("button", { name: "Submit refund" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Submit refund" }).click();
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

  test("selected branch payments exclude legacy shared payments", async ({ page }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const branch = await prisma.branch.findFirstOrThrow({
      where: { orgId: org.id, isDefault: true, active: true },
    });
    const member = await prisma.user.findUniqueOrThrow({ where: { email: "member@zook.local" } });
    const sharedPayment = await prisma.payment.create({
      data: {
        orgId: org.id,
        branchId: null,
        userId: member.id,
        purpose: "MEMBERSHIP",
        amountPaise: 90900,
        status: "SUCCEEDED",
        mode: "CASH",
        recordedAt: new Date(),
      },
    });
    const branchPayment = await prisma.payment.create({
      data: {
        orgId: org.id,
        branchId: branch.id,
        userId: member.id,
        purpose: "MEMBERSHIP",
        amountPaise: 123400,
        status: "SUCCEEDED",
        mode: "CASH",
        recordedAt: new Date(),
      },
    });

    const payload = await expectApiOk<{ payments: Array<{ id: string }> }>(
      await page.request.get(`/api/orgs/${org.id}/payments?branchId=${branch.id}&limit=20`),
    );
    expect(payload.data.payments.some((payment) => payment.id === branchPayment.id)).toBe(true);
    expect(payload.data.payments.some((payment) => payment.id === sharedPayment.id)).toBe(false);
  });
});
