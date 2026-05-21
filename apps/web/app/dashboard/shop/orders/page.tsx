import { renderDashboardRoute } from "@/components/dashboard-route-renderer";

export default function ShopOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardRoute({ section: ["shop", "orders"], searchParams });
}
