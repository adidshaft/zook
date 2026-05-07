import { renderDashboardRoute } from "../dashboard-route";

export default function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return renderDashboardRoute({ section: ["attendance"], searchParams });
}
