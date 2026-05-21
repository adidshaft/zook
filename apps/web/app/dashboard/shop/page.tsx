import { renderDashboardPanelRoute } from "@/components/dashboard-route-renderer";
import { ShopDashboardRoute } from "@/components/dashboard/route-panels";

export default function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardPanelRoute({ section: ["shop"], searchParams }, ShopDashboardRoute, {
    view: "products",
  });
}
