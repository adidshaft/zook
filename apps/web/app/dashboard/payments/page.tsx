import { renderDashboardPanelRoute } from "@/components/dashboard-route-renderer";
import { PaymentsDashboardRoute } from "@/components/dashboard/route-panels";

export default function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardPanelRoute({ section: ["payments"], searchParams }, PaymentsDashboardRoute);
}
