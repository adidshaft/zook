import { expect, test } from "@playwright/test";
import { prisma } from "@zook/db";
import { expectApiOk, loginWithSessionCookie, seedAndGetOrg } from "./helpers";
import { requireDb } from "./helpers/db";

test.describe("referral polish", () => {
  test.beforeEach(() => {
    requireDb();
  });

  test("owner sees top advocates, marks rewards paid, and referral velocity is flagged", async ({
    page,
  }) => {
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    await loginWithSessionCookie(page, "owner@zook.local");
    await expectApiOk(
      await page.request.patch(`/api/orgs/${org.id}/referral-policy`, {
        data: {
          enabled: true,
          referrerRewardType: "DAYS",
          referrerRewardValue: 7,
          referredDiscountType: "PERCENTAGE",
          referredDiscountValue: 1000,
          maxReferralsPerMonth: 10,
        },
      }),
    );
    const referralPayload = await expectApiOk<{ referral: { id: string; code: string } }>(
      await page.request.post(`/api/orgs/${org.id}/referrals`, { data: {} }),
    );

    for (let index = 0; index < 6; index += 1) {
      const user = await prisma.user.create({
        data: {
          email: `phase10-referral-${Date.now()}-${index}@zook.local`,
          name: `Phase 10 Referral ${index}`,
        },
      });
      await loginWithSessionCookie(page, user.email);
      await expectApiOk(
        await page.request.post(`/api/orgs/${org.id}/referrals/redeem`, {
          data: { code: referralPayload.data.referral.code },
        }),
      );
    }

    const reward = await prisma.referralReward.create({
      data: {
        orgId: org.id,
        referralCodeId: referralPayload.data.referral.id,
        redemptionId: (
          await prisma.referralRedemption.findFirstOrThrow({
            where: { orgId: org.id, referralCodeId: referralPayload.data.referral.id },
          })
        ).id,
        referrerUserId: (await prisma.user.findUniqueOrThrow({ where: { email: "owner@zook.local" } })).id,
        rewardType: "DAYS",
        rewardValue: 7,
      },
    });

    await loginWithSessionCookie(page, "owner@zook.local");
    const analytics = await expectApiOk<{
      summary: { openAbuseFlags: number };
      topReferrers: Array<{ abuseSignals: { redemptions24h: number; suspiciousClustering: boolean } }>;
      pendingRewards: Array<{ id: string }>;
    }>(await page.request.get(`/api/orgs/${org.id}/referral-analytics`));
    expect(analytics.data.summary.openAbuseFlags).toBeGreaterThanOrEqual(1);
    expect(analytics.data.topReferrers[0]?.abuseSignals).toMatchObject({
      redemptions24h: 6,
      suspiciousClustering: true,
    });
    expect(analytics.data.pendingRewards.map((item) => item.id)).toContain(reward.id);

    const paid = await expectApiOk<{ reward: { status: string } }>(
      await page.request.post(`/api/orgs/${org.id}/referral-rewards/${reward.id}/mark-paid`),
    );
    expect(paid.data.reward.status).toBe("applied");
  });
});
