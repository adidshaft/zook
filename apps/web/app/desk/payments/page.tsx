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
  return <DeskWorkspace {...desk} activeTab="payment" />;
}
