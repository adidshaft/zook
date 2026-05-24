import { describe, expect, it } from "vitest";
import { shopBranchFilter } from "./branch-filter";

describe("shop branch filters", () => {
  it("scopes shop orders to the selected branch", () => {
    expect(shopBranchFilter({ branchId: "branch_a" })).toEqual({ branchId: "branch_a" });
  });

  it("leaves all-branch owner/admin views unfiltered", () => {
    expect(shopBranchFilter({ allBranches: true })).toEqual({});
  });
});
