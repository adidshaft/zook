import { withBranchScope, type DashboardBranchFilter } from "../shared/filters";

export function shopBranchFilter(filters: DashboardBranchFilter = {}) {
  return withBranchScope({}, filters);
}
