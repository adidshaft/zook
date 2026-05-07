import { renderDashboardRoute } from "../dashboard-route";

export default function PublicProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardRoute({ section: ["public-profile"], searchParams });
}
