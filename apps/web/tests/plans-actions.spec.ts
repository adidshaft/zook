import { expect, test } from "@playwright/test";
import { prisma } from "@zook/db";
import {
  createMembershipPlan,
  expectApiOk,
  loginWithSessionCookie,
  seedAndGetOrg,
} from "./helpers";
import { requireDb } from "./helpers/db";

test.describe("plans, coupons, offers, and referrals actions", () => {
  test.beforeEach(() => {
    requireDb();
  });

  test("owner creates a membership plan from the dashboard form", async ({ page }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const branch = await prisma.branch.findFirstOrThrow({
      where: { orgId: org.id, isDefault: true, active: true },
    });
    const planName = `UI Created Plan ${Date.now().toString().slice(-6)}`;

    await page.goto(`/dashboard/membership-plans?branchId=${branch.id}`);
    await expect(page.getByRole("heading", { name: "Membership catalog" })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByLabel("Plan name").fill(planName);
    await page.getByLabel("Price").fill("2599");
    await page.getByLabel("Duration days").fill("60");
    await page.getByLabel("Visit limit").fill("20");
    await page.getByRole("button", { name: "Create plan" }).click();

    const planRow = page.getByRole("row", { name: new RegExp(planName) });
    await expect(planRow).toBeVisible({ timeout: 15_000 });
    await expect(planRow.getByText("₹2,599")).toBeVisible();
    await expect(
      prisma.membershipPlan.findFirst({
        where: { orgId: org.id, branchId: branch.id, name: planName },
      }),
    ).resolves.toMatchObject({
      pricePaise: 259900,
      durationDays: 60,
      visitLimit: 20,
      publicVisible: true,
    });
  });

  test("owner edits, archives, and restores a membership plan", async ({ page }) => {
    test.setTimeout(150_000);
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const defaultBranch = await prisma.branch.findFirstOrThrow({
      where: { orgId: org.id, isDefault: true, active: true },
    });
    const planName = `UI Plan ${Date.now().toString().slice(-6)}`;
    const created = await createMembershipPlan(page, org.id, {
      name: planName,
      type: "HYBRID",
      pricePaise: 299900,
      durationDays: 90,
      publicVisible: true,
      branchId: defaultBranch.id,
    });

    await page.goto(`/dashboard/membership-plans?branchId=${defaultBranch.id}`);
    await expect(page.getByRole("heading", { name: "Membership catalog" })).toBeVisible({
      timeout: 30_000,
    });
    expect(created).toMatchObject({
      pricePaise: 299900,
      durationDays: 90,
    });
    const planRow = page.getByRole("row", { name: new RegExp(planName) });
    await expect(planRow).toBeVisible({ timeout: 30_000 });
    await expect(planRow.getByText("₹2,999")).toBeVisible();

    await page
      .getByRole("row", { name: new RegExp(planName) })
      .getByRole("button", { name: "Edit" })
      .click();
    await page.getByPlaceholder("Price in rupees").last().fill("3499");
    await page.getByRole("button", { name: "Save plan" }).click();
    await expect(
      page.getByRole("row", { name: new RegExp(planName) }).getByText("₹3,499"),
    ).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(() => prisma.membershipPlan.findUnique({ where: { id: created.id } }), {
        timeout: 15_000,
      })
      .toMatchObject({ pricePaise: 349900 });

    await page
      .getByRole("row", { name: new RegExp(planName) })
      .getByRole("button", { name: "Archive" })
      .click();
    await expect
      .poll(() => prisma.membershipPlan.findUnique({ where: { id: created.id } }), {
        timeout: 15_000,
      })
      .toMatchObject({ active: false });
    await page
      .getByRole("row", { name: new RegExp(planName) })
      .getByRole("button", { name: "Restore" })
      .click();
    await expect
      .poll(() => prisma.membershipPlan.findUnique({ where: { id: created.id } }), {
        timeout: 15_000,
      })
      .toMatchObject({ active: true });
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

  test("owner creates a coupon from the dashboard form", async ({ page }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const code = `UI${Date.now().toString().slice(-6)}`;

    await page.goto("/dashboard/plans/coupons");
    await expect(page.getByRole("heading", { name: "Coupons" })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByLabel("Coupon code").fill(code);
    await page.getByLabel("Discount value").fill("12");
    await page.getByLabel("Max uses").fill("9");
    await page.getByRole("button", { name: "Create coupon" }).click();

    await expect(page.getByText("Coupon created.")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(code).first()).toBeVisible();
    await expect(
      prisma.coupon.findFirst({
        where: { orgId: org.id, code },
      }),
    ).resolves.toMatchObject({
      type: "PERCENTAGE",
      valuePercentBps: 1200,
      maxRedemptions: 9,
      active: true,
    });
  });

  test("owner duplicates a plan draft and filters archived plans", async ({ page }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const branch = await prisma.branch.findFirstOrThrow({
      where: { orgId: org.id, isDefault: true, active: true },
    });
    const sourcePlan = await createMembershipPlan(page, org.id, {
      name: `Duplicate Source ${Date.now().toString().slice(-6)}`,
      pricePaise: 123400,
      durationDays: 45,
      branchId: branch.id,
    });
    const archivedPlan = await createMembershipPlan(page, org.id, {
      name: `Archived Filter ${Date.now().toString().slice(-6)}`,
      pricePaise: 98700,
      branchId: branch.id,
    });
    await prisma.membershipPlan.update({
      where: { id: archivedPlan.id },
      data: { active: false },
    });

    await page.goto(`/dashboard/membership-plans?branchId=${branch.id}`);
    await expect(page.getByRole("row", { name: new RegExp(sourcePlan.name) })).toBeVisible({
      timeout: 30_000,
    });
    await page
      .getByRole("row", { name: new RegExp(sourcePlan.name) })
      .getByRole("button", { name: "Duplicate plan" })
      .click();
    await expect(page.getByLabel("Plan name").first()).toHaveValue(`${sourcePlan.name} copy`);
    await expect(page.getByLabel("Price").first()).toHaveValue("1234");

    await expect(page.getByRole("row", { name: new RegExp(archivedPlan.name) })).toBeVisible();
    await page.getByRole("button", { name: /hide archived/i }).click();
    await expect(page.getByRole("row", { name: new RegExp(archivedPlan.name) })).toHaveCount(0);
    await page.getByRole("button", { name: /show archived/i }).click();
    await expect(page.getByRole("row", { name: new RegExp(archivedPlan.name) })).toBeVisible();
  });

  test("selected branch membership plans exclude legacy shared plans", async ({ page }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const owner = await prisma.user.findUniqueOrThrow({ where: { email: "owner@zook.local" } });
    const branch = await prisma.branch.findFirstOrThrow({
      where: { orgId: org.id, isDefault: true, active: true },
    });
    const sharedPlan = await prisma.membershipPlan.create({
      data: {
        orgId: org.id,
        branchId: null,
        createdById: owner.id,
        name: `Shared Plan ${Date.now()}`,
        type: "DURATION",
        pricePaise: 111100,
        durationDays: 30,
        publicVisible: true,
      },
    });
    const branchPlan = await createMembershipPlan(page, org.id, {
      name: `Branch Plan ${Date.now()}`,
      pricePaise: 222200,
      branchId: branch.id,
    });

    const payload = await expectApiOk<{ plans: Array<{ id: string }> }>(
      await page.request.get(`/api/orgs/${org.id}/membership-plans?branchId=${branch.id}`),
    );
    expect(payload.data.plans.some((plan) => plan.id === branchPlan.id)).toBe(true);
    expect(payload.data.plans.some((plan) => plan.id === sharedPlan.id)).toBe(false);
  });
});
