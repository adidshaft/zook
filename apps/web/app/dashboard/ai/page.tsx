import { renderDashboardRoute } from "@/components/dashboard-route-renderer";

export default function AiPage({ searchParams }: { searchParams: Promise<{ branchId?: string }> }) {
  return renderDashboardRoute({ section: ["ai"], searchParams });
}
