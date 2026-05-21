import { renderDashboardPanelRoute } from "@/components/dashboard-route-renderer";
import { PublicProfileDashboardRoute } from "@/components/dashboard/route-panels";

export default function PublicProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardPanelRoute(
    { section: ["public-profile"], searchParams },
    PublicProfileDashboardRoute,
  );
}
