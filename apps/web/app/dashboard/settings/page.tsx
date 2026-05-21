import { renderDashboardRoute } from "@/components/dashboard-route-renderer";

export default function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardRoute({ section: ["settings"], searchParams });
}
