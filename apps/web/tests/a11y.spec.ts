import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { prisma } from "@zook/db";
import { loginWithSessionCookie, seedAndGetOrg } from "./helpers";
import { requireDb } from "./helpers/db";

test.setTimeout(60_000);

async function expectA11yClean(page: import("@playwright/test").Page) {
  // Wait for any entry transitions or fade-in animations to fully complete
  await page.waitForTimeout(500);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

async function expectFocusInside(
  page: import("@playwright/test").Page,
  dialog: ReturnType<import("@playwright/test").Page["locator"]>,
) {
  const focusedInside = await dialog.evaluate((node) => {
    const active = document.activeElement;
    return active instanceof HTMLElement && node.contains(active);
  });
  expect(focusedInside).toBe(true);
}

async function expectFocusTrap(
  page: import("@playwright/test").Page,
  dialog: ReturnType<import("@playwright/test").Page["locator"]>,
  tabPresses = 4,
) {
  await expectFocusInside(page, dialog);
  for (let index = 0; index < tabPresses; index += 1) {
    await page.keyboard.press("Tab");
    await expectFocusInside(page, dialog);
  }
}

test("dashboard passes axe checks", async ({ page }) => {
  requireDb();
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
  const org = await seedAndGetOrg({ username: "aarogya-strength" });
  await page.goto(`/g/${org.username}`);
  await expect(page.getByRole("heading", { name: org.name })).toBeVisible();
  await expectA11yClean(page);
});

test("public join page passes axe checks", async ({ page }) => {
  const org = await seedAndGetOrg({ username: "aarogya-strength" });
  await page.goto(`/join/${org.username}`);
  await expect(page.locator("h1").first()).toBeVisible();
  await expectA11yClean(page);
});

test("dashboard mobile menu dialog traps focus, closes on Escape, and passes axe checks", async ({
  page,
}) => {
  requireDb();
  await page.setViewportSize({ width: 390, height: 844 });
  await loginWithSessionCookie(page, "owner@zook.local");
  await page.goto("/dashboard");

  await page.getByRole("button", { name: /open menu/i }).click();
  const dialog = page.getByRole("dialog", { name: /open menu/i });
  await expect(dialog).toBeVisible();

  await expectFocusTrap(page, dialog);
  await expectA11yClean(page);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("shop product delete confirm dialog traps focus, closes on Escape, and passes axe checks", async ({
  page,
}) => {
  requireDb();
  await loginWithSessionCookie(page, "owner@zook.local");
  const org = await seedAndGetOrg({ username: "aarogya-strength" });
  const branch =
    (await prisma.branch.findFirst({ where: { orgId: org.id, isDefault: true } })) ??
    (await prisma.branch.findFirstOrThrow({ where: { orgId: org.id } }));
  const productName = `Playwright A11y Product ${Date.now()}`;

  await prisma.product.create({
    data: {
      orgId: org.id,
      branchId: branch.id,
      name: productName,
      category: "OTHER",
      pricePaise: 9900,
      stock: 3,
      lowStockThreshold: 1,
    },
  });

  await page.goto("/dashboard/shop");
  const productCard = page.locator("div.rounded-\\[24px\\]", { hasText: productName }).first();
  await expect(productCard).toBeVisible();
  await productCard.getByRole("button", { name: "Delete" }).click();

  const dialog = page.getByRole("dialog", { name: /delete product/i });
  await expect(dialog).toBeVisible();

  await expectFocusTrap(page, dialog);
  await expectA11yClean(page);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
