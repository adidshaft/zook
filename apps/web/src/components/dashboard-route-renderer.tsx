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

  const sectionKey = section?.join("/") ?? "";
  const shellDataMode = sectionKey === "reports" ? "full" : "fast";
  const data = await getOrganizationDashboardShellData(session.activeOrgId, branchId, shellDataMode);
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
    charts: data.charts,
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
