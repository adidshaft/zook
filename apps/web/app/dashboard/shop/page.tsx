import DashboardPage from "../[[...section]]/page";

export default function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return DashboardPage({
    params: Promise.resolve({ section: ["shop"] }),
    searchParams,
  });
}
