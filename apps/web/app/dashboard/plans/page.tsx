import { renderDashboardPanelRoute } from "@/components/dashboard-route-renderer";
import { PlansDashboardRoute } from "@/components/dashboard/route-panels";

export default function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardPanelRoute({ section: ["plans"], searchParams }, PlansDashboardRoute);
}
