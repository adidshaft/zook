import { renderDashboardRoute } from "../dashboard-route";

export default function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardRoute({ section: ["notifications"], searchParams });
}
