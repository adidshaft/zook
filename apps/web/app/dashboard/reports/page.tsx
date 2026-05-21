import { renderDashboardRoute } from "@/components/dashboard-route-renderer";

export default function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardRoute({ section: ["reports"], searchParams });
}
