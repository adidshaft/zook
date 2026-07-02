import { describe, expect, it } from "vitest";

import {
  checkoutUrlWithReturnUrl,
  daysUntil,
  expiringSoonCount,
  pauseDefaultDate,
  pauseMinimumDate,
  planIdFor,
  shouldShowJoinDifferentGym,
  sortMemberships,
} from "./membership-logic";

describe("membership date helpers", () => {
  const now = Date.parse("2026-07-02T06:30:00.000Z");

  it("calculates days until expiry and pause defaults", () => {
    expect(daysUntil("2026-07-04T06:30:00.000Z", now)).toBe(2);
    expect(daysUntil("2026-07-01T06:30:00.000Z", now)).toBe(0);

    expect(pauseMinimumDate(new Date("2026-07-02T04:00:00.000Z")).toISOString()).toBe(
      "2026-07-03T06:30:00.000Z",
    );
    expect(pauseDefaultDate(new Date("2026-07-02T04:00:00.000Z")).toISOString()).toBe(
      "2026-07-09T06:30:00.000Z",
    );
  });

  it("counts active memberships expiring in the next 30 days", () => {
    expect(
      expiringSoonCount(
        [
          { id: "active-soon", status: "ACTIVE", endsAt: "2026-07-20T06:30:00.000Z" },
          { id: "active-later", status: "ACTIVE", endsAt: "2026-09-20T06:30:00.000Z" },
          { id: "paused-soon", status: "PAUSED", endsAt: "2026-07-20T06:30:00.000Z" },
        ],
        now,
      ),
    ).toBe(1);
  });
});

describe("membership route helpers", () => {
  it("sorts focused, active, pending, paused, and older memberships", () => {
    const sorted = sortMemberships(
      [
        { id: "paused", status: "PAUSED", endsAt: "2026-08-01T00:00:00.000Z" },
        { id: "active-old", status: "ACTIVE", endsAt: "2026-07-10T00:00:00.000Z" },
        { id: "pending", status: "PENDING_PAYMENT", endsAt: "2026-09-01T00:00:00.000Z" },
        { id: "active-new", status: "ACTIVE", endsAt: "2026-08-10T00:00:00.000Z" },
      ],
      "pending",
    );

    expect(sorted.map((subscription) => subscription.id)).toEqual([
      "pending",
      "active-new",
      "active-old",
      "paused",
    ]);
  });

  it("resolves plan ids, inactive membership join state, and return URLs", () => {
    expect(planIdFor({ id: "sub", plan: { id: "plan_from_plan" }, planId: "fallback" })).toBe(
      "plan_from_plan",
    );
    expect(planIdFor({ id: "sub", planId: "fallback" })).toBe("fallback");
    expect(shouldShowJoinDifferentGym(null)).toBe(true);
    expect(shouldShowJoinDifferentGym({ id: "sub", status: "EXPIRED" })).toBe(true);
    expect(shouldShowJoinDifferentGym({ id: "sub", status: "ACTIVE" })).toBe(false);

    const url = checkoutUrlWithReturnUrl(
      "https://pay.example/checkout?x=1",
      "sess_1",
      (path) => `https://web.example${path}`,
    );
    expect(url).toContain("https://pay.example/checkout");
    expect(url).toContain("return_url=");
    expect(decodeURIComponent(url ?? "")).toContain("zook://payments/return?target=membership&session=sess_1");
  });
});
