import { renderDashboardRoute } from "@/components/dashboard-route-renderer";

export default function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardRoute({ section: ["attendance"], searchParams });
}
