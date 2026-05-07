import { renderDashboardRoute } from "../../dashboard-route";

export default function PlanOffersPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardRoute({ section: ["plans", "offers"], searchParams });
}
