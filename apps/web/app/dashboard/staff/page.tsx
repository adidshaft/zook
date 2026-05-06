import DashboardPage from "../[[...section]]/page";

export default function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return DashboardPage({
    params: Promise.resolve({ section: ["staff"] }),
    searchParams,
  });
}
