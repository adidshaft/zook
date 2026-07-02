import { formatCompactNumber } from "@/lib/format";
import { ReadoutGrid, SectionHeader } from "../../dashboard-primitives";
import { GlassCard } from "../../glass-card";
import type { MembershipPlanRow, OrganizationSummary } from "@/components/dashboard/types";
import { useT } from "@/lib/use-t";

export function RevenueOpportunitiesCard({
  summary,
  membershipPlans,
}: {
  summary: OrganizationSummary;
  membershipPlans: MembershipPlanRow[];
}) {
  const t = useT("payments");

  return (
    <GlassCard>
      <SectionHeader eyebrow={t("levers")} title={t("revenueOpportunities")} />
      <ReadoutGrid
        className="mt-5"
        columns={1}
        items={[
          {
            label: t("renewalWindow"),
            value: formatCompactNumber(summary.expiringMemberships),
            meta: t("renewalWindowMeta"),
          },
          {
            label: t("inventoryPressure"),
            value: formatCompactNumber(summary.lowStockProducts),
            meta: t("inventoryPressureMeta"),
          },
          {
            label: t("notificationQueue"),
            value: formatCompactNumber(summary.notificationQueueCount),
            meta: t("notificationQueueMeta"),
          },
          {
            label: t("planLadder"),
            value: membershipPlans.length
              ? t("availablePlans", { count: membershipPlans.length })
              : t("loadPlans"),
            meta: t("planLadderMeta"),
          },
        ]}
      />
    </GlassCard>
  );
}
