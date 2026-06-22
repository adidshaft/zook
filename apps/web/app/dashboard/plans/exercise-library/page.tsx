import { DashboardShell } from "@/components/dashboard-shell";
import { loadDashboardRouteProps } from "@/components/dashboard-route-renderer";
import { ExerciseLibraryDashboardRoute } from "@/components/dashboard/plans/exercise-library-dashboard-route";

export default async function ExerciseLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  const shellProps = await loadDashboardRouteProps({ section: ["plans", "exercise-library"], searchParams });
  const activeOrgId = shellProps.data.orgs[0]?.id;
  return (
    <DashboardShell {...shellProps}>
      {activeOrgId ? <ExerciseLibraryDashboardRoute orgId={activeOrgId} /> : null}
    </DashboardShell>
  );
}
