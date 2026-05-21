import { formatCompactNumber } from "@/lib/format";
import { ReadoutGrid, SectionHeader } from "../../dashboard-primitives";
import { GlassCard } from "../../glass-card";
import type { MembershipPlanRow, OrganizationSummary } from "../../dashboard-operational-model";

export function RevenueOpportunitiesCard({
  summary,
  membershipPlans,
}: {
  summary: OrganizationSummary;
  membershipPlans: MembershipPlanRow[];
}) {
  return (
    <GlassCard>
      <SectionHeader
        eyebrow="Levers"
        title="Revenue opportunities"
        description="Renewals, low stock, and scheduled messages that may need attention."
      />
      <ReadoutGrid
        className="mt-5"
        columns={1}
        items={[
          {
            label: "Renewal window",
            value: formatCompactNumber(summary.expiringMemberships),
            meta: "Members expiring in the next 7 days",
          },
          {
            label: "Inventory pressure",
            value: formatCompactNumber(summary.lowStockProducts),
            meta: "Products close to threshold",
          },
          {
            label: "Notification queue",
            value: formatCompactNumber(summary.notificationQueueCount),
            meta: "Messages still scheduled or failed",
          },
          {
            label: "Plan ladder",
            value: membershipPlans.length ? `${membershipPlans.length} live plans` : "Load plans",
            meta: "Useful while talking renewals at the desk",
          },
        ]}
      />
    </GlassCard>
  );
}
