import { prisma } from "@zook/db";
import type { DashboardBranchFilter } from "./filters";

type BranchScopeBranch = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  googleMapsUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
  active: boolean;
};

export async function getBranchScope(orgId: string, filters: DashboardBranchFilter = {}) {
  const branchRows = await prisma.branch.findMany({
    where: { orgId, active: true },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      state: true,
      googleMapsUrl: true,
      latitude: true,
      longitude: true,
      isDefault: true,
      active: true,
    },
  });
  const branches: BranchScopeBranch[] = branchRows.map((branch) => ({
    ...branch,
    latitude: branch.latitude ? Number(branch.latitude) : null,
    longitude: branch.longitude ? Number(branch.longitude) : null,
  }));
  const defaultBranch = branches.find((branch) => branch.isDefault) ?? null;
  const selectedBranch = filters.allBranches
    ? null
    : filters.branchId
      ? (branches.find((branch) => branch.id === filters.branchId) ?? null)
      : defaultBranch;

  const inventoryScope = "ORG_WIDE" as const;

  return {
    branches,
    defaultBranch,
    selectedBranch,
    allBranches: Boolean(filters.allBranches),
    allBranchesAllowed: Boolean(filters.allBranchesAllowed),
    mode: filters.allBranches
      ? "all_branches"
      : selectedBranch
        ? selectedBranch.isDefault
          ? "default_branch"
          : "selected_branch"
        : "org_wide_missing_default",
    inventoryScope,
  };
}
