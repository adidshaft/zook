import DashboardPage from "../../[[...section]]/page";

export default function NotificationTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return DashboardPage({
    params: Promise.resolve({ section: ["notifications", "templates"] }),
    searchParams,
  });
}
