import { expect, test } from "@playwright/test";
import { prisma } from "@zook/db";
import { expectApiOk, loginWithSessionCookie, seedAndGetOrg } from "./helpers";
import { requireDb } from "./helpers/db";

test.describe("misc dashboard actions", () => {
  test.beforeEach(() => {
    requireDb();
  });

  test("profile updates persist and show in the dashboard shell", async ({ page }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const currentUser = await prisma.user.findUniqueOrThrow({
      where: { email: "owner@zook.local" },
    });
    const profileName = `Aman Owner ${Date.now()}`;
    const payload = await expectApiOk<{ user: { name: string; phone?: string | null } }>(
      await page.request.patch("/api/me/profile", {
        data: {
          name: profileName,
          phone: currentUser.phone,
          gender: "prefer_not_to_say",
          dateOfBirth: "1990-01-01",
          emergencyContactName: "Pilot Desk",
          emergencyContactPhone: "9999999999",
        },
      }),
    );
    expect(payload.data.user).toMatchObject({ name: profileName, phone: currentUser.phone });
    await expect(
      prisma.user.findUnique({ where: { email: "owner@zook.local" } }),
    ).resolves.toMatchObject({ name: profileName, phone: currentUser.phone });

    await page.goto("/dashboard/profile");
    await expect(page.getByLabel("Account").getByText(profileName)).toBeVisible({
      timeout: 15_000,
    });
  });

  test("public profile publishing changes the live gym page and audit log", async ({ page }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const profile = await expectApiOk<{
      org: {
        name: string;
        username: string;
        contactPhone: string | null;
        contactEmail: string | null;
        address: string | null;
        city: string | null;
        state: string | null;
        pincode: string | null;
        visibility: "PUBLIC" | "INVITE_ONLY" | "HIDDEN";
        joinMode: "OPEN_JOIN" | "APPROVAL_REQUIRED" | "INVITE_ONLY";
      };
    }>(await page.request.get(`/api/orgs/${org.id}/profile`));
    const tagline = `Playwright live profile ${Date.now()}`;

    const updated = await expectApiOk<{ org: { tagline: string; joinMode: string } }>(
      await page.request.patch(`/api/orgs/${org.id}/profile`, {
        data: {
          name: profile.data.org.name,
          username: profile.data.org.username,
          contactPhone: profile.data.org.contactPhone ?? "9876543210",
          contactEmail: profile.data.org.contactEmail ?? "owner@zook.local",
          address: profile.data.org.address ?? "Zook Test Lane",
          city: profile.data.org.city ?? "Bengaluru",
          state: profile.data.org.state ?? "Karnataka",
          pincode: profile.data.org.pincode ?? "560001",
          amenities: ["Strength floor", "Cardio"],
          equipment: ["Rack", "Bike"],
          visibility: "PUBLIC",
          joinMode: "APPROVAL_REQUIRED",
          logoUrl: "",
          coverImageUrl: "",
          tagline,
          gallery: [],
          facilities: ["Showers", "Lockers"],
          gymType: "Strength studio",
          openingHoursSummary: "6am to 10pm",
          appStoreUrl: "",
          playStoreUrl: "",
        },
      }),
    );
    expect(updated.data.org).toMatchObject({ tagline, joinMode: "APPROVAL_REQUIRED" });
    await expect(
      prisma.auditLog.findFirst({
        where: { orgId: org.id, action: "organization.public_profile_updated" },
        orderBy: { createdAt: "desc" },
      }),
    ).resolves.toBeTruthy();

    await page.goto(`/g/${org.username}`);
    await expect(page.getByText(tagline)).toBeVisible({ timeout: 15_000 });
  });

  test("reports, audit export, and audit detail drawer produce stateful output", async ({
    page,
  }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const auditAction = `playwright.audit.filter.${Date.now()}`;
    await prisma.auditLog.create({
      data: {
        orgId: org.id,
        actorUserId: (await prisma.user.findUniqueOrThrow({ where: { email: "owner@zook.local" } }))
          .id,
        action: auditAction,
        entityType: "test",
        entityId: "misc-actions",
        before: { status: "before" },
        after: { status: "after" },
        metadata: { suite: "misc-actions" },
      },
    });

    const revenueCsv = await page.request.get(`/api/orgs/${org.id}/reports/revenue.csv`);
    expect(revenueCsv.status()).toBe(200);
    expect(revenueCsv.headers()["content-type"]).toContain("text/csv");
    await expect(revenueCsv.text()).resolves.toContain("report");

    const auditCsv = await page.request.get(`/api/orgs/${org.id}/audit-logs.csv`);
    expect(auditCsv.status()).toBe(200);
    await expect(auditCsv.text()).resolves.toContain(auditAction);

    await page.goto("/dashboard/audit");
    await expect(page.getByRole("heading", { name: /Admin activity/i })).toBeVisible({
      timeout: 15_000,
    });
    await page
      .getByRole("row", { name: new RegExp(auditAction.replaceAll(".", "\\."), "i") })
      .getByRole("button", { name: /details/i })
      .click();
    await expect(page.getByRole("dialog", { name: /Change details/i })).toContainText("after");

    await page.goto("/dashboard/reports");
    await expect(page.getByText(/Revenue trend/i)).toBeVisible();
    await page.getByRole("button", { name: /30 days/i }).click();
    await expect(page.getByText("last 30 days", { exact: true })).toBeVisible();
  });

  test("AI chat persists assistant response history and dashboard AI renders the draft", async ({
    page,
  }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const promptMarker = `PW-AI-${Date.now()}`;
    // WHY: the seeded AI history can contain repeated natural-language prompts, so assert the row by a per-test marker.
    const prompt = `${promptMarker} Create a gym operations retention note for member Nisha's strength training attendance and renewal follow-up`;

    const chat = await expectApiOk<{ response: string; conversationId: string }>(
      await page.request.post("/api/ai/chat", {
        data: { orgId: org.id, prompt },
      }),
    );
    expect(chat.data.response.length).toBeGreaterThan(10);
    await expect(
      prisma.aIUsageLog.findFirst({
        where: { orgId: org.id, promptSummary: { startsWith: prompt.slice(0, 80) } },
      }),
    ).resolves.toBeTruthy();

    await page.goto("/dashboard/ai");
    await expect(page.getByRole("row", { name: new RegExp(promptMarker) })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("billing profile and subscription controls persist owner setup", async ({ page }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const billing = await expectApiOk<{
      billingProfile: { legalName: string; invoiceReady: boolean };
    }>(
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
    expect(billing.data.billingProfile).toMatchObject({
      legalName: "Aarogya Strength Private Limited",
      invoiceReady: true,
    });

    const subscription = await expectApiOk<{ subscription: { orgStatus: string } }>(
      await page.request.get(`/api/orgs/${org.id}/billing/subscription`),
    );
    expect(subscription.data.subscription.orgStatus).toBeTruthy();

    await page.goto("/dashboard/billing");
    await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("owner-facing AI prompt box and save-draft action are visible product gaps", async ({
    page,
  }) => {
    test.fail(
      true,
      "The dashboard currently renders AI as read-only preview; keep this visible until prompt/save-draft ships.",
    );
    await loginWithSessionCookie(page, "owner@zook.local");
    await page.goto("/dashboard/ai");
    expect(await page.getByRole("textbox", { name: /prompt|message/i }).count()).toBeGreaterThan(0);
    expect(await page.getByRole("button", { name: /save draft/i }).count()).toBeGreaterThan(0);
  });
});
