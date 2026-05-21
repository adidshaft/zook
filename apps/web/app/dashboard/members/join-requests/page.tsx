import { renderDashboardPanelRoute } from "@/components/dashboard-route-renderer";
import { MembersDashboardRoute } from "@/components/dashboard/route-panels";

export default function JoinRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardPanelRoute(
    { section: ["members", "join-requests"], searchParams },
    MembersDashboardRoute,
    { view: "join-requests" },
  );
}
