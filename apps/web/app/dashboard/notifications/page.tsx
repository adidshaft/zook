import DashboardPage from "../[[...section]]/page";

export default function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return DashboardPage({
    params: Promise.resolve({ section: ["notifications"] }),
    searchParams,
  });
}
