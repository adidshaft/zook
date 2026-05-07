import { renderDashboardRoute } from "../../dashboard-route";

export default function PaymentRefundsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardRoute({ section: ["payments", "refunds"], searchParams });
}
