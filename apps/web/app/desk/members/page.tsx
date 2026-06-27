import { DeskChrome } from "@/components/desk/desk-chrome";
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
  return (
    <DeskChrome
      orgId={desk.orgId}
      orgName={desk.orgName}
      branchId={desk.branch?.id ?? null}
      activeTab="member"
      locale={desk.locale}
      permissions={desk.permissions}
      canOpenManagement={desk.canOpenManagement}
      user={desk.user}
      showSwitchOrganization={desk.showSwitchOrganization}
    >
      <DeskWorkspace {...desk} activeTab="member" />
    </DeskChrome>
  );
}
