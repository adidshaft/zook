import { renderDashboardPanelRoute } from "@/components/dashboard-route-renderer";
import { BranchesDashboardRoute } from "@/components/dashboard/route-panels";

export default function BranchesPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardPanelRoute({ section: ["branches"], searchParams }, BranchesDashboardRoute);
}
