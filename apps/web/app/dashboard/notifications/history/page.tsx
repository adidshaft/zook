import DashboardPage from "../../[[...section]]/page";

export default function NotificationHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return DashboardPage({
    params: Promise.resolve({ section: ["notifications", "history"] }),
    searchParams,
  });
}
