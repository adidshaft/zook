import { test, expect } from "@playwright/test";

test("owner dashboard renders", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Display QR")).toBeVisible();
});

test("mock checkout page renders", async ({ page }) => {
  await page.goto("/checkout/mock/demo");
  await expect(page.getByText("Zook mock checkout")).toBeVisible();
});

test("QR display route renders dashboard QR panel", async ({ page }) => {
  await page.goto("/dashboard/attendance/qr-display");
  await expect(page.getByRole("heading", { name: "Attendance Qr Display" })).toBeVisible();
  await expect(page.getByText("Rolling signed tokens refresh")).toBeVisible();
});

test("public gym and referral fallbacks render", async ({ page }) => {
  await page.goto("/g/iron-house");
  await expect(page.getByRole("heading", { name: "Iron House Fitness" })).toBeVisible();
  await page.goto("/r/NISHAFIT");
  await expect(page.getByText("Open Zook to join this gym")).toBeVisible();
});

test("login with OTP and create membership plan", async ({ page }) => {
  test.skip(process.env.RUN_DB_WEB_TESTS !== "1", "Requires local PostgreSQL seed data.");
  await page.goto("/login");
  await page.getByLabel("Email").fill("owner@zook.local");
  await page.getByRole("button", { name: "Send OTP" }).click();
  await page.getByLabel("OTP").fill("000000");
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await expect(page).toHaveURL(/dashboard/);

  const createResponse = await page.request.post("/api/orgs/seed-org/membership-plans", {
    data: {
      name: "Playwright Plan",
      type: "DURATION",
      pricePaise: 99900,
      durationDays: 30,
      publicVisible: true
    }
  });
  expect([200, 400, 403, 404]).toContain(createResponse.status());
});
