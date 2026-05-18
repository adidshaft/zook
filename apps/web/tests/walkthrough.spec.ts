import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { loginWithSessionCookie } from "./helpers";

const OUT = "/tmp/zook-walk/web-screens";
mkdirSync(OUT, { recursive: true });

function requireDb() {
  if (process.env.RUN_DB_WEB_TESTS !== "1") {
    test.skip(true, "Walkthrough only runs against the seeded DB.");
  }
}

type RoleAccount = { label: string; email: string };

const ALL_ROLE_ACCOUNTS: RoleAccount[] = [
  { label: "owner", email: "owner@zook.local" },
  { label: "admin", email: "admin@zook.local" },
  { label: "reception", email: "reception@zook.local" },
  { label: "trainer", email: "trainer@zook.local" },
  { label: "member", email: "member@zook.local" },
  { label: "prospect", email: "prospect@zook.local" },
  { label: "platform", email: "platform@zook.local" },
];

const ALL_PUBLIC_ROUTES = [
  { path: "/", name: "marketing-home" },
  { path: "/login", name: "login" },
  { path: "/verify-otp", name: "verify-otp" },
  { path: "/gyms", name: "gyms-directory" },
  { path: "/start-gym", name: "start-gym" },
  { path: "/privacy", name: "privacy" },
  { path: "/terms", name: "terms" },
  { path: "/support", name: "support" },
  { path: "/status", name: "status" },
  { path: "/g/aarogya-strength", name: "public-gym-aarogya" },
  { path: "/g/peaklab", name: "public-gym-peaklab" },
  { path: "/join/aarogya-strength", name: "public-join-aarogya" },
  { path: "/in/aarogya-strength", name: "in-aarogya" },
  // /qr/[username] is a route handler that streams SVG, not an HTML page —
  // it has no headings to assert and screenshotting a binary response times out.
  { path: "/r/NISHAFIT", name: "referral-fallback" },
  { path: "/checkout/mock/demo", name: "mock-checkout" },
] as const;

const ROLE_ROUTES = [
  { path: "/dashboard", name: "dashboard-home" },
  { path: "/dashboard/members", name: "members" },
  { path: "/dashboard/membership-plans", name: "membership-plans" },
  { path: "/dashboard/plans", name: "plans-index" },
  { path: "/dashboard/plans/coupons", name: "plans-coupons" },
  { path: "/dashboard/plans/offers", name: "plans-offers" },
  { path: "/dashboard/plans/referrals", name: "plans-referrals" },
  { path: "/dashboard/attendance", name: "attendance" },
  { path: "/dashboard/attendance/qr-display", name: "attendance-qr" },
  { path: "/dashboard/payments", name: "payments" },
  { path: "/dashboard/payments/refunds", name: "payments-refunds" },
  { path: "/dashboard/shop", name: "shop" },
  { path: "/dashboard/shop/orders", name: "shop-orders" },
  { path: "/dashboard/audit", name: "audit" },
  { path: "/dashboard/billing", name: "billing" },
  { path: "/dashboard/branches", name: "branches" },
  { path: "/dashboard/notifications", name: "notifications" },
  { path: "/dashboard/notifications/history", name: "notifications-history" },
  { path: "/dashboard/notifications/templates", name: "notifications-templates" },
  { path: "/dashboard/profile", name: "profile" },
  { path: "/dashboard/public-profile", name: "public-profile" },
  { path: "/dashboard/reports", name: "reports" },
  { path: "/dashboard/settings", name: "settings" },
  { path: "/dashboard/staff", name: "staff" },
  { path: "/dashboard/ai", name: "ai" },
  { path: "/me", name: "me-overview" },
  { path: "/gyms", name: "gyms" },
  { path: "/desk", name: "desk" },
  { path: "/coach", name: "coach" },
  { path: "/platform", name: "platform-admin" },
] as const;

const requestedRoleLabels = new Set(
  (process.env.WALKTHROUGH_ROLES ?? "")
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean),
);
const ROLE_ACCOUNTS = requestedRoleLabels.size
  ? ALL_ROLE_ACCOUNTS.filter((account) => requestedRoleLabels.has(account.label))
  : ALL_ROLE_ACCOUNTS;
const PUBLIC_ROUTES =
  process.env.WALKTHROUGH_INCLUDE_PUBLIC === "0" ? [] : ALL_PUBLIC_ROUTES;
