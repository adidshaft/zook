import DashboardPage from "../../[[...section]]/page";

export default function ShopOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return DashboardPage({
    params: Promise.resolve({ section: ["shop", "orders"] }),
    searchParams,
  });
}
