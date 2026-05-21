import { renderDashboardPanelRoute } from "@/components/dashboard-route-renderer";
import { AttendanceDashboardRoute } from "@/components/dashboard/route-panels";

export default function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardPanelRoute(
    { section: ["attendance"], searchParams },
    AttendanceDashboardRoute,
  );
}
