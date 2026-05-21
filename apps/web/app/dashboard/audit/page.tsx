import { renderDashboardPanelRoute } from "@/components/dashboard-route-renderer";
import { AuditDashboardRoute } from "@/components/dashboard/route-panels";

export default function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardPanelRoute({ section: ["audit"], searchParams }, AuditDashboardRoute);
}
