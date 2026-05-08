import { describe, expect, it } from "vitest";
import type { RequestContext } from "@zook/core";
import {
  requireAuth,
  requireOrgAnyPermission,
  requireOrgPermission,
  requirePlatformAdmin,
} from "./access";

describe("request access guards", () => {
  it("blocks member access to another organization's records", () => {
    const ctx: RequestContext = {
      userId: "member_1",
      orgId: "org_a",
      roles: ["MEMBER"],
      permissions: ["AI_USE_TEXT"]
    };

    expect(() => requireOrgPermission(ctx, "org_b", "MEMBERS_VIEW")).toThrow("No organization access");
  });

  it("blocks trainer from sending all-member promotional broadcasts", () => {
    const ctx: RequestContext = {
      userId: "trainer_1",
      orgId: "org_a",
      roles: ["TRAINER"],
      permissions: ["NOTIFICATION_SEND_ASSIGNED", "PLANS_CREATE"]
    };

    expect(() => requireOrgPermission(ctx, "org_a", "NOTIFICATION_SEND_PROMOTIONAL")).toThrow(
      "Permission denied"
    );
  });

  it("blocks receptionist from updating owner-only permission settings", () => {
    const ctx: RequestContext = {
      userId: "reception_1",
      orgId: "org_a",
      roles: ["RECEPTIONIST"],
      permissions: ["ATTENDANCE_APPROVE", "ATTENDANCE_MANUAL_OVERRIDE"]
    };

    expect(() => requireOrgPermission(ctx, "org_a", "ORG_MANAGE_PERMISSIONS")).toThrow(
      "Permission denied"
    );
  });

  it("allows org report viewers through any-permission tenant guards", () => {
    const ctx: RequestContext = {
      userId: "owner_1",
      orgId: "org_a",
      roles: ["OWNER"],
      permissions: ["ORG_VIEW_REPORTS"]
    };

    expect(requireOrgAnyPermission(ctx, "org_a", ["AI_MANAGE_SETTINGS", "ORG_VIEW_REPORTS"])).toBe(
      "owner_1"
    );
  });

  it("allows reception payment users through read-only plan lookups", () => {
    const ctx: RequestContext = {
      userId: "reception_1",
      orgId: "org_a",
      roles: ["RECEPTIONIST"],
      permissions: ["PAYMENTS_RECORD_OFFLINE"]
    };

    expect(
      requireOrgAnyPermission(ctx, "org_a", [
        "MEMBERSHIP_PLAN_MANAGE",
        "PAYMENTS_RECORD_OFFLINE",
        "MEMBERS_VIEW"
      ])
    ).toBe("reception_1");
  });

  it("allows platform admins into platform routes", () => {
    const ctx: RequestContext = {
      userId: "platform_1",
      roles: [],
      permissions: ["PLATFORM_MANAGE_ORGS"],
      isPlatformAdmin: true
    };

    expect(requireAuth(ctx)).toBe("platform_1");
    expect(requirePlatformAdmin(ctx)).toBe("platform_1");
  });

  it("does not let platform admins mutate tenant routes without tenant membership", () => {
    const ctx: RequestContext = {
      userId: "platform_1",
      roles: [],
      permissions: ["PLATFORM_MANAGE_ORGS"],
      isPlatformAdmin: true
    };

    expect(() => requireOrgPermission(ctx, "org_a", "PAYMENTS_RECORD_OFFLINE")).toThrow(
      "No organization access"
    );
  });

  it("blocks operations for suspended organizations", () => {
    const ctx: RequestContext = {
      userId: "owner_1",
      orgId: "org_a",
      orgStatus: "SUSPENDED",
      roles: ["OWNER"],
      permissions: ["PAYMENTS_VIEW"]
    };

    expect(() => requireOrgPermission(ctx, "org_a", "PAYMENTS_VIEW")).toThrow(
      "Organization is not active"
    );
  });
});
