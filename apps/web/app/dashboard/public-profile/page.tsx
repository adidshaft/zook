import { renderDashboardRoute } from "@/components/dashboard-route-renderer";

export default function PublicProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardRoute({ section: ["public-profile"], searchParams });
}
