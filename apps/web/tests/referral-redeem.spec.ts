import { expect, test } from "@playwright/test";
import { prisma } from "@zook/db";
import { expectApiOk, loginWithSessionCookie, seedAndGetOrg } from "./helpers";

function requireDb() {
  if (process.env.RUN_DB_WEB_TESTS !== "1") {
    test.skip(true, "DB-gated tests run only when RUN_DB_WEB_TESTS=1.");
  }

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "RUN_DB_WEB_TESTS=1 was set, but DATABASE_URL is missing from the Playwright environment. Run `pnpm test:db:prepare` first.",
    );
  }
}

test("dedicated referral redeem endpoint creates an idempotent redemption", async ({ page }) => {
  requireDb();
  const org = await seedAndGetOrg({ username: "aarogya-strength" });

  await loginWithSessionCookie(page, "owner@zook.local");
  const referralPayload = await expectApiOk<{ referral: { id: string; code: string } }>(
    await page.request.post(`/api/orgs/${org.id}/referrals`, { data: {} }),
  );

  const referredUser = await prisma.user.create({
    data: {
      email: `referral-redeem-${Date.now()}@zook.local`,
      name: "Referral Redeem Member",
    },
  });
  await loginWithSessionCookie(page, referredUser.email);

  const firstRedeem = await expectApiOk<{
    redemption: { id: string; referredUserId: string; subscriptionId?: string | null };
    alreadyRedeemed: boolean;
  }>(
    await page.request.post(`/api/orgs/${org.id}/referrals/redeem`, {
      data: { code: referralPayload.data.referral.code },
    }),
  );
  expect(firstRedeem.data.alreadyRedeemed).toBe(false);
  expect(firstRedeem.data.redemption.referredUserId).toBe(referredUser.id);
  expect(firstRedeem.data.redemption.subscriptionId).toBeFalsy();

  const replay = await expectApiOk<{ redemption: { id: string }; alreadyRedeemed: boolean }>(
    await page.request.post(`/api/orgs/${org.id}/referrals/redeem`, {
      data: { code: referralPayload.data.referral.code },
    }),
  );
  expect(replay.data).toMatchObject({
    alreadyRedeemed: true,
    redemption: { id: firstRedeem.data.redemption.id },
  });
});

test("referral redeem endpoint requires authentication", async ({ request }) => {
  requireDb();
  const org = await seedAndGetOrg({ username: "aarogya-strength" });
  const response = await request.post(`/api/orgs/${org.id}/referrals/redeem`, {
    data: { code: "NOPE" },
  });
  expect(response.status()).toBe(401);
});
