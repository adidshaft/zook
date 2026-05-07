import { renderDashboardRoute } from "../../dashboard-route";

export default function PlanCouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardRoute({ section: ["plans", "coupons"], searchParams });
}
