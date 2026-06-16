import { describe, expect, it } from "vitest";
import type { RequestContext } from "@zook/core";
import {
  assertCanAccessFileAsset,
  assertCanServeLocalPublicFileAsset,
  assertFileUploadPermission,
  resolveFileVisibility
} from "./files";

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
    expect(resolveFileVisibility("org_gallery", "public")).toBe("public");
    expect(() => resolveFileVisibility("payment_proof", "public")).toThrow(/cannot use visibility/);
  });

  it("requires desk payment permissions to upload payment proof assets", () => {
    expect(() =>
      assertFileUploadPermission({
        category: "payment_proof",
        ctx: baseContext({
          userId: "staff_1",
          roles: ["RECEPTIONIST"],
          permissions: []
        }),
        actorUserId: "staff_1",
        orgId: "org_a"
      })
    ).toThrow(/permission to upload this file type/);

    expect(() =>
      assertFileUploadPermission({
        category: "payment_proof",
        ctx: baseContext({
          userId: "staff_1",
          roles: ["RECEPTIONIST"],
          permissions: ["PAYMENTS_RECORD_OFFLINE"]
        }),
        actorUserId: "staff_1",
        orgId: "org_a"
      })
    ).not.toThrow();
  });

  it("allows the local public file route to serve only public assets", () => {
    expect(() =>
      assertCanServeLocalPublicFileAsset({
        id: "file_public",
        orgId: "org_a",
        ownerUserId: "owner",
        category: "org_logo",
        visibility: "public",
        deletedAt: null
      })
    ).not.toThrow();
    expect(() =>
      assertCanServeLocalPublicFileAsset({
        id: "file_private",
        orgId: "org_a",
        ownerUserId: "owner",
        category: "profile_photo",
        visibility: "private",
        deletedAt: null
      })
    ).toThrow(/not public/);
  });
});
