import { renderDashboardRoute } from "@/components/dashboard-route-renderer";

export default function PaymentRefundsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardRoute({ section: ["payments", "refunds"], searchParams });
}
