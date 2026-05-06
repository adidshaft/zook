import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@zook/db";
import { DashboardSignOutButton } from "@/components/dashboard-sign-out-button";
import { DeskPanel } from "@/components/desk-panel";
import { GlassCard, Pill } from "@/components/glass-card";
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
    return (
      <main className="grid min-h-dvh place-items-center px-5 py-8">
        <GlassCard variant="strong" className="w-full max-w-xl">
          <Pill tone="blue">Admin access</Pill>
          <h1 className="mt-5 text-3xl font-semibold text-white">Dashboard</h1>
          <p className="mt-3 text-sm leading-6 text-white/58">
            The desk is scoped to reception work. Your account has owner or admin access, so the
            full dashboard is the right place for your tools.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="zook-focus rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-black"
            >
              Dashboard
            </Link>
            <DashboardSignOutButton compact />
          </div>
        </GlassCard>
      </main>
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
    />
  );
}
