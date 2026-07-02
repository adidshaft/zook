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

    await page.goto("/platform/gyms");
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
      referrerRewardType: "CREDIT_PAISE",
      referrerRewardValue: 25000,
      referredRewardType: "DISCOUNT_PERCENT_BPS",
      referredRewardValue: 1500,
      nonOwnerSemiannualRewardPaise: 100_000,
      nonOwnerYearlyRewardPaise: 200_000,
      ownerRewardDays: 30,
      qualifyingCycles: ["SEMIANNUAL", "YEARLY"],
      clawbackWindowDays: 30,
      minWithdrawalPaise: 50_000,
      maxRewardsPerUserPerMonth: 4,
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

  test("platform business overview surfaces referral economics and payout actions", async ({
    page,
  }) => {
    await loginWithSessionCookie(page, "platform@zook.local");
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "member@zook.local" } });
    const uniqueOrgId = `platform-referral-test-${Date.now()}`;
    await prisma.rewardLedgerEntry.create({
      data: {
        userId: user.id,
        kind: "MEMBER_TO_GYM_CASH",
        source: "PLATFORM",
        referredOrgId: uniqueOrgId,
        amountPaise: 125_000,
        status: "PAYABLE",
        qualifiedAt: new Date(),
        payableAt: new Date(),
      },
    });
    const withdrawal = await prisma.rewardWithdrawal.create({
      data: {
        userId: user.id,
        amountPaise: 125_000,
        status: "REQUESTED",
      },
    });

    await page.goto("/platform");
    await expect(page.getByRole("heading", { name: /command overview/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/MRR estimate/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /reward payouts to release/i })).toBeVisible();

    await page.goto("/platform/referrals");
    await expect(page.getByRole("heading", { name: /rewards, payouts, and policy/i })).toBeVisible();
    await expect(page.getByText(/cost \/ gym referral/i)).toBeVisible();
    await expect(page.getByText(/monthly payout exposure/i)).toBeVisible();
    await page
      .getByRole("button", { name: /mark paid/i })
      .first()
      .click();
    await expect
      .poll(async () => {
        const updated = await prisma.rewardWithdrawal.findUnique({ where: { id: withdrawal.id } });
        return updated?.status;
      })
      .toBe("PAID");
  });

  test("platform operations exposes support, payments, broadcasts, moderation, and impersonations", async ({
    page,
  }) => {
    await loginWithSessionCookie(page, "platform@zook.local");
    await page.goto("/platform/users");
    await expect(page.getByRole("heading", { name: /platform support console/i })).toBeVisible();
    await page.goto("/platform/payments");
    await expect(page.getByRole("heading", { name: /payment records/i })).toBeVisible();
    await page.goto("/platform/broadcasts");
    await expect(page.getByRole("heading", { name: /platform broadcasts/i })).toBeVisible();
    await page.goto("/platform/moderation");
    await expect(page.getByRole("heading", { name: /content moderation queue/i })).toBeVisible();
    await page.goto("/platform/impersonations");
    await expect(page.getByRole("heading", { name: /support access log/i })).toBeVisible();
    await page.goto("/platform/gyms");
    await expect(page.getByRole("button", { name: /activate/i }).first()).toBeVisible();
  });

  test("platform gym actions use custom dialogs instead of native prompts", async ({ page }) => {
    await loginWithSessionCookie(page, "platform@zook.local");

    const nativeDialogs: string[] = [];
    page.on("dialog", async (dialog) => {
      nativeDialogs.push(`${dialog.type()}:${dialog.message()}`);
      await dialog.dismiss();
    });

    await page.goto("/platform/gyms");
    await expect(page.getByRole("heading", { name: /gym accounts/i })).toBeVisible({
      timeout: 15_000,
    });

    const row = page.getByRole("row", { name: /aarogya-strength/i });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: /details/i }).click();
    await expect(page.getByText("Gym account details")).toBeVisible();

    async function expectCustomDialog(buttonName: RegExp, title: RegExp) {
      await page.getByRole("button", { name: buttonName }).click();
      const dialog = page.getByRole("dialog", { name: title });
      await expect(dialog).toBeVisible();
      await dialog.getByRole("button", { name: /cancel/i }).click();
      await expect(dialog).toBeHidden();
    }

    await expectCustomDialog(/credit/i, /adjust credit/i);
    await expectCustomDialog(/^tier$/i, /change tier/i);
    await expectCustomDialog(/rename/i, /rename gym/i);
    await expectCustomDialog(/import csv/i, /import members/i);
    await expectCustomDialog(/transfer owner/i, /transfer owner/i);

    await page.getByRole("button", { name: /^suspend$/i }).last().click();
    const statusDialog = page.getByRole("dialog", { name: /change to suspended/i });
    await expect(statusDialog).toBeVisible();
    await statusDialog.getByRole("button", { name: /cancel/i }).click();
    await expect(statusDialog).toBeHidden();

    expect(nativeDialogs).toEqual([]);
  });
});
