import { describe, expect, it } from "vitest";
import { withBranchScope } from "./domains/shared/filters";

describe("withBranchScope", () => {
  it("adds the selected branch id to branch-scoped queries", () => {
    expect(withBranchScope({ orgId: "org_1", active: true }, { branchId: "branch_a" })).toEqual({
      orgId: "org_1",
      active: true,
      branchId: "branch_a",
    });
  });

  it("leaves all-branch views unfiltered", () => {
    expect(
      withBranchScope({ orgId: "org_1", active: true }, { branchId: "branch_a", allBranches: true }),
    ).toEqual({
      orgId: "org_1",
      active: true,
    });
  });
});
