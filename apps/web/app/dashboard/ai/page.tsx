import { renderDashboardPanelRoute } from "@/components/dashboard-route-renderer";
import { AiDashboardRoute } from "@/components/dashboard/route-panels";

export default function AiPage({ searchParams }: { searchParams: Promise<{ branchId?: string }> }) {
  return renderDashboardPanelRoute({ section: ["ai"], searchParams }, AiDashboardRoute);
}
