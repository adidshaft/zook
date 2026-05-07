import { renderDashboardRoute } from "../dashboard-route";

export default function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardRoute({ section: ["members"], searchParams });
}
