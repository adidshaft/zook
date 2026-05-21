import { prisma } from "@zook/db";
import type { DashboardBranchFilter } from "./filters";

export async function getBranchScope(orgId: string, filters: DashboardBranchFilter = {}) {
  const branches = await prisma.branch.findMany({
    where: { orgId, active: true },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    select: { id: true, name: true, isDefault: true, active: true },
  });
  const defaultBranch = branches.find((branch) => branch.isDefault) ?? null;
  const selectedBranch = filters.branchId
    ? (branches.find((branch) => branch.id === filters.branchId) ?? null)
    : defaultBranch;

  const inventoryScope =
    selectedBranch && !selectedBranch.isDefault ? ("BRANCH" as const) : ("ORG_WIDE" as const);

  return {
    branches,
    defaultBranch,
    selectedBranch,
    mode: selectedBranch
      ? selectedBranch.isDefault
        ? "default_branch"
        : "selected_branch"
      : "org_wide_missing_default",
    inventoryScope,
  };
}
