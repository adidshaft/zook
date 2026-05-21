import { DashboardShell } from "@/components/dashboard-shell";
import { loadDashboardRouteProps } from "@/components/dashboard-route-renderer";

type PlanGrowthRoute = "coupons" | "offers" | "referrals";

export async function renderPlanGrowthRoute({
  route,
  searchParams,
}: {
  route: PlanGrowthRoute;
  searchParams: Promise<{ branchId?: string }>;
}) {
  const shellProps = await loadDashboardRouteProps({
    section: ["plans", route],
    searchParams,
  });

  return <DashboardShell {...shellProps} />;
}
