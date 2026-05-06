import DashboardPage from "../[[...section]]/page";

export default function PublicProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  return DashboardPage({
    params: Promise.resolve({ section: ["public-profile"] }),
    searchParams,
  });
}
