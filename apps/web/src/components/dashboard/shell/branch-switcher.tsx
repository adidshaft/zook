import type { DashboardCopy, DashboardData } from "./types";
import { BranchSelectClient } from "./branch-select-client";

export function BranchSwitcher({
  branches,
  selectedBranchId,
  allBranchesAllowed,
  branchHref,
  copy,
  compact: _compact = false,
}: {
  branches: DashboardData["branchScope"]["branches"];
  selectedBranchId: string | undefined;
  allBranchesAllowed?: boolean;
  branchHref: (branchId: string) => string;
  copy: DashboardCopy;
  compact?: boolean;
}) {
  const options = [
    ...(allBranchesAllowed
      ? [
          {
            value: "all",
            label: "All branches",
            description: "Owner/admin view",
            href: branchHref("all"),
          },
        ]
      : []),
    ...branches.map((branch) => ({
      value: branch.id,
      label: branch.name,
      description: branch.isDefault ? copy.dashboard.showingBranch : undefined,
      href: branchHref(branch.id),
    })),
  ];

  return (
    <BranchSelectClient
      selectedBranchId={selectedBranchId}
      options={options}
    />
  );
}
