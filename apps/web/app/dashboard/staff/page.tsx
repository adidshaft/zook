import { renderDashboardRoute } from "../dashboard-route";

export default function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardRoute({ section: ["staff"], searchParams });
}
