import { renderDashboardRoute } from "../dashboard-route";

export default function AiPage({ searchParams }: { searchParams: Promise<{ branchId?: string }> }) {
  return renderDashboardRoute({ section: ["ai"], searchParams });
}
