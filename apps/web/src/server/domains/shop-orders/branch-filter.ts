import type { DashboardBranchFilter } from "@/server/domains/shared/filters";

export function shopBranchFilter(filters: DashboardBranchFilter = {}) {
  return filters.branchId ? { branchId: filters.branchId } : {};
}
