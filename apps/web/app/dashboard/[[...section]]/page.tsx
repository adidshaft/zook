import { DashboardShell } from "@/components/dashboard-shell";
import { getDashboardData } from "@/lib/data";

export default async function DashboardPage({
  params
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const { section } = await params;
  const data = await getDashboardData();
  return <DashboardShell section={section} data={data} />;
}
