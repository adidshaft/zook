import { DashboardShell } from "@/components/dashboard-shell";
import { getDashboardData } from "@/lib/data";
import { requireDashboardSession } from "@/lib/server-auth";
import { redirect } from "next/navigation";

const dashboardAccessPermissions = new Set([
  "ORG_VIEW_REPORTS",
  "ORG_MANAGE_STAFF",
  "ORG_MANAGE_PROFILE",
  "ORG_MANAGE_BILLING",
  "MEMBERS_VIEW",
  "MEMBERS_MANAGE",
  "PAYMENTS_VIEW",
  "PLANS_CREATE",
  "PT_RECORD",
]);

function canAccessWebDashboard(session: Awaited<ReturnType<typeof requireDashboardSession>>) {
  if (session.user.isPlatformAdmin) {
    return true;
  }
  return Boolean(
    session.activeOrganization?.permissions.some((permission) =>
      dashboardAccessPermissions.has(permission),
    ),
  );
}

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<{ branchId?: string }>;
}) {
  const { section } = await params;
  const { branchId } = await searchParams;
  const session = await requireDashboardSession();
  if (!session.activeOrgId) {
    redirect(session.user.isPlatformAdmin ? "/platform" : "/gyms");
  }
  if (!canAccessWebDashboard(session)) {
    redirect("/gyms");
  }
  const data = await getDashboardData(session.activeOrgId, branchId);
  return <DashboardShell section={section} data={data} isPlatformAdmin={session.user.isPlatformAdmin} />;
}
