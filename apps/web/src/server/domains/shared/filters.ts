export type DashboardBranchFilter = {
  branchId?: string;
  allBranches?: boolean;
  allBranchesAllowed?: boolean;
};

export function withBranchScope<T extends Record<string, unknown>>(
  where: T,
  filters: Pick<DashboardBranchFilter, "branchId" | "allBranches"> = {},
) {
  if (!filters.branchId || filters.allBranches) {
    return where;
  }
  return { ...where, branchId: filters.branchId };
}
