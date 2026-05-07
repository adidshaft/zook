import { renderPlanGrowthRoute } from "../plan-growth-route";

export default function PlanCouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderPlanGrowthRoute({ route: "coupons", searchParams });
}
