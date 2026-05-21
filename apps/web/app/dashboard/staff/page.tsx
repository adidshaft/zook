import { renderDashboardRoute } from "@/components/dashboard-route-renderer";

export default function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardRoute({ section: ["staff"], searchParams });
}
