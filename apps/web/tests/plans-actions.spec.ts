import { expect, test, type Response } from "@playwright/test";
import { prisma } from "@zook/db";
import {
  createMembershipPlan,
  expectApiOk,
  loginWithSessionCookie,
  seedAndGetOrg,
} from "./helpers";
import { requireDb } from "./helpers/db";

async function expectBrowserResponseOk(response: Response) {
  expect(response.ok(), await response.text()).toBeTruthy();
  await expect(response.json()).resolves.toMatchObject({ ok: true });
}

test.describe("plans, coupons, offers, and referrals actions", () => {
  test.beforeEach(() => {
    requireDb();
  });

  test("owner creates, edits, archives, and restores a membership plan", async ({ page }) => {
    test.setTimeout(150_000);
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const planName = `UI Plan ${Date.now().toString().slice(-6)}`;

    await page.goto("/dashboard/membership-plans");
    await page.getByPlaceholder("Plan name").first().fill(planName);
    await page.getByPlaceholder("Price in rupees").first().fill("2999");
    await page.getByPlaceholder("Duration days").first().fill("90");
    await page.getByPlaceholder("Visit limit").first().fill("45");
    await page.getByPlaceholder("Short public description").first().fill("Playwright action plan");
    await page.getByRole("button", { name: /^Create plan$/ }).click();
    await expect(page.getByText(planName)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("₹2,999")).toBeVisible();

    const created = await prisma.membershipPlan.findFirstOrThrow({
      where: { orgId: org.id, name: planName },
    });
    expect(created.pricePaise).toBe(299900);

    await page
      .getByRole("row", { name: new RegExp(planName) })
      .getByRole("button", { name: "Edit" })
      .click();
    await page.getByPlaceholder("Price in rupees").last().fill("3499");
    const editResponse = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/orgs/${org.id}/membership-plans/${created.id}`) &&
        response.request().method() === "PATCH",
    );
    await page.getByRole("button", { name: "Save plan" }).click();
    await expectBrowserResponseOk(await editResponse);
    await expect(
      page.getByRole("row", { name: new RegExp(planName) }).getByText("₹3,499"),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      prisma.membershipPlan.findUnique({ where: { id: created.id } }),
    ).resolves.toMatchObject({ pricePaise: 349900 });

    const archiveResponse = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/orgs/${org.id}/membership-plans/${created.id}`) &&
        response.request().method() === "PATCH",
    );
    await page
      .getByRole("row", { name: new RegExp(planName) })
      .getByRole("button", { name: "Archive" })
      .click();
    await expectBrowserResponseOk(await archiveResponse);
    await expect(
      prisma.membershipPlan.findUnique({ where: { id: created.id } }),
    ).resolves.toMatchObject({ active: false });
    const restoreResponse = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/orgs/${org.id}/membership-plans/${created.id}`) &&
        response.request().method() === "PATCH",
    );
    await page
      .getByRole("row", { name: new RegExp(planName) })
      .getByRole("button", { name: "Restore" })
      .click();
    await expectBrowserResponseOk(await restoreResponse);
    await expect(
      prisma.membershipPlan.findUnique({ where: { id: created.id } }),
    ).resolves.toMatchObject({ active: true });
  });

  test("coupon uniqueness, checkout preview, offer visibility, and referral status are persisted", async ({
    page,
  }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const plan = await createMembershipPlan(page, org.id, {
      name: `Coupon Plan ${Date.now()}`,
      pricePaise: 200000,
      publicVisible: true,
    });
    const code = `SAVE${Date.now().toString().slice(-6)}`;

    const couponPayload = await expectApiOk<{ coupon: { id: string; code: string } }>(
      await page.request.post(`/api/orgs/${org.id}/coupons`, {
        data: {
          code,
          type: "PERCENTAGE",
          valuePercentBps: 3000,
          maxRedemptions: 10,
          applicablePlanId: plan.id,
        },
      }),
    );
    const duplicate = await page.request.post(`/api/orgs/${org.id}/coupons`, {
      data: {
        code,
        type: "PERCENTAGE",
        valuePercentBps: 3000,
        applicablePlanId: plan.id,
      },
    });
    expect(duplicate.status()).toBeGreaterThanOrEqual(400);

    const preview = await expectApiOk<{ discountPaise: number; finalAmountPaise: number }>(
      await page.request.post(`/api/orgs/${org.id}/coupons/validate`, {
        data: { code, planId: plan.id },
      }),
    );
    expect(preview.data).toMatchObject({ discountPaise: 60000, finalAmountPaise: 140000 });

    const offer = await expectApiOk<{ offer: { id: string } }>(
      await page.request.post(`/api/orgs/${org.id}/offers`, {
        data: {
          name: `Offer ${Date.now()}`,
          discountType: "PERCENTAGE",
          discountValue: 1000,
          applicablePlanIds: [plan.id],
          startsAt: new Date(Date.now() - 60_000).toISOString(),
          endsAt: new Date(Date.now() + 60 * 60_000).toISOString(),
          active: true,
          stackable: false,
        },
      }),
    );
    const publicPayload = await expectApiOk<{
      plans: Array<{
        id: string;
        activeOffer?: { id: string } | null;
        effectivePricePaise?: number;
      }>;
    }>(await page.request.get(`/api/orgs/public/${org.username}`));
    const publicPlan = publicPayload.data.plans.find((candidate) => candidate.id === plan.id);
    expect(publicPlan?.activeOffer?.id).toBe(offer.data.offer.id);
    expect(publicPlan?.effectivePricePaise).toBe(180000);

    const member = await prisma.user.findUniqueOrThrow({ where: { email: "member@zook.local" } });
    const referral = await expectApiOk<{ referral: { id: string; status: string; code: string } }>(
      await page.request.post(`/api/orgs/${org.id}/referrals`, {
        data: {
          referrerUserId: member.id,
          couponId: couponPayload.data.coupon.id,
          createdByRole: "MEMBER",
          code: `PW${Date.now().toString().slice(-6)}`,
        },
      }),
    );
    expect(referral.data.referral.status).toBe("active");
    await expectApiOk(
      await page.request.patch(`/api/orgs/${org.id}/referrals/${referral.data.referral.id}`, {
        data: { status: "paused" },
      }),
    );
    await expect(
      prisma.referralCode.findUnique({ where: { id: referral.data.referral.id } }),
    ).resolves.toMatchObject({ status: "paused" });
  });

  test("plan duplicate and archived-filter UI controls are visible product gaps", async ({
    page,
  }) => {
    test.fail(
      true,
      "The membership plan screen currently edits/restores rows but does not ship separate duplicate or archived-filter controls.",
    );
    await loginWithSessionCookie(page, "owner@zook.local");
    await page.goto("/dashboard/membership-plans");
    expect(await page.getByRole("button", { name: /duplicate plan/i }).count()).toBeGreaterThan(0);
    expect(await page.getByRole("button", { name: /archived/i }).count()).toBeGreaterThan(0);
  });
});
