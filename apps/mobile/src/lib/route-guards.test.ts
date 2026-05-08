import { describe, expect, it } from "vitest";
import {
  checkRouteAccess,
  requiredRolesForPath,
  routeForRole,
} from "./route-guards";

describe("mobile route guards", () => {
  it("maps Admin to the owner operational surface", () => {
    expect(routeForRole("ADMIN")).toBe("/owner");
    expect(requiredRolesForPath("/owner/revenue")).toEqual(["OWNER", "ADMIN"]);
  });

  it("allows Reception routes to Owner and Admin without changing the public role label", () => {
    expect(routeForRole("RECEPTIONIST")).toBe("/reception");
    expect(requiredRolesForPath("/reception/payments")).toEqual([
      "RECEPTIONIST",
      "OWNER",
      "ADMIN",
    ]);
  });

  it("keeps the platform route behind the hidden platform flag", () => {
    expect(checkRouteAccess("/platform", new Set(), false)).toBe(false);
    expect(checkRouteAccess("/platform", new Set(), true)).toBe(true);
  });
});
