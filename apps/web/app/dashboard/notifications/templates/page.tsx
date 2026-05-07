import { renderDashboardRoute } from "../../dashboard-route";

export default function NotificationTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardRoute({ section: ["notifications", "templates"], searchParams });
}
