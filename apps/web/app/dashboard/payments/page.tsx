import { renderDashboardRoute } from "../dashboard-route";

export default function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardRoute({ section: ["payments"], searchParams });
}
