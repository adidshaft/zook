import { renderPlanGrowthRoute } from "../plan-growth-route";

export default function PlanOffersPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderPlanGrowthRoute({ route: "offers", searchParams });
}
