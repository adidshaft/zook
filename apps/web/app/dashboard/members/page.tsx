import DashboardPage from "../[[...section]]/page";

export default function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return DashboardPage({
    params: Promise.resolve({ section: ["members"] }),
    searchParams,
  });
}
