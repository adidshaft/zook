import { redirect } from "next/navigation";
import { renderMembershipSurface } from "@/components/member-membership-surface";
import { requireDashboardSession } from "@/lib/server-auth";

export default async function PrivateMemberHandlePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const session = await requireDashboardSession();
  const { handle } = await params;
  const privateHandle = session.user.privateHandle?.toLowerCase();

  if (session.user.slug) {
    redirect(`/m/${session.user.slug}`);
  }
  if (!privateHandle || privateHandle !== handle.toLowerCase()) {
    redirect("/me");
  }

  return renderMembershipSurface(session);
}
