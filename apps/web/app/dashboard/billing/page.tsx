import { renderDashboardRoute } from "../dashboard-route";

export default function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardRoute({ section: ["payments", "billing"], searchParams });
}
