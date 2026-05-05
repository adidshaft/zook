import { DashboardShell } from "@/components/dashboard-shell";
import { getDashboardData } from "@/lib/data";
import { requireDashboardSession } from "@/lib/server-auth";

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
  const data = await getDashboardData(session.activeOrgId, branchId);
  return <DashboardShell section={section} data={data} />;
}
