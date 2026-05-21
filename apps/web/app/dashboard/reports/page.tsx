import { renderDashboardPanelRoute } from "@/components/dashboard-route-renderer";
import { ReportsDashboardRoute } from "@/components/dashboard/route-panels";

export default function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardPanelRoute({ section: ["reports"], searchParams }, ReportsDashboardRoute);
}
