import { renderDashboardRoute } from "../../dashboard-route";

export default function ShopOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardRoute({ section: ["shop", "orders"], searchParams });
}
