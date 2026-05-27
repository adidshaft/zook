export type SaasTier = "FREE" | "STARTER" | "GROWTH" | "PRO";
export type PaidSaasTier = Exclude<SaasTier, "FREE">;
export type SaasBillingCycle = "MONTHLY" | "YEARLY";

export type SaasEntitlements = {
  memberLimit: number | null;
  branchLimit: number | null;
  staffLimit: number | null;
  trainerLimit: number | null;
  productLimit: number | null;
  notificationMonthlyLimit: number | null;
  aiTextMonthlyLimit: number;
  aiImageMonthlyLimit: number;
  reports: "basic" | "advanced" | "custom";
  referrals: "basic" | "advanced" | "custom";
  support: "standard" | "priority" | "premium";
  onboarding: "self_serve" | "assisted" | "white_glove";
  multiBranch: boolean;
  apiAccess: boolean;
};

export type SaasPlanDefinition = {
  tier: SaasTier;
  name: string;
  description: string;
  monthly: number;
  yearly: number;
  entitlements: SaasEntitlements;
};

export const defaultSaasPlanCatalog = {
  FREE: {
    tier: "FREE",
    name: "Trial",
    description: "Trial access for new gyms while billing setup is completed.",
    monthly: 0,
    yearly: 0,
    entitlements: {
      memberLimit: 25,
      branchLimit: 1,
      staffLimit: 2,
      trainerLimit: 1,
      productLimit: 20,
      notificationMonthlyLimit: 100,
      aiTextMonthlyLimit: 0,
      aiImageMonthlyLimit: 0,
      reports: "basic",
      referrals: "basic",
      support: "standard",
      onboarding: "self_serve",
      multiBranch: false,
      apiAccess: false,
    },
  },
  STARTER: {
    tier: "STARTER",
    name: "Starter",
    description: "For single-branch gyms starting with digital memberships and attendance.",
    monthly: 149_900,
    yearly: 1_499_000,
    entitlements: {
      memberLimit: 100,
      branchLimit: 1,
      staffLimit: 5,
      trainerLimit: 2,
      productLimit: 50,
      notificationMonthlyLimit: 1_000,
      aiTextMonthlyLimit: 0,
      aiImageMonthlyLimit: 0,
      reports: "basic",
      referrals: "basic",
      support: "standard",
      onboarding: "self_serve",
      multiBranch: false,
      apiAccess: false,
    },
  },
  GROWTH: {
    tier: "GROWTH",
    name: "Growth",
    description: "For growing gyms with larger teams, shop inventory, and advanced campaigns.",
    monthly: 399_900,
    yearly: 3_999_000,
    entitlements: {
      memberLimit: 500,
      branchLimit: 3,
      staffLimit: 20,
      trainerLimit: 10,
      productLimit: 500,
      notificationMonthlyLimit: 10_000,
      aiTextMonthlyLimit: 500,
      aiImageMonthlyLimit: 50,
      reports: "advanced",
      referrals: "advanced",
      support: "priority",
      onboarding: "assisted",
      multiBranch: true,
      apiAccess: false,
    },
  },
  PRO: {
    tier: "PRO",
    name: "Pro",
    description: "For multi-branch operators that need higher limits and premium support.",
    monthly: 799_900,
    yearly: 7_999_000,
    entitlements: {
      memberLimit: null,
      branchLimit: null,
      staffLimit: null,
      trainerLimit: null,
      productLimit: null,
      notificationMonthlyLimit: 50_000,
      aiTextMonthlyLimit: 3_000,
      aiImageMonthlyLimit: 300,
      reports: "custom",
      referrals: "custom",
      support: "premium",
      onboarding: "white_glove",
      multiBranch: true,
      apiAccess: true,
    },
  },
} as const satisfies Record<SaasTier, SaasPlanDefinition>;

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function positiveNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function nullableLimit(value: unknown, fallback: number | null) {
  if (value === null) return null;
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : fallback;
}

export function saasPlanCatalogFromSetting(value: unknown) {
  const configured = asObject(value);
  return (Object.keys(defaultSaasPlanCatalog) as SaasTier[]).reduce(
    (catalog, tier) => {
      const base = defaultSaasPlanCatalog[tier];
      const config = asObject(configured[tier.toLowerCase()]);
      const entitlements = asObject(config.entitlements);
      catalog[tier] = {
        ...base,
        monthly: tier === "FREE" ? 0 : positiveNumber(config.monthlyPaise, base.monthly),
        yearly: tier === "FREE" ? 0 : positiveNumber(config.yearlyPaise, base.yearly),
        entitlements: {
          ...base.entitlements,
          memberLimit: nullableLimit(entitlements.memberLimit, base.entitlements.memberLimit),
          branchLimit: nullableLimit(entitlements.branchLimit, base.entitlements.branchLimit),
          staffLimit: nullableLimit(entitlements.staffLimit, base.entitlements.staffLimit),
          trainerLimit: nullableLimit(entitlements.trainerLimit, base.entitlements.trainerLimit),
          productLimit: nullableLimit(entitlements.productLimit, base.entitlements.productLimit),
          notificationMonthlyLimit: nullableLimit(
            entitlements.notificationMonthlyLimit,
            base.entitlements.notificationMonthlyLimit,
          ),
          aiTextMonthlyLimit:
            typeof entitlements.aiTextMonthlyLimit === "number"
              ? Math.max(0, Math.floor(entitlements.aiTextMonthlyLimit))
              : base.entitlements.aiTextMonthlyLimit,
          aiImageMonthlyLimit:
            typeof entitlements.aiImageMonthlyLimit === "number"
              ? Math.max(0, Math.floor(entitlements.aiImageMonthlyLimit))
              : base.entitlements.aiImageMonthlyLimit,
        },
      };
      return catalog;
    },
    {} as Record<SaasTier, SaasPlanDefinition>,
  );
}

export function pricingFromPlanCatalog(catalog: Record<SaasTier, SaasPlanDefinition>) {
  return (["STARTER", "GROWTH", "PRO"] as const).reduce(
    (pricing, tier) => {
      pricing[tier] = {
        monthly: catalog[tier].monthly,
        yearly: catalog[tier].yearly,
        memberLimit: catalog[tier].entitlements.memberLimit,
        entitlements: catalog[tier].entitlements,
      };
      return pricing;
    },
    {} as Record<
      PaidSaasTier,
      {
        monthly: number;
        yearly: number;
        memberLimit: number | null;
        entitlements: SaasEntitlements;
      }
    >,
  );
}

export function formatSaasLimit(limit: number | null) {
  return limit === null ? "unlimited" : String(limit);
}
