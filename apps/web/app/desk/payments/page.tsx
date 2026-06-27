import { DeskChrome } from "@/components/desk/desk-chrome";
import { DeskWorkspace } from "@/components/desk/desk-workspace";
import { getDeskRouteContext } from "@/lib/desk-route";

export const metadata = {
  title: "Payments | Zook Desk",
  robots: { index: false, follow: false },
};

export default async function DeskPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string; orderId?: string }>;
}) {
  const resolvedSearch = await searchParams;
  const desk = await getDeskRouteContext(resolvedSearch, "/desk/payments");
  return (
    <DeskChrome
      orgId={desk.orgId}
      orgName={desk.orgName}
      branchId={desk.branch?.id ?? null}
      activeTab="payment"
      locale={desk.locale}
      permissions={desk.permissions}
      canOpenManagement={desk.canOpenManagement}
      user={desk.user}
      showSwitchOrganization={desk.showSwitchOrganization}
    >
      <DeskWorkspace {...desk} activeTab="payment" />
    </DeskChrome>
  );
}
