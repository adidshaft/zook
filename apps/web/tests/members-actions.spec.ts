import { expect, test } from "@playwright/test";
import { prisma } from "@zook/db";
import {
  createMembershipPlan,
  expectApiOk,
  loginWithSessionCookie,
  seedAndGetOrg,
} from "./helpers";
import { requireDb } from "./helpers/db";

test.describe("members actions", () => {
  test.beforeEach(() => {
    requireDb();
  });

  test("owner imports members, activates a plan, opens the roster, and gets DB read-back", async ({
    page,
  }) => {
    test.setTimeout(150_000);
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const plan = await createMembershipPlan(page, org.id, {
      name: `Member Action Plan ${Date.now()}`,
      pricePaise: 149900,
      durationDays: 45,
    });
    const email = `member-action-${Date.now()}@zook.local`;
    const phone = `+91 90000 ${String(Date.now()).slice(-5)}`;

    const importResponse = await page.request.post(`/api/orgs/${org.id}/members/import`, {
      data: {
        csv: `name,email,phone\nAction Member,${email},${phone}`,
        planId: plan.id,
        activateSubscription: true,
        sendWelcomeNotification: true,
      },
    });
    const importPayload = await expectApiOk<{
      summary: { created: number; errors: number };
      results: Array<{ email?: string; status: string }>;
    }>(importResponse);
    expect(importPayload.data.summary).toMatchObject({ created: 1, errors: 0 });
    expect(importPayload.data.results[0]).toMatchObject({ email, status: "created" });

    await page.goto("/dashboard/members");
    await page.getByPlaceholder(/search name/i).fill(email);
    await expect(page.getByText(email)).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "View" }).first().click();
    await expect(page.getByText("Action Member").first()).toBeVisible();
    await expect(page.getByText(plan.name).first()).toBeVisible();

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    await expect(
      prisma.memberProfile.findFirst({ where: { orgId: org.id, userId: user.id } }),
    ).resolves.toBeTruthy();
    await expect(
      prisma.memberSubscription.findFirst({
        where: { orgId: org.id, memberUserId: user.id, planId: plan.id, status: "ACTIVE" },
      }),
    ).resolves.toBeTruthy();
    await expect(
      prisma.notificationRecipient.findFirst({ where: { userId: user.id } }),
    ).resolves.toBeTruthy();
  });

  test("reception and trainer member access is read-scoped by API permissions", async ({
    page,
  }) => {
    const org = await seedAndGetOrg({ username: "aarogya-strength" });

    await loginWithSessionCookie(page, "reception@zook.local");
    await expect((await page.request.get(`/api/orgs/${org.id}/members?limit=5`)).status()).toBe(
      200,
    );
    await expect(
      (
        await page.request.post(`/api/orgs/${org.id}/members/import`, {
          data: { csv: "name,email\nForbidden,forbidden-reception@zook.local" },
        })
      ).status(),
    ).toBe(403);

    await loginWithSessionCookie(page, "trainer@zook.local");
    await expect((await page.request.get(`/api/orgs/${org.id}/members?limit=5`)).status()).toBe(
      200,
    );
    await expect(
      (
        await page.request.post(`/api/orgs/${org.id}/members/import`, {
          data: { csv: "name,email\nForbidden,forbidden-trainer@zook.local" },
        })
      ).status(),
    ).toBe(403);
  });

  test("owner edit/deactivate/reactivate/re-invite and bulk member controls are visible product gaps", async ({
    page,
  }) => {
    test.fail(
      true,
      "The current member dashboard supports import/search/view; the requested per-member edit/deactivate/re-invite and bulk action controls are not shipped yet.",
    );
    await loginWithSessionCookie(page, "owner@zook.local");
    await page.goto("/dashboard/members");
    expect(await page.getByRole("button", { name: /edit member/i }).count()).toBeGreaterThan(0);
    expect(await page.getByRole("button", { name: /deactivate member/i }).count()).toBeGreaterThan(
      0,
    );
    expect(await page.getByRole("button", { name: /resend invite/i }).count()).toBeGreaterThan(0);
    expect(await page.getByRole("button", { name: /bulk archive/i }).count()).toBeGreaterThan(0);
  });
});
