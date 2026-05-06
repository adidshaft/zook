import DashboardPage from "../../[[...section]]/page";

export default function PlanReferralsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return DashboardPage({
    params: Promise.resolve({ section: ["plans", "referrals"] }),
    searchParams,
  });
}
