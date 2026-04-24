import { DashboardShell } from "@/components/dashboard-shell";
import { getDashboardData } from "@/lib/data";
import { requireDashboardSession } from "@/lib/server-auth";

export default async function DashboardPage({
  params
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const { section } = await params;
  await requireDashboardSession();
  const data = await getDashboardData();
  return <DashboardShell section={section} data={data} />;
}
