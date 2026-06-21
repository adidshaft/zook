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

  test("owner deactivates, reactivates, and bulk archives members from the roster", async ({
    page,
  }) => {
    test.setTimeout(150_000);
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const plan = await createMembershipPlan(page, org.id, {
      name: `Member Access Plan ${Date.now()}`,
      pricePaise: 99900,
      durationDays: 30,
    });
    const suffix = Date.now();
    const firstEmail = `member-access-${suffix}@zook.local`;
    const secondEmail = `member-bulk-${suffix}@zook.local`;

    const importResponse = await page.request.post(`/api/orgs/${org.id}/members/import`, {
      data: {
        csv: `name,email,phone\nAccess Member,${firstEmail},+91 90000 ${String(suffix).slice(-5)}\nBulk Member,${secondEmail},+91 91111 ${String(suffix).slice(-5)}`,
        planId: plan.id,
        activateSubscription: true,
        sendWelcomeNotification: false,
      },
    });
    await expectApiOk(importResponse);

    await page.goto("/dashboard/members");
    await page.getByPlaceholder(/search name/i).fill(firstEmail);
    await expect(page.getByText(firstEmail)).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Deactivate member" }).first().click();

    const firstUser = await prisma.user.findUniqueOrThrow({ where: { email: firstEmail } });
    await expect
      .poll(async () => {
        const membership = await prisma.organizationUser.findUnique({
          where: { orgId_userId: { orgId: org.id, userId: firstUser.id } },
        });
        return membership?.status;
      })
      .toBe("inactive");
    await expect(page.getByRole("button", { name: "Reactivate member" })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("button", { name: "Reactivate member" }).first().click();
    await expect
      .poll(async () => {
        const membership = await prisma.organizationUser.findUnique({
          where: { orgId_userId: { orgId: org.id, userId: firstUser.id } },
        });
        return membership?.status;
      })
      .toBe("active");

    await page.getByPlaceholder(/search name/i).fill(secondEmail);
    await expect(page.getByText(secondEmail)).toBeVisible({ timeout: 15_000 });
    await page.getByRole("checkbox", { name: "Select Bulk Member" }).check();
    await page.getByRole("button", { name: "Bulk archive" }).click();

    const secondUser = await prisma.user.findUniqueOrThrow({ where: { email: secondEmail } });
    await expect
      .poll(async () => {
        const membership = await prisma.organizationUser.findUnique({
          where: { orgId_userId: { orgId: org.id, userId: secondUser.id } },
        });
        return membership?.status;
      })
      .toBe("inactive");
    await expect(page.getByText("1 member archived.")).toBeVisible({ timeout: 15_000 });
  });
});
