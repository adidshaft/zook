import { renderDashboardRoute } from "@/components/dashboard-route-renderer";

export default function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardRoute({ section: ["shop"], searchParams });
}
