import { renderDashboardPanelRoute } from "@/components/dashboard-route-renderer";
import { PayoutsDashboardRoute } from "@/components/dashboard/payouts/payouts-dashboard-route";

export default function PayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardPanelRoute({ section: ["payouts"], searchParams }, PayoutsDashboardRoute);
}
