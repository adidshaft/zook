import { DeskChrome } from "@/components/desk/desk-chrome";
import { DeskWorkspace } from "@/components/desk/desk-workspace";
import { getDeskRouteContext } from "@/lib/desk-route";

export const metadata = {
  title: "Orders | Zook Desk",
  robots: { index: false, follow: false },
};

export default async function DeskOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string; orderId?: string }>;
}) {
  const resolvedSearch = await searchParams;
  const desk = await getDeskRouteContext(resolvedSearch, "/desk/orders");
  return (
    <DeskChrome
      orgId={desk.orgId}
      orgName={desk.orgName}
      branchId={desk.branch?.id ?? null}
      activeTab="pickup"
      locale={desk.locale}
      permissions={desk.permissions}
      canOpenManagement={desk.canOpenManagement}
    >
      <DeskWorkspace {...desk} activeTab="pickup" />
    </DeskChrome>
  );
}
