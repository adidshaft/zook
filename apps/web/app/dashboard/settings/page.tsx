import { renderDashboardPanelRoute } from "@/components/dashboard-route-renderer";
import { SettingsDashboardRoute } from "@/components/dashboard/route-panels";

export default function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardPanelRoute({ section: ["settings"], searchParams }, SettingsDashboardRoute);
}
