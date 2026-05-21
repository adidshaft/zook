import { renderDashboardRoute } from "@/components/dashboard-route-renderer";

export default function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardRoute({ section: ["plans"], searchParams });
}
