import { redirect } from "next/navigation";
import { DeskChrome } from "@/components/desk/desk-chrome";
import { DeskWorkspace } from "@/components/desk/desk-workspace";
import { getDeskRouteContext } from "@/lib/desk-route";

export const metadata = {
  title: "Desk | Zook",
  robots: { index: false, follow: false },
};

export default async function DeskPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; orderId?: string; branchId?: string; from?: string }>;
}) {
  const resolvedSearch = await searchParams;
  if (resolvedSearch.tab === "pickup") {
    const params = new URLSearchParams();
    if (resolvedSearch.orderId) params.set("orderId", resolvedSearch.orderId);
    if (resolvedSearch.branchId) params.set("branchId", resolvedSearch.branchId);
    redirect(`/desk/orders${params.size > 0 ? `?${params.toString()}` : ""}`);
  }
  const desk = await getDeskRouteContext(resolvedSearch, "/desk");
  return (
    <DeskChrome
      orgId={desk.orgId}
      orgName={desk.orgName}
      branchId={desk.branch?.id ?? null}
      activeTab="queue"
      locale={desk.locale}
      permissions={desk.permissions}
      canOpenManagement={desk.canOpenManagement}
      user={desk.user}
      showSwitchOrganization={desk.showSwitchOrganization}
    >
      <DeskWorkspace {...desk} activeTab="queue" />
    </DeskChrome>
  );
}
