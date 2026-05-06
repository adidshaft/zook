import { redirect } from "next/navigation";
import { prisma } from "@zook/db";
import { DeskPanel } from "@/components/desk-panel";
import { getDashboardData } from "@/lib/data";
import { hasCoachAccess, hasDeskAccess, hasOwnerDashboardAccess } from "@/lib/auth-destinations";
import { requireDashboardSession } from "@/lib/server-auth";

export const metadata = {
  title: "Desk | Zook",
  robots: { index: false, follow: false },
};

export default async function DeskPage() {
  const session = await requireDashboardSession();
  if (session.user.isPlatformAdmin || hasOwnerDashboardAccess(session)) {
    redirect("/dashboard");
  }
  if (hasCoachAccess(session) && !hasDeskAccess(session)) {
    redirect("/coach");
  }
  if (!hasDeskAccess(session) || !session.activeOrgId) {
    redirect("/me");
  }

  const assignment = await prisma.organizationRoleAssignment.findFirst({
    where: {
      orgId: session.activeOrgId,
      userId: session.user.id,
      role: "RECEPTIONIST",
      branchId: { not: null },
    },
    orderBy: { createdAt: "desc" },
  });
  const data = await getDashboardData(session.activeOrgId, assignment?.branchId ?? undefined);
  const organization = data.orgs[0];

  if (!organization) {
    redirect("/gyms");
  }

  return (
    <DeskPanel
      orgId={organization.id}
      orgName={organization.name}
      branch={data.branchScope.selectedBranch}
    />
  );
}
