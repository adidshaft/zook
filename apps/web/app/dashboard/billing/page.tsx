import DashboardPage from "../[[...section]]/page";

export default function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return DashboardPage({
    params: Promise.resolve({ section: ["payments", "billing"] }),
    searchParams,
  });
}
