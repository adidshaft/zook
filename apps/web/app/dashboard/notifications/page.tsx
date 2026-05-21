import { renderDashboardRoute } from "@/components/dashboard-route-renderer";

export default function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardRoute({ section: ["notifications"], searchParams });
}
