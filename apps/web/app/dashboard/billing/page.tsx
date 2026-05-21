import { renderDashboardPanelRoute } from "@/components/dashboard-route-renderer";
import { BillingDashboardRoute } from "@/components/dashboard/route-panels";

export default function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardPanelRoute({ section: ["billing"], searchParams }, BillingDashboardRoute);
}
