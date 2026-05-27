import { describe, expect, it } from "vitest";
import {
  defaultSaasPlanCatalog,
  pricingFromPlanCatalog,
  saasPlanCatalogFromSetting,
} from "./saas-plans";

describe("SaaS plan catalog", () => {
  it("defines production plan limits for the paid tiers", () => {
    expect(defaultSaasPlanCatalog.STARTER.entitlements).toMatchObject({
      memberLimit: 100,
      branchLimit: 1,
      staffLimit: 5,
      trainerLimit: 2,
    });
    expect(defaultSaasPlanCatalog.GROWTH.entitlements).toMatchObject({
      memberLimit: 500,
      branchLimit: 3,
      staffLimit: 20,
      trainerLimit: 10,
    });
    expect(defaultSaasPlanCatalog.PRO.entitlements.memberLimit).toBeNull();
    expect(defaultSaasPlanCatalog.PRO.entitlements.branchLimit).toBeNull();
  });

  it("keeps pricing overrides while preserving default limits", () => {
    const catalog = saasPlanCatalogFromSetting({
      starter: { monthlyPaise: 199_900, yearlyPaise: 1_999_000 },
    });
    const pricing = pricingFromPlanCatalog(catalog);

    expect(pricing.STARTER.monthly).toBe(199_900);
    expect(pricing.STARTER.yearly).toBe(1_999_000);
    expect(pricing.STARTER.memberLimit).toBe(100);
    expect(pricing.GROWTH.monthly).toBe(defaultSaasPlanCatalog.GROWTH.monthly);
  });

  it("accepts explicit entitlement overrides for platform-managed packaging", () => {
    const catalog = saasPlanCatalogFromSetting({
      growth: {
        entitlements: {
          memberLimit: 750,
          branchLimit: 5,
          notificationMonthlyLimit: 15000,
        },
      },
    });

    expect(catalog.GROWTH.entitlements.memberLimit).toBe(750);
    expect(catalog.GROWTH.entitlements.branchLimit).toBe(5);
    expect(catalog.GROWTH.entitlements.notificationMonthlyLimit).toBe(15000);
    expect(catalog.STARTER.entitlements.branchLimit).toBe(1);
  });
});
