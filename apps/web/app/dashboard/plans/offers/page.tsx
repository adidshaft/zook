import DashboardPage from "../../[[...section]]/page";

export default function PlanOffersPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return DashboardPage({
    params: Promise.resolve({ section: ["plans", "offers"] }),
    searchParams,
  });
}
