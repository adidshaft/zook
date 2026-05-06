import DashboardPage from "../[[...section]]/page";

export default function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return DashboardPage({
    params: Promise.resolve({ section: ["audit"] }),
    searchParams,
  });
}
