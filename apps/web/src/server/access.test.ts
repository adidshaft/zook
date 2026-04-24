import { describe, expect, it } from "vitest";
import type { RequestContext } from "@zook/core";
import { requireAuth, requireOrgPermission, requirePlatformAdmin } from "./access";

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

  it("allows platform admins into platform routes", () => {
    const ctx: RequestContext = {
      userId: "platform_1",
      roles: ["PLATFORM_ADMIN"],
      permissions: ["PLATFORM_MANAGE_ORGS"],
      isPlatformAdmin: true
    };

    expect(requireAuth(ctx)).toBe("platform_1");
    expect(requirePlatformAdmin(ctx)).toBe("platform_1");
  });
});
