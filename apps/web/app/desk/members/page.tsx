import { DeskWorkspace } from "@/components/desk/desk-workspace";
import { getDeskRouteContext } from "@/lib/desk-route";

export const metadata = {
  title: "Members | Zook Desk",
  robots: { index: false, follow: false },
};

export default async function DeskMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  const resolvedSearch = await searchParams;
  const desk = await getDeskRouteContext(resolvedSearch, "/desk/members");
  return <DeskWorkspace {...desk} activeTab="member" />;
}
