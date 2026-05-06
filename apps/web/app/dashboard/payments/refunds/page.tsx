import DashboardPage from "../../[[...section]]/page";

export default function PaymentRefundsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return DashboardPage({
    params: Promise.resolve({ section: ["payments", "refunds"] }),
    searchParams,
  });
}
