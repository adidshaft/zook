import { renderDashboardRoute } from "@/components/dashboard-route-renderer";

export default function NotificationTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardRoute({ section: ["notifications", "templates"], searchParams });
}
