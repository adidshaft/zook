import { renderDashboardRoute } from "@/components/dashboard-route-renderer";

export default function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardRoute({ section: ["billing"], searchParams });
}
