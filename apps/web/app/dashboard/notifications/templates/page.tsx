import { renderDashboardPanelRoute } from "@/components/dashboard-route-renderer";
import { NotificationsDashboardRoute } from "@/components/dashboard/route-panels";

export default function NotificationTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardPanelRoute(
    { section: ["notifications", "templates"], searchParams },
    NotificationsDashboardRoute,
    { view: "templates" },
  );
}
