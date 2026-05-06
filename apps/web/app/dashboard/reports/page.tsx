import DashboardPage from "../[[...section]]/page";

export default function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return DashboardPage({
    params: Promise.resolve({ section: ["reports"] }),
    searchParams,
  });
}
