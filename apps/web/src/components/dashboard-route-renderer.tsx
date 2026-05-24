import { redirect } from "next/navigation";
import { DashboardShell } from "./dashboard-shell";
import type { ComponentType } from "react";
import {
  canAccessWebDashboard,
  requireDashboardSectionPermission,
} from "@/lib/dashboard-guards";
import { getOrganizationDashboardShellData } from "@/lib/data";
import { destinationToHref, resolvePostLoginDestination } from "@/lib/auth-destinations";
import { getOrigins } from "@/lib/origins";
import { requireDashboardSession } from "@/lib/server-auth";
import type { DashboardRoutePanelBaseProps } from "./dashboard/route-panels";
import { prisma } from "@zook/db";

type DashboardRouteProps = {
  section?: string[] | undefined;
  searchParams: Promise<{ branchId?: string | undefined }>;
};

export async function loadDashboardRouteProps({ section, searchParams }: DashboardRouteProps) {
  const { branchId } = await searchParams;
  const session = await requireDashboardSession({
    expectedHost: "dashboard",
    redirectPath: "/dashboard",
  });
  const origins = getOrigins();
  const postLoginHref = () =>
    destinationToHref(resolvePostLoginDestination(session), "dashboard", origins);
  if (!session.activeOrgId) {
    redirect(postLoginHref());
  }
  if (!canAccessWebDashboard(session)) {
    redirect(postLoginHref());
  }
  requireDashboardSectionPermission(session, section?.join("/") ?? "");

  const data = await getOrganizationDashboardShellData(session.activeOrgId, branchId);
  const activeRoles = session.activeOrganization?.roles ?? [];
  if (
    activeRoles.some((role) => role === "OWNER" || role === "ADMIN") &&
    section?.[0] !== "billing"
  ) {
    const subscription = await prisma.saaSSubscription.findUnique({
      where: { orgId: session.activeOrgId },
    });
    const trialEndAt = subscription?.trialEndAt ?? data.orgs[0]?.trialEndAt;
    const graceEndsAt = trialEndAt
      ? new Date(new Date(trialEndAt).getTime() + 7 * 24 * 60 * 60 * 1000)
      : null;
    const paid =
      subscription?.status === "ACTIVE" &&
      (!subscription.nextRenewalAt || subscription.nextRenewalAt.getTime() >= Date.now());
    if (!paid && graceEndsAt && graceEndsAt.getTime() < Date.now()) {
      redirect("/dashboard/billing");
    }
  }
  return {
    section,
    data,
    isPlatformAdmin: session.user.isPlatformAdmin,
    roles: session.activeOrganization?.roles ?? [],
    permissions: session.activeOrganization?.permissions ?? [],
    user: {
      name: session.user.name,
      email: session.user.email,
      preferredLocale: session.user.preferredLocale ?? null,
    },
  };
}

export async function renderDashboardRoute(routeProps: DashboardRouteProps) {
  const shellProps = await loadDashboardRouteProps(routeProps);
  return <DashboardShell {...shellProps} />;
}

type LoadedDashboardRouteProps = Awaited<ReturnType<typeof loadDashboardRouteProps>>;

function getDashboardRoutePanelProps({
  data,
  roles,
  permissions,
}: LoadedDashboardRouteProps): DashboardRoutePanelBaseProps | null {
  const activeOrg = data.orgs[0];
  if (!activeOrg) {
    return null;
  }
  return {
    orgId: activeOrg.id,
    organization: {
      id: activeOrg.id,
      name: activeOrg.name,
      city: activeOrg.city,
      state: activeOrg.state,
      status: activeOrg.status,
      joinMode: activeOrg.joinMode,
      attendanceMode: activeOrg.attendanceMode,
      trialEndAt: activeOrg.trialEndAt,
      contactEmail: activeOrg.contactEmail,
      contactPhone: activeOrg.contactPhone,
    },
    summary: data.summary,
    branchScope: data.branchScope,
    auditLogCount: data.auditLogCount,
    initialJoinRequests: data.joinRequests,
    initialNotifications: data.notifications,
    initialProducts: data.products,
    initialAiUsage: data.aiUsage,
    roles,
    permissions,
  };
}

export async function renderDashboardPanelRoute<TExtra extends object = object>(
  routeProps: DashboardRouteProps,
  Panel: ComponentType<DashboardRoutePanelBaseProps & TExtra>,
  panelProps?: TExtra,
) {
  const shellProps = await loadDashboardRouteProps(routeProps);
  const routePanelProps = getDashboardRoutePanelProps(shellProps);
  const sectionContent = routePanelProps ? (
    <Panel {...routePanelProps} {...(panelProps ?? ({} as TExtra))} />
  ) : null;
  return <DashboardShell {...shellProps}>{sectionContent}</DashboardShell>;
}
