import { renderDashboardRoute } from "../dashboard-route";

export default function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardRoute({ section: ["reports"], searchParams });
}
