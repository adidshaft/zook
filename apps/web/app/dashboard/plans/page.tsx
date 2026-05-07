import { renderDashboardRoute } from "../dashboard-route";

export default function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardRoute({ section: ["plans"], searchParams });
}
