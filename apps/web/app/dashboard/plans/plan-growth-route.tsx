import { renderDashboardPanelRoute } from "@/components/dashboard-route-renderer";
import {
  PlanCouponsDashboardRoute,
  PlanOffersDashboardRoute,
  PlanReferralsDashboardRoute,
} from "@/components/dashboard/route-panels";

type PlanGrowthRoute = "coupons" | "offers" | "referrals";

export async function renderPlanGrowthRoute({
  route,
  searchParams,
}: {
  route: PlanGrowthRoute;
  searchParams: Promise<{ branchId?: string }>;
}) {
  const RoutePanel =
    route === "coupons"
      ? PlanCouponsDashboardRoute
      : route === "offers"
        ? PlanOffersDashboardRoute
        : PlanReferralsDashboardRoute;
  return renderDashboardPanelRoute({ section: ["plans", route], searchParams }, RoutePanel);
}
