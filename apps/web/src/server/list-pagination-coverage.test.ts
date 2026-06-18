import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routerSource = readFileSync(new URL("./api-router/core.ts", import.meta.url), "utf8");
const couponsReferralsSource = readFileSync(
  new URL("./api-router/coupons-referrals.ts", import.meta.url),
  "utf8",
);
const shopOrdersSource = readFileSync(
  new URL("./domains/shop-orders/read-models.ts", import.meta.url),
  "utf8",
);

function expectRouteListBounded(routeNeedle: string, queryNeedle: string, source = routerSource) {
  const routeStart = source.indexOf(routeNeedle);
  expect(routeStart, `${routeNeedle} was not found in route source`).toBeGreaterThanOrEqual(0);
  const queryStart = source.indexOf(queryNeedle, routeStart);
  expect(queryStart, `${queryNeedle} was not found after ${routeNeedle}`).toBeGreaterThanOrEqual(0);
  const queryEnd = source.indexOf("})", queryStart);
  const queryBody = source.slice(queryStart, queryEnd);
  expect(queryBody).toContain("take:");
}

describe("list pagination coverage", () => {
  it("caps admin and member history list endpoints that do not expose cursor pagination yet", () => {
    expectRouteListBounded(
      'pathMatches(path, ["orgs", /.+/, "coupons"])',
      "prisma.coupon.findMany",
      couponsReferralsSource,
    );
    expectRouteListBounded('pathMatches(path, ["me", "goals"])', "prisma.userGoal.findMany");
    expectRouteListBounded('pathMatches(path, ["me", "consents"])', "prisma.consentRecord.findMany");
    expectRouteListBounded(
      'pathMatches(path, ["platform", "payments", /.+/])',
      "prisma.paymentEvent.findMany",
    );
    expectRouteListBounded(
      'pathMatches(path, ["platform", "subscriptions"])',
      "prisma.saaSSubscription.findMany",
    );
  });

  it("keeps shop order product hydration bounded to products referenced by capped orders", () => {
    expect(shopOrdersSource).toContain("id: { in: [...new Set(items.map((item) => item.productId))] }");
    expect(shopOrdersSource).not.toContain("prisma.product.findMany({ where: { orgId } })");
  });
});
