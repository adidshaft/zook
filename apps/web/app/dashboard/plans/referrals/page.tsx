import { renderDashboardRoute } from "../../dashboard-route";

export default function PlanReferralsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardRoute({ section: ["plans", "referrals"], searchParams });
}
