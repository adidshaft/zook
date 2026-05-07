import { renderPlanGrowthRoute } from "../plan-growth-route";

export default function PlanReferralsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderPlanGrowthRoute({ route: "referrals", searchParams });
}
