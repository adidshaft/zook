import type { BranchSummary } from "../types";
import type { DashboardCopy, DashboardData } from "./types";
import { BranchSelectClient } from "./branch-select-client";

function branchLocation(branch: BranchSummary) {
  return [branch.city, branch.state].filter(Boolean).join(", ") || branch.address || undefined;
}

export function BranchSwitcher({
  organizationName,
  fallbackLocation,
  showOrganizationName,
  branches,
  selectedBranchId,
  allBranchesAllowed,
  branchHref,
  copy,
}: {
  organizationName: string;
  fallbackLocation?: string | undefined;
  showOrganizationName?: boolean | undefined;
  branches: DashboardData["branchScope"]["branches"];
  selectedBranchId: string | undefined;
  allBranchesAllowed?: boolean;
  branchHref: (branchId: string) => string;
  copy: DashboardCopy;
}) {
  const options = [
    ...(allBranchesAllowed
        ? [
            {
              value: "all",
              label: copy.webUx.branchSwitcher.allBranchesLabel,
              description: copy.webUx.branchSwitcher.gymWideScope,
              href: branchHref("all"),
            },
          ]
      : []),
    ...branches.map((branch: BranchSummary) => ({
      value: branch.id,
      label: branch.name,
      description:
        branchLocation(branch) ?? (branch.isDefault ? copy.dashboard.showingBranch : undefined),
      href: branchHref(branch.id),
    })),
  ];

  return (
    <BranchSelectClient
      selectedBranchId={selectedBranchId}
      options={options}
      organizationName={organizationName}
      fallbackLocation={fallbackLocation}
      allBranchesLabel={copy.webUx.branchSwitcher.allBranchesLabel}
      showOrganizationName={showOrganizationName}
    />
  );
}
