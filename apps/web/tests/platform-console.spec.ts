import { expect, test } from "@playwright/test";
import { prisma } from "@zook/db";
import { expectApiOk, loginWithSessionCookie, seedAndGetOrg } from "./helpers";
import { requireDb } from "./helpers/db";

test.describe("platform support console", () => {
  test.beforeEach(async () => {
    requireDb();
    await prisma.featureFlag.deleteMany({
      where: { key: { in: ["ai.assistant", "platform.impersonation", "platform.playwright"] } },
    });
  });

  test("resolves login support, audits impersonation, and blocks silent abuse", async ({
    page,
  }) => {
    await loginWithSessionCookie(page, "platform@zook.local");
    const member = await prisma.user.findUniqueOrThrow({ where: { email: "member@zook.local" } });

    const users = await expectApiOk<{ users: Array<{ id: string; email: string }> }>(
      await page.request.get("/api/platform/users?q=member@zook.local"),
    );
    expect(users.data.users.some((user) => user.id === member.id)).toBe(true);

    const revoked = await expectApiOk<{ revoked: number }>(
      await page.request.post(`/api/platform/users/${member.id}/sessions/revoke`, { data: {} }),
    );
    expect(revoked.data.revoked).toBeGreaterThanOrEqual(0);
    await expect(
      prisma.auditLog.findFirst({
        where: { action: "platform.user_sessions_revoked", entityId: member.id },
      }),
    ).resolves.toBeTruthy();

    const disabled = await page.request.post(`/api/platform/users/${member.id}/impersonate`, {
      data: { reason: "Support reproduction before flag", ttlMinutes: 15 },
    });
    expect(disabled.status()).toBe(403);

    await expectApiOk(
      await page.request.patch("/api/platform/flags", {
        data: {
          key: "platform.impersonation",
          enabled: true,
          rolloutPercent: 100,
          description: "Playwright support impersonation",
          overrideOrgIds: [],
        },
      }),
    );

    const impersonation = await expectApiOk<{
      impersonation: { id: string; targetUserId: string };
      token: string;
    }>(
      await page.request.post(`/api/platform/users/${member.id}/impersonate`, {
        data: { reason: "Support reproduction with audited banner", ttlMinutes: 15 },
      }),
    );
    expect(impersonation.data.impersonation.targetUserId).toBe(member.id);
    await expect(
      prisma.auditLog.findFirst({
        where: {
          action: "platform.impersonation_started",
          entityId: impersonation.data.impersonation.id,
          riskLevel: "CRITICAL",
        },
      }),
    ).resolves.toBeTruthy();

    await page.goto("/me");
    await expect(page.getByText(/impersonating member@zook.local/i)).toBeVisible({
      timeout: 15_000,
    });

    const exportAttempt = await page.request.post("/api/me/data-export-request", { data: {} });
    expect(exportAttempt.status()).toBe(403);

    await expectApiOk(
      await page.request.post(
        `/api/platform/impersonations/${impersonation.data.impersonation.id}/end`,
        { data: {} },
      ),
    );
    await expect(
      prisma.auditLog.findFirst({
        where: {
          action: "platform.impersonation_ended",
          entityId: impersonation.data.impersonation.id,
        },
      }),
    ).resolves.toBeTruthy();
  });

  test("refunds duplicate payments cross-tenant and records platform audit", async ({ page }) => {
    await loginWithSessionCookie(page, "platform@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const branch = await prisma.branch.findFirstOrThrow({ where: { orgId: org.id, isDefault: true } });
    const member = await prisma.user.findUniqueOrThrow({ where: { email: "member@zook.local" } });
    const payment = await prisma.payment.create({
      data: {
        orgId: org.id,
        branchId: branch.id,
        userId: member.id,
        purpose: "MEMBERSHIP",
        amountPaise: 10100,
        status: "SUCCEEDED",
        mode: "MOCK_ONLINE",
        provider: "mock",
        providerRef: `platform_refund_${Date.now()}`,
        recordedAt: new Date(),
      },
    });

    const refund = await expectApiOk<{
      payment: { id: string; status: string };
      refund: { id: string; paymentId: string; status: string; metadata?: { platformRefund?: boolean } };
    }>(
      await page.request.post(`/api/platform/payments/${payment.id}/refund`, {
        data: { amountPaise: 100, reason: "Duplicate platform charge test" },
      }),
    );
    expect(refund.data.payment.status).toBe("PARTIALLY_REFUNDED");
    expect(refund.data.refund).toMatchObject({ paymentId: payment.id, status: "REFUNDED" });
    await expect(
      prisma.auditLog.findFirst({
        where: { orgId: org.id, action: "platform.payment.refunded", entityId: payment.id },
      }),
    ).resolves.toMatchObject({ riskLevel: "HIGH" });
  });

  test("soft-deletes a misbehaving gym with reason and audit trail", async ({ page }) => {
    await loginWithSessionCookie(page, "platform@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });

    const deleted = await expectApiOk<{ org: { id: string; status: string; deletedAt: string } }>(
      await page.request.post(`/api/platform/orgs/${org.id}/soft-delete`, {
        data: { reason: "Playwright abuse escalation" },
      }),
    );
    expect(deleted.data.org).toMatchObject({ id: org.id, status: "DELETED" });
    await expect(
      prisma.auditLog.findFirst({
        where: {
          orgId: org.id,
          action: "platform.organization_soft_deleted",
          entityId: org.id,
          riskLevel: "CRITICAL",
        },
      }),
    ).resolves.toBeTruthy();

    await prisma.organization.update({
      where: { id: org.id },
      data: { status: "ACTIVE", deletedAt: null },
    });
  });

  test("manages broadcast, flags, webhook replay, moderation, and global audit", async ({
    page,
  }) => {
    await loginWithSessionCookie(page, "platform@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const platform = await prisma.user.findUniqueOrThrow({ where: { email: "platform@zook.local" } });

    await expectApiOk(
      await page.request.patch("/api/platform/flags", {
        data: { key: "ai.assistant", enabled: true, rolloutPercent: 100 },
      }),
    );
    await page.goto("/platform/users");
    await page.getByRole("button", { name: "Disable ai.assistant" }).click();
    await expect
      .poll(async () => {
        const flag = await prisma.featureFlag.findUnique({ where: { key: "ai.assistant" } });
        return flag?.enabled;
      })
      .toBe(false);
    const gatedAi = await page.request.post("/api/ai/chat", {
      data: { prompt: "Summarize today's follow ups." },
    });
    expect(gatedAi.status()).toBe(503);
    await expect(gatedAi.text()).resolves.toContain("AI assistant is disabled");

    const member = await prisma.user.findUniqueOrThrow({ where: { email: "member@zook.local" } });
    const broadcast = await expectApiOk<{ broadcast: { id: string; status: string } }>(
      await page.request.post("/api/platform/broadcasts", {
        data: {
          title: "Scheduled maintenance Sunday 2-3 AM",
          body: "Platform support smoke",
          severity: "INFO",
          status: "DRAFT",
          targetOrgIds: [org.id],
          targetRoles: [],
        },
      }),
    );
    await expectApiOk(
      await page.request.patch(`/api/platform/broadcasts/${broadcast.data.broadcast.id}`, {
        data: { status: "LIVE" },
      }),
    );
    await expect
      .poll(async () => {
        const notification = await prisma.notification.findFirst({
          where: { orgId: org.id, title: "Scheduled maintenance Sunday 2-3 AM", status: "SENT" },
          orderBy: { createdAt: "desc" },
        });
        if (!notification) return false;
        const recipient = await prisma.notificationRecipient.findUnique({
          where: {
            notificationId_userId: {
              notificationId: notification.id,
              userId: member.id,
            },
          },
        });
        return Boolean(recipient);
      })
      .toBe(true);

    const flag = await expectApiOk<{ flag: { key: string; enabled: boolean } }>(
      await page.request.patch("/api/platform/flags", {
        data: { key: "platform.playwright", enabled: true, rolloutPercent: 100 },
      }),
    );
    expect(flag.data.flag).toMatchObject({ key: "platform.playwright", enabled: true });

    const session = await prisma.paymentSession.create({
      data: {
        orgId: org.id,
        userId: member.id,
        provider: "mock",
        purpose: "OTHER",
        amountPaise: 32100,
        status: "CREATED",
        checkoutUrl: "mock://phase3-replay",
        providerRef: `phase3_replay_${Date.now()}`,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
    const event = await prisma.paymentEvent.create({
      data: {
        orgId: org.id,
        userId: member.id,
        sessionId: session.id,
        provider: "mock",
        providerEventId: `evt_platform_replay_${Date.now()}`,
        eventType: "payment.captured",
        status: "QUARANTINED",
        payload: { sessionId: session.id, status: "SUCCEEDED" },
        attemptCount: 1,
        processedAt: new Date(),
        processingError: "fixture failure before replay",
      },
    });
    const attempt = await prisma.paymentWebhookAttempt.create({
      data: {
        paymentEventId: event.id,
        attemptNo: 1,
        status: "FAILED",
        processor: "playwright",
        errorMessage: "fixture failure",
      },
    });
    const replay = await expectApiOk<{ attempt: { id: string; status: string } }>(
      await page.request.post(`/api/platform/webhooks/${attempt.id}/replay`, { data: {} }),
    );
    expect(replay.data.attempt.status).toBe("SUCCEEDED");
    await expect
      .poll(async () => {
        const updated = await prisma.paymentSession.findUnique({ where: { id: session.id } });
        return updated?.status;
      })
      .toBe("SUCCEEDED");
    const paymentCount = await prisma.payment.count({ where: { sessionId: session.id } });
    expect(paymentCount).toBe(1);
    await expectApiOk(
      await page.request.post(`/api/platform/webhooks/${attempt.id}/replay`, { data: {} }),
    );
    await expect(prisma.payment.count({ where: { sessionId: session.id } })).resolves.toBe(1);

    const moderation = await prisma.contentModerationFlag.create({
      data: { orgId: org.id, kind: "ORG_LOGO", reason: "Playwright review" },
    });
    const decided = await expectApiOk<{ flag: { id: string; status: string } }>(
      await page.request.post("/api/platform/moderation", {
        data: { id: moderation.id, decision: "APPROVED", reason: "Looks fine" },
      }),
    );
    expect(decided.data.flag).toMatchObject({ id: moderation.id, status: "APPROVED" });

    const audit = await expectApiOk<{ auditLogs: Array<{ action: string }> }>(
      await page.request.get(`/api/platform/audit?user=${platform.id}`),
    );
    expect(audit.data.auditLogs.some((row) => row.action.startsWith("platform."))).toBe(true);

    await expect(page.getByRole("heading", { name: /platform support console/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("heading", { name: /feature flags/i })).toBeVisible();
  });
});
