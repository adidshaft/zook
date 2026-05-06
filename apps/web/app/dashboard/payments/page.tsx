import DashboardPage from "../[[...section]]/page";

export default function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return DashboardPage({
    params: Promise.resolve({ section: ["payments"] }),
    searchParams,
  });
}
