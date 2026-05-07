import { renderDashboardRoute } from "../dashboard-route";

export default function BranchesPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardRoute({ section: ["branches"], searchParams });
}
