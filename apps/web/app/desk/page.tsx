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

export default async function DeskPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; orderId?: string; branchId?: string }>;
}) {
  const resolvedSearch = await searchParams;
  const session = await requireDashboardSession();
  if (session.user.isPlatformAdmin || hasOwnerDashboardAccess(session)) {
    if (!session.activeOrgId) {
      redirect("/dashboard");
    }
    const data = await getDashboardData(session.activeOrgId, resolvedSearch.branchId);
    const organization = data.orgs[0];
    if (!organization) {
      redirect("/gyms");
    }
    return (
      <DeskPanel
        orgId={organization.id}
        orgName={organization.name}
        branch={data.branchScope.selectedBranch}
        locale={session.user.preferredLocale ?? "en"}
        initialTab={resolvedSearch.tab === "pickup" ? "pickup" : undefined}
        initialOrderId={resolvedSearch.orderId}
      />
    );
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
  if (!assignment?.branchId) {
    redirect("/me");
  }
  const data = await getDashboardData(session.activeOrgId, assignment.branchId);
  const organization = data.orgs[0];

  if (!organization) {
    redirect("/gyms");
  }

  return (
    <DeskPanel
      orgId={organization.id}
      orgName={organization.name}
      branch={data.branchScope.selectedBranch}
      locale={session.user.preferredLocale ?? "en"}
      initialTab={resolvedSearch.tab === "pickup" ? "pickup" : undefined}
      initialOrderId={resolvedSearch.orderId}
    />
  );
}
