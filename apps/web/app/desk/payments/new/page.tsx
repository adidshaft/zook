import { DeskWorkspace } from "@/components/desk/desk-workspace";
import { getDeskRouteContext } from "@/lib/desk-route";

export const metadata = {
  title: "Record Payment | Zook Desk",
  robots: { index: false, follow: false },
};

export default async function NewDeskPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string; memberId?: string; orderId?: string }>;
}) {
  const resolvedSearch = await searchParams;
  const desk = await getDeskRouteContext(resolvedSearch, "/desk/payments/new");
  return <DeskWorkspace {...desk} activeTab="payment" initialMemberUserId={resolvedSearch.memberId} />;
}
