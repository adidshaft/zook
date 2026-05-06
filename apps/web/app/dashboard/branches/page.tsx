import DashboardPage from "../[[...section]]/page";

export default function BranchesPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return DashboardPage({
    params: Promise.resolve({ section: ["branches"] }),
    searchParams,
  });
}
