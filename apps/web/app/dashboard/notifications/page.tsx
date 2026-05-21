import { renderDashboardPanelRoute } from "@/components/dashboard-route-renderer";
import { NotificationsDashboardRoute } from "@/components/dashboard/route-panels";

export default function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardPanelRoute(
    { section: ["notifications"], searchParams },
    NotificationsDashboardRoute,
    { view: "compose" },
  );
}
