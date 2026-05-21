import { renderDashboardPanelRoute } from "@/components/dashboard-route-renderer";
import { PaymentRefundsDashboardRoute } from "@/components/dashboard/route-panels";

export default function PaymentRefundsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardPanelRoute(
    { section: ["payments", "refunds"], searchParams },
    PaymentRefundsDashboardRoute,
  );
}
