import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const overviewSource = readFileSync(
  new URL("./domains/overview/read-models.ts", import.meta.url),
  "utf8",
);

describe("overview branch scoping", () => {
  it("scopes low-stock products and plan counts by the selected branch helper", () => {
    expect(overviewSource).toContain(
      'where: withBranchScope<Prisma.ProductWhereInput>({ orgId, active: true }, branchScopeFilter)',
    );
    expect(overviewSource).toContain(
      "prisma.membershipPlan.count({\n      where: withBranchScope<Prisma.MembershipPlanWhereInput>({ orgId }, branchScopeFilter),",
    );
  });
});
