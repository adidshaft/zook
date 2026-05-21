import { renderDashboardPanelRoute } from "@/components/dashboard-route-renderer";
import { NotificationsDashboardRoute } from "@/components/dashboard/route-panels";

export default function NotificationHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardPanelRoute(
    { section: ["notifications", "history"], searchParams },
    NotificationsDashboardRoute,
    { view: "history" },
  );
}
