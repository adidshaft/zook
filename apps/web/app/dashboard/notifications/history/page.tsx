import { renderDashboardRoute } from "../../dashboard-route";

export default function NotificationHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardRoute({ section: ["notifications", "history"], searchParams });
}
