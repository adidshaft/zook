import { GlassCard } from "../../glass-card";
import { ReadoutGrid, SectionHeader } from "../../dashboard-primitives";
import type { BranchScopeSnapshot, OrganizationSummary } from "../../dashboard-operational-model";
import { formatCompactNumber, formatInr } from "@/lib/format";

export function ShopStatusCard({
  summary,
  branchScope,
  selectedBranchName,
  queuedOrderCount,
  readyOrderCount,
}: {
  summary: OrganizationSummary;
  branchScope: BranchScopeSnapshot;
  selectedBranchName: string;
  queuedOrderCount: number;
  readyOrderCount: number;
}) {
  return (
    <GlassCard>
      <SectionHeader
        eyebrow="Queue health"
        title="Shop status"
        description="A quick operational read on how shop traffic is moving right now."
      />
      <ReadoutGrid
        className="mt-5"
        columns={1}
        items={[
          {
            label: "Stock scope",
            value: branchScope.selectedBranch ? selectedBranchName : "All branches",
            meta: branchScope.selectedBranch
              ? "Products and stock changes apply to this branch"
              : "Choose a branch before changing branch stock",
          },
          {
            label: "Pending payment",
            value: formatCompactNumber(queuedOrderCount),
            meta: "Orders still waiting to settle",
          },
          {
            label: "Ready for pickup",
            value: formatCompactNumber(readyOrderCount),
            meta: "Desk should keep pickup codes handy",
          },
          {
            label: "Revenue today",
            value: formatInr(summary.revenuePaise),
            meta: "Shared with membership revenue card",
          },
        ]}
      />
    </GlassCard>
  );
}
