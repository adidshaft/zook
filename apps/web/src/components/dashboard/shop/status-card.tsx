import { GlassCard } from "../../glass-card";
import type { BranchScopeSnapshot, OrganizationSummary } from "@/components/dashboard/types";
import { formatCompactNumber } from "@/lib/format";
import { useT } from "@/lib/use-t";

export function ShopStatusCard({
  summary,
  branchScope,
  selectedBranchName,
  inventoryCount,
}: {
  summary: OrganizationSummary;
  branchScope: BranchScopeSnapshot;
  selectedBranchName: string;
  inventoryCount: number;
}) {
  const t = useT("webUx.shop");
  const items = [
    {
      label: t("stockBranch"),
      value: branchScope.selectedBranch ? selectedBranchName : t("allBranches"),
      meta: branchScope.selectedBranch ? t("stockEditsApplyHere") : t("chooseBranchToEditStock"),
    },
    {
      label: t("listedProducts"),
      value: formatCompactNumber(inventoryCount),
      meta: inventoryCount ? t("visibleToMembers") : t("addProduct"),
    },
    {
      label: t("lowStock"),
      value: formatCompactNumber(summary.lowStockProducts),
      meta: summary.lowStockProducts ? t("restockSoon") : t("noAlerts"),
    },
  ];

  return (
    <GlassCard className="p-3">
      <div className="grid gap-2 md:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="min-w-0 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 py-2"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-xs font-semibold text-[var(--text-tertiary)]">
                {item.label}
              </span>
              <span className="truncate text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                {item.value}
              </span>
            </div>
            <p className="mt-1 truncate text-[11px] text-[var(--text-tertiary)]">
              {item.meta}
            </p>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
