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
  return <DeskWorkspace {...desk} activeTab="pickup" />;
}
