import { withBranchScope, type DashboardBranchFilter } from "@/server/domains/shared/filters";

export function shopBranchFilter(filters: DashboardBranchFilter = {}) {
  return withBranchScope({}, filters);
}
