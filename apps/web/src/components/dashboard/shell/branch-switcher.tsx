import type { DashboardCopy, DashboardData } from "./types";
import { BranchSelectClient } from "./branch-select-client";

export function BranchSwitcher({
  branches,
  selectedBranchId,
  branchHref,
  copy,
  compact: _compact = false,
}: {
  branches: DashboardData["branchScope"]["branches"];
  selectedBranchId: string | undefined;
  branchHref: (branchId: string) => string;
  copy: DashboardCopy;
  compact?: boolean;
}) {
  return (
    <BranchSelectClient
      selectedBranchId={selectedBranchId}
      options={branches.map((branch) => ({
        value: branch.id,
        label: branch.name,
        description: branch.isDefault ? copy.dashboard.showingBranch : undefined,
        href: branchHref(branch.id),
      }))}
    />
  );
}
