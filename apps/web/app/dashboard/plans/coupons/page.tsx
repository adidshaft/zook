import DashboardPage from "../../[[...section]]/page";

export default function PlanCouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return DashboardPage({
    params: Promise.resolve({ section: ["plans", "coupons"] }),
    searchParams,
  });
}
