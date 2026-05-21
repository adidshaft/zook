import { renderDashboardPanelRoute } from "@/components/dashboard-route-renderer";
import { MembersDashboardRoute } from "@/components/dashboard/route-panels";
import { redirect } from "next/navigation";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string; view?: string }>;
}) {
  const params = await searchParams;
  if (params.view === "join-requests") {
    const query = params.branchId ? `?branchId=${encodeURIComponent(params.branchId)}` : "";
    redirect(`/dashboard/members/join-requests${query}`);
  }
  return renderDashboardPanelRoute({ section: ["members"], searchParams }, MembersDashboardRoute, {
    view: "members",
  });
}
