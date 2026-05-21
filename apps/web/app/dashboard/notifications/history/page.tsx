import { renderDashboardRoute } from "@/components/dashboard-route-renderer";

export default function NotificationHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardRoute({ section: ["notifications", "history"], searchParams });
}
