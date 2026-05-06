import DashboardPage from "../[[...section]]/page";

export default function AiPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return DashboardPage({
    params: Promise.resolve({ section: ["ai"] }),
    searchParams,
  });
}
