import { renderDashboardRoute } from "@/components/dashboard-route-renderer";

export default function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardRoute({ searchParams });
}
