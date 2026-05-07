import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginWithSessionCookie, seedAndGetOrg } from "./helpers";

async function expectA11yClean(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

test("dashboard passes axe checks", async ({ page }) => {
  await loginWithSessionCookie(page, "owner@zook.local");
  await page.goto("/dashboard");
  await expect(page.locator("h1").first()).toBeVisible();
  await expectA11yClean(page);
});

test("login passes axe checks", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  await expectA11yClean(page);
});

test("public gym profile passes axe checks", async ({ page }) => {
  const org = await seedAndGetOrg({ username: "iron-house" });
  await page.goto(`/g/${org.username}`);
  await expect(page.getByRole("heading", { name: org.name })).toBeVisible();
  await expectA11yClean(page);
});

test("public join page passes axe checks", async ({ page }) => {
  const org = await seedAndGetOrg({ username: "iron-house" });
  await page.goto(`/join/${org.username}`);
  await expect(page.getByRole("heading")).toBeVisible();
  await expectA11yClean(page);
});
