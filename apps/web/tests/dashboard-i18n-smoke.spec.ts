import { expect, test } from "@playwright/test";
import { prisma } from "@zook/db";
import { loginWithSessionCookie } from "./helpers";

function requireDb() {
  if (process.env.RUN_DB_WEB_TESTS !== "1") {
    test.skip(true, "Dashboard i18n smoke runs against the seeded DB.");
  }
}

const smokeRoutes = [
  {
    path: "/dashboard",
    english: "Run the gym, not the spreadsheet",
    hindi: "स्प्रेडशीट नहीं, जिम चलाएं",
  },
  {
    path: "/dashboard/members",
    english: "Total members",
    hindi: "कुल मेंबर्स",
  },
  {
    path: "/dashboard/payments",
    english: "Payment reconciliation",
    hindi: "Payment या pickup",
  },
  {
    path: "/dashboard/plans",
    english: "Membership catalog",
    hindi: "Discounts, offers और referrals",
  },
  {
    path: "/dashboard/classes",
    english: "Schedule a group class",
    hindi: "Group class schedule करें",
  },
  {
    path: "/dashboard/attendance",
    english: "Entry & attendance",
    hindi: "Entry और attendance",
  },
  {
    path: "/dashboard/reports",
    english: "Reports & insights",
    hindi: "Reports और insights",
  },
  {
    path: "/dashboard/settings",
    english: "Owner controls",
    hindi: "Owner controls और setup status",
  },
  {
    path: "/dashboard/staff",
    english: "What each role can do",
    hindi: "हर role क्या कर सकता है",
  },
] as const;

test.describe("dashboard i18n smoke", () => {
  test.setTimeout(120_000);

  test.beforeEach(() => {
    requireDb();
  });

  test("owner can switch dashboard locale and translated routes render", async ({ page }) => {
    const user = await loginWithSessionCookie(page, "owner@zook.local");
    await prisma.user.update({ where: { id: user.id }, data: { preferredLocale: "en" } });

    for (const route of smokeRoutes) {
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      await expect(page.getByText(route.english, { exact: false }).first()).toBeVisible({
        timeout: 30_000,
      });
    }

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "हिन्दी" }).click();
    await expect(page.getByRole("button", { name: "हिन्दी" })).toHaveAttribute(
      "aria-pressed",
      "true",
      { timeout: 30_000 },
    );
    await expect(page.getByText("स्प्रेडशीट नहीं, जिम चलाएं")).toBeVisible({ timeout: 30_000 });

    for (const route of smokeRoutes) {
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      await expect(page.getByText(route.hindi, { exact: false }).first()).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.getByRole("button", { name: "हिन्दी" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    }

    await page.getByRole("button", { name: "EN", exact: true }).click();
    await expect(page.getByRole("button", { name: "EN", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
      { timeout: 30_000 },
    );
  });
});
