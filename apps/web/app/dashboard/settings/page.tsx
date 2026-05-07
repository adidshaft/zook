import { renderDashboardRoute } from "../dashboard-route";

export default function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardRoute({ section: ["public-profile"], searchParams });
}