const WARMUP_ROUTES = Array.from(
  new Set([
    ...PUBLIC_ROUTES.map((route) => route.path),
    ...(ROLE_ACCOUNTS.length ? ROLE_ROUTES.map((route) => route.path) : []),
  ]),
);

type CapturedIssue = {
  role: string;
  route: string;
  type: "console-error" | "network-failure" | "render-error" | "missing-heading";
  detail: string;
};

const issues: CapturedIssue[] = [];

function attachInstrumentation(page: Page, role: string) {
  const route = { current: "(boot)" };
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (/HMR|webpack-internal|hot-reloader|sentry/i.test(text)) return;
    issues.push({ role, route: route.current, type: "console-error", detail: text.slice(0, 400) });
  });
  page.on("response", async (resp) => {
    const url = resp.url();
    if (!/\/api\//.test(url)) return;
    const status = resp.status();
    if (status >= 500) {
      issues.push({
        role,
        route: route.current,
        type: "network-failure",
        detail: `${status} ${url}`,
      });
    }
  });
  return route;
}

async function visitAndShoot(
  page: Page,
  routeRef: { current: string },
  role: string,
  path: string,
  name: string,
) {
  routeRef.current = path;
  const screenshotPath = `${OUT}/${role}__${name}.png`;
  try {
    // Cold Next.js dev compiles can take most of the per-test budget on first hit.
    const resp = await page.goto(path, { waitUntil: "domcontentloaded", timeout: 150_000 });
    if (resp && resp.status() >= 500) {
      issues.push({
        role,
        route: path,
        type: "render-error",
        detail: `HTTP ${resp.status()} on initial GET`,
      });
    }
    // Settle network + give framer-motion / client hydration a chance.
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const heading = page.locator("h1, h2").first();
    await heading.waitFor({ state: "visible", timeout: 8_000 }).catch(() => {
      issues.push({
        role,
        route: path,
        type: "missing-heading",
        detail: "no visible h1/h2 within 8s",
      });
    });
    await page.screenshot({ path: screenshotPath, fullPage: true, timeout: 45_000 });
  } catch (err) {
    issues.push({
      role,
      route: path,
      type: "render-error",
      detail: err instanceof Error ? err.message : String(err),
    });
    // Fallback to viewport screenshot if fullPage failed.
    await page
      .screenshot({ path: screenshotPath, fullPage: false, timeout: 15_000 })
      .catch(() => {});
  }
}

test.beforeAll(() => {
  mkdirSync(OUT, { recursive: true });
});

test.beforeAll(async ({ request }, testInfo) => {
  requireDb();
  // WHY: keep Next dev cold compilation outside per-route assertions so 150s tests measure route health.
  testInfo.setTimeout(900_000);
  for (const path of WARMUP_ROUTES) {
    await request.get(path, { timeout: 60_000 }).catch(() => {});
  }
});

test.afterAll(() => {
  if (!issues.length) return;
  console.log("\n=== WALKTHROUGH ISSUES ===");
  for (const issue of issues) {
    console.log(`[${issue.role}] ${issue.route} ${issue.type}: ${issue.detail}`);
  }
  console.log(`=== TOTAL: ${issues.length} issues ===\n`);
});

// Public routes — one test per route. Per-test budget covers dev cold-compile (~90s).
for (const { path, name } of PUBLIC_ROUTES) {
  test(`public: ${name}`, async ({ page }) => {
    test.setTimeout(150_000);
    requireDb();
    const routeRef = attachInstrumentation(page, "public");
    await visitAndShoot(page, routeRef, "public", path, name);
    expect(
      issues.filter((i) => i.role === "public" && i.route === path && i.type === "render-error"),
    ).toEqual([]);
  });
}

// Role routes — one test per (role, route). Avoids the 180s monolith cap.
for (const account of ROLE_ACCOUNTS) {
  test.describe(`role: ${account.label}`, () => {
    for (const { path, name } of ROLE_ROUTES) {
      test(name, async ({ page }) => {
        test.setTimeout(150_000);
        requireDb();
        const routeRef = attachInstrumentation(page, account.label);
        await loginWithSessionCookie(page, account.email);
        await visitAndShoot(page, routeRef, account.label, path, name);
        expect(
          issues.filter(
            (i) => i.role === account.label && i.route === path && i.type === "render-error",
          ),
        ).toEqual([]);
      });
    }
  });
}
