import { renderDashboardPanelRoute } from "@/components/dashboard-route-renderer";
import { ShopDashboardRoute } from "@/components/dashboard/route-panels";

export default function ShopOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardPanelRoute(
    { section: ["shop", "orders"], searchParams },
    ShopDashboardRoute,
    { view: "orders" },
  );
}
