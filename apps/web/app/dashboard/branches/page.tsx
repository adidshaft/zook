import { renderDashboardRoute } from "@/components/dashboard-route-renderer";

export default function BranchesPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardRoute({ section: ["branches"], searchParams });
}
