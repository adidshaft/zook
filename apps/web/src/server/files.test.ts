import { describe, expect, it } from "vitest";
import type { RequestContext } from "@zook/core";
import { assertCanAccessFileAsset, resolveFileVisibility } from "./files";

function baseContext(overrides: Partial<RequestContext> = {}): RequestContext {
  return {
    userId: "user_self",
    orgId: "org_a",
    roles: ["MEMBER"],
    permissions: [],
    ...overrides
  };
}

describe("file access rules", () => {
  it("blocks cross-tenant access to a private file", () => {
    expect(() =>
      assertCanAccessFileAsset(
        {
          id: "file_1",
          orgId: "org_b",
          ownerUserId: "other_user",
          category: "payment_proof",
          visibility: "private",
          deletedAt: null
        },
        baseContext()
      )
    ).toThrow(/outside your organization/);
  });

  it("allows a member to access their own private file", () => {
    expect(() =>
      assertCanAccessFileAsset(
        {
          id: "file_2",
          orgId: "org_a",
          ownerUserId: "user_self",
          category: "profile_photo",
          visibility: "private",
          deletedAt: null
        },
        baseContext()
      )
    ).not.toThrow();
  });

  it("allows same-org staff with the right permission to access private proof files", () => {
    expect(() =>
      assertCanAccessFileAsset(
        {
          id: "file_3",
          orgId: "org_a",
          ownerUserId: "member_1",
          category: "payment_proof",
          visibility: "private",
          deletedAt: null
        },
        baseContext({
          userId: "staff_1",
          roles: ["RECEPTIONIST"],
          permissions: ["PAYMENTS_RECORD_OFFLINE"]
        })
      )
    ).not.toThrow();
  });

  it("enforces category-specific visibility rules", () => {
    expect(resolveFileVisibility("org_logo", "public")).toBe("public");
    expect(() => resolveFileVisibility("payment_proof", "public")).toThrow(/cannot use visibility/);
  });
});
