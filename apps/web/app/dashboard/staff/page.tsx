import { renderDashboardPanelRoute } from "@/components/dashboard-route-renderer";
import { StaffDashboardRoute } from "@/components/dashboard/route-panels";

export default function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardPanelRoute({ section: ["staff"], searchParams }, StaffDashboardRoute);
}
