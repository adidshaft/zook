import { DashboardShell } from "@/components/dashboard-shell";
import { loadDashboardRouteProps } from "@/components/dashboard-route-renderer";
import { ClassesDashboardRoute } from "@/components/dashboard/classes/classes-dashboard-route";
import { prisma } from "@zook/db";

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  const shellProps = await loadDashboardRouteProps({ section: ["classes"], searchParams });
  const activeOrgId = shellProps.data.orgs[0]?.id;
  const trainerAssignments = activeOrgId
    ? await prisma.organizationRoleAssignment.findMany({
        where: { orgId: activeOrgId, role: "TRAINER" },
        select: { userId: true },
      })
    : [];
  const trainerIds = Array.from(new Set(trainerAssignments.map((assignment) => assignment.userId)));
  const trainers = trainerIds.length
    ? await prisma.user.findMany({
        where: { id: { in: trainerIds } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <DashboardShell {...shellProps}>
      {activeOrgId ? (
        <ClassesDashboardRoute
          orgId={activeOrgId}
          branchScope={shellProps.data.branchScope}
          trainerOptions={trainers}
          currentUserId={shellProps.user.id}
          permissions={shellProps.permissions}
        />
      ) : null}
    </DashboardShell>
  );
}
