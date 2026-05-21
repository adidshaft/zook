import { renderDashboardRoute } from "@/components/dashboard-route-renderer";

export default function JoinRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardRoute({ section: ["members", "join-requests"], searchParams });
}
