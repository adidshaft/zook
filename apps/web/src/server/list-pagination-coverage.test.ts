import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routerSource = readFileSync(new URL("./api-router/core.ts", import.meta.url), "utf8");
const shopOrdersSource = readFileSync(
  new URL("./domains/shop-orders/read-models.ts", import.meta.url),
  "utf8",
);

function expectRouteListBounded(routeNeedle: string, queryNeedle: string) {
  const routeStart = routerSource.indexOf(routeNeedle);
  expect(routeStart, `${routeNeedle} was not found in api-router/core.ts`).toBeGreaterThanOrEqual(0);
  const queryStart = routerSource.indexOf(queryNeedle, routeStart);
  expect(queryStart, `${queryNeedle} was not found after ${routeNeedle}`).toBeGreaterThanOrEqual(0);
  const queryEnd = routerSource.indexOf("})", queryStart);
  const queryBody = routerSource.slice(queryStart, queryEnd);
  expect(queryBody).toContain("take:");
}

describe("list pagination coverage", () => {
  it("caps admin and member history list endpoints that do not expose cursor pagination yet", () => {
    expectRouteListBounded('pathMatches(path, ["orgs", /.+/, "coupons"])', "prisma.coupon.findMany");
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
