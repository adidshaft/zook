import { redirect } from "next/navigation";
import { prisma } from "@zook/db";
import { getDashboardData } from "@/lib/data";
import {
  destinationToHref,
  hasCoachAccess,
  hasDeskAccess,
  hasOwnerDashboardAccess,
  resolvePostLoginDestination,
} from "@/lib/auth-destinations";
import { getOrigins } from "@/lib/origins";
import { requireDashboardSession } from "@/lib/server-auth";

type DeskSearch = {
  branchId?: string;
  from?: string;
  orderId?: string;
};

export async function getDeskRouteContext(search: DeskSearch, redirectPath: string) {
  const session = await requireDashboardSession({
    expectedHost: "dashboard",
    redirectPath,
  });
  const origins = getOrigins();
  const postLoginHref = () =>
    destinationToHref(resolvePostLoginDestination(session), "dashboard", origins);

  if (session.user.isPlatformAdmin || hasOwnerDashboardAccess(session)) {
    if (!session.activeOrgId) {
      redirect(postLoginHref());
    }
    const data = await getDashboardData(session.activeOrgId, search.branchId);
    const organization = data.orgs[0];
    if (!organization) {
      redirect(`${origins.public}/gyms`);
    }
    return {
      orgId: organization.id,
      orgName: organization.name,
      branch: data.branchScope.selectedBranch,
      locale: session.user.preferredLocale ?? "en",
      initialOrderId: search.orderId,
      canOpenManagement: true,
      redirectedFromDashboard: false,
    };
  }

  if (hasCoachAccess(session) && !hasDeskAccess(session)) {
    redirect("/coach");
  }
  if (!hasDeskAccess(session) || !session.activeOrgId) {
    redirect(postLoginHref());
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
  const data = await getDashboardData(
    session.activeOrgId,
    assignment?.branchId ?? search.branchId,
  );
  const organization = data.orgs[0];

  if (!organization) {
    redirect(`${origins.public}/gyms`);
  }

  return {
    orgId: organization.id,
    orgName: organization.name,
    branch: data.branchScope.selectedBranch,
    locale: session.user.preferredLocale ?? "en",
    initialOrderId: search.orderId,
    canOpenManagement: false,
    redirectedFromDashboard: search.from === "dashboard",
  };
}
