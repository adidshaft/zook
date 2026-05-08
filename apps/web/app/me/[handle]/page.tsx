import { redirect } from "next/navigation";
import { requireDashboardSession } from "@/lib/server-auth";
import MyMembershipPage from "../page";

export default async function PrivateMemberHandlePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const session = await requireDashboardSession();
  const { handle } = await params;
  const privateHandle = session.user.privateHandle?.toLowerCase();

  if (!privateHandle || privateHandle !== handle.toLowerCase()) {
    redirect("/me");
  }

  return <MyMembershipPage />;
}
