import { redirect } from "next/navigation";

export default async function TrainersPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  const params = await searchParams;
  const query = params.branchId ? `?branchId=${encodeURIComponent(params.branchId)}` : "";
  redirect(`/dashboard/staff${query}`);
}
