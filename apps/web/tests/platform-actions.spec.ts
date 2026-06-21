import { expect, test } from "@playwright/test";
import { prisma } from "@zook/db";
import { expectApiOk, loginWithSessionCookie, seedAndGetOrg } from "./helpers";
import { requireDb } from "./helpers/db";

test.describe("platform admin actions", () => {
  test.beforeEach(() => {
    requireDb();
  });

  test("platform admin searches organizations and suspends/restores a gym account", async ({
    page,
  }) => {
    await loginWithSessionCookie(page, "platform@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });

    const list = await expectApiOk<{
      orgs: Array<{ id: string; username: string; status: string }>;
    }>(await page.request.get("/api/platform/orgs"));
    expect(list.data.orgs.some((row) => row.id === org.id && row.username === org.username)).toBe(
      true,
    );

    const suspended = await expectApiOk<{ org: { id: string; status: string } }>(
      await page.request.patch(`/api/platform/orgs/${org.id}/status`, {
        data: { status: "SUSPENDED" },
      }),
    );
    expect(suspended.data.org).toMatchObject({ id: org.id, status: "SUSPENDED" });
    await expect(
      prisma.auditLog.findFirst({
        where: { orgId: org.id, action: "platform.organization_status_updated" },
        orderBy: { createdAt: "desc" },
      }),
    ).resolves.toMatchObject({
      entityId: org.id,
    });

    const restored = await expectApiOk<{ org: { id: string; status: string } }>(
      await page.request.patch(`/api/platform/orgs/${org.id}/status`, {
        data: { status: "ACTIVE" },
      }),
    );
    expect(restored.data.org).toMatchObject({ id: org.id, status: "ACTIVE" });

    await page.goto("/platform?section=organizations");
    await expect(page.getByRole("heading", { name: /Gym accounts/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("row", { name: /aarogya-strength/i })).toBeVisible();
    await expect(
      page
        .getByRole("row", { name: /aarogya-strength/i })
        .getByRole("button", { name: /suspend/i }),
    ).toBeEnabled();
  });

  test("platform subscriptions and provider diagnostics are protected and render operational state", async ({
    page,
  }) => {
    await loginWithSessionCookie(page, "platform@zook.local");

    const subscriptions = await expectApiOk<{
      summary: { totalOrgs: number };
      rows: Array<{ username: string; orgStatus: string }>;
    }>(await page.request.get("/api/platform/subscriptions"));
    expect(subscriptions.data.summary.totalOrgs).toBeGreaterThan(0);
    expect(subscriptions.data.rows.some((row) => row.username === "aarogya-strength")).toBe(true);

    const providers = await expectApiOk<{ providers: Record<string, { status: string }> }>(
      await page.request.get("/api/platform/provider-status"),
    );
    expect(Object.keys(providers.data.providers).length).toBeGreaterThan(0);

    await loginWithSessionCookie(page, "owner@zook.local");
    expect((await page.request.get("/api/platform/orgs")).status()).toBe(403);
    expect(
      (
        await page.request.patch("/api/platform/orgs/not-real/status", {
          data: { status: "ACTIVE" },
        })
      ).status(),
    ).toBe(403);
  });

  test("platform referral policy persists in base units", async ({ page }) => {
    await loginWithSessionCookie(page, "platform@zook.local");
    await prisma.platformSetting.deleteMany({ where: { key: "platform.referralPolicy" } });

    const policy = {
      enabled: true,
      referrerRewardType: "CREDIT_AMOUNT",
      referrerRewardValue: 25000,
      referredRewardType: "DISCOUNT_PERCENT",
      referredRewardValue: 1500,
      maxRedemptionsPerOrg: 12,
      expiresInDays: 90,
    };

    const patched = await expectApiOk<{ policy: typeof policy; setting: { key: string } }>(
      await page.request.patch("/api/platform/referral-policy", { data: policy }),
    );
    expect(patched.data.policy).toEqual(policy);
    expect(patched.data.setting.key).toBe("platform.referralPolicy");

    await expect(
      prisma.platformSetting.findUnique({ where: { key: "platform.referralPolicy" } }),
    ).resolves.toMatchObject({ value: policy });

    const fetched = await expectApiOk<{ policy: typeof policy }>(
      await page.request.get("/api/platform/referral-policy"),
    );
    expect(fetched.data.policy).toEqual(policy);
  });

  test("platform operations exposes support, payments, broadcasts, moderation, and impersonations", async ({
    page,
  }) => {
    await loginWithSessionCookie(page, "platform@zook.local");
    await page.goto("/platform/users");
    await expect(page.getByRole("heading", { name: /platform support console/i })).toBeVisible();
    await page.goto("/platform/payments");
    await expect(page.getByRole("heading", { name: /payment ledger/i })).toBeVisible();
    await page.goto("/platform/broadcasts");
    await expect(page.getByRole("heading", { name: /platform broadcasts/i })).toBeVisible();
    await page.goto("/platform/moderation");
    await expect(page.getByRole("heading", { name: /content moderation queue/i })).toBeVisible();
    await page.goto("/platform/impersonations");
    await expect(page.getByRole("heading", { name: /support impersonation history/i })).toBeVisible();
    await page.goto("/platform/gyms");
    await expect(page.getByRole("button", { name: /extend trial/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /transfer owner/i }).first()).toBeVisible();
  });
});
