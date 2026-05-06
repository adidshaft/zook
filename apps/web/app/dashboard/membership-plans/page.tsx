import DashboardPage from "../[[...section]]/page";

export default function MembershipPlansPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return DashboardPage({
    params: Promise.resolve({ section: ["plans"] }),
    searchParams,
  });
}
