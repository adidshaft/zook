import { renderDashboardRoute } from "../dashboard-route";

export default function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardRoute({ section: ["audit"], searchParams });
}
