import { renderDashboardRoute } from "../dashboard-route";

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<{ branchId?: string }>;
}) {
  const { section } = await params;
  return renderDashboardRoute({ section, searchParams });
}
