import { renderDashboardRoute } from "../dashboard-route";

export default function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardRoute({ section: ["shop"], searchParams });
}
