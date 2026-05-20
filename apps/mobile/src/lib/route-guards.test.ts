import { describe, expect, it } from "vitest";
import {
  checkRouteAccess,
  permissionForPath,
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

  it("maps Reception subroutes to their specific permissions", () => {
    expect(permissionForPath("/reception/members")).toBe("MEMBERS_VIEW");
    expect(permissionForPath("/reception/payments")).toBe("PAYMENTS_RECORD_OFFLINE");
    expect(permissionForPath("/reception/orders")).toBe("SHOP_FULFILL_ORDER");
  });

  it("maps Owner subroutes to their specific permissions", () => {
    expect(permissionForPath("/owner/members")).toBe("MEMBERS_VIEW");
    expect(permissionForPath("/owner/approvals")).toBe("ATTENDANCE_APPROVE");
    expect(permissionForPath("/owner/revenue")).toBe("ORG_VIEW_REPORTS");
    expect(permissionForPath("/owner/stock")).toBe("SHOP_MANAGE_PRODUCTS");
  });

  it("keeps the platform route behind the hidden platform flag", () => {
    expect(checkRouteAccess("/platform", new Set(), false)).toBe(false);
    expect(checkRouteAccess("/platform", new Set(), true)).toBe(true);
  });

  it("guards trainer subroutes by trainer permissions", () => {
    expect(checkRouteAccess("/trainer/clients", new Set(["MEMBERS_VIEW"]), false)).toBe(true);
    expect(checkRouteAccess("/trainer/clients", new Set(["PT_RECORD"]), false)).toBe(false);
    expect(checkRouteAccess("/trainer/plans", new Set(["PT_RECORD"]), false)).toBe(true);
  });
});
