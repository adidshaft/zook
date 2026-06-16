import { redirect } from "next/navigation";
import { DashboardShell } from "./dashboard-shell";
import type { ComponentType } from "react";
import {
  canAccessWebDashboard,
  requireDashboardSectionPermission,
} from "@/lib/dashboard-guards";
import type { MemberRow, PaymentRow } from "@/components/dashboard/types";
import { getOrganizationDashboardShellData } from "@/lib/data";
import { destinationToHref, resolvePostLoginDestination } from "@/lib/auth-destinations";
import { getOrigins } from "@/lib/origins";
import { requireDashboardSession } from "@/lib/server-auth";
import { getOrganizationMembers } from "@/server/domains/members/read-models";
import { getOrganizationPaymentsPage } from "@/server/domains/payments";
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
      id: session.user.id,
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
  initialMembers,
  initialPaymentsPage,
}: LoadedDashboardRouteProps & {
  initialMembers?: MemberRow[] | undefined;
  initialPaymentsPage?:
    | { payments: PaymentRow[]; nextCursor?: string | null; limit: number }
    | undefined;
}): DashboardRoutePanelBaseProps | null {
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
    ...(initialMembers ? { initialMembers } : {}),
    ...(initialPaymentsPage ? { initialPaymentsPage } : {}),
    roles,
    permissions,
  };
}

function serializeForClient<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function renderDashboardPanelRoute<TExtra extends object = object>(
  routeProps: DashboardRouteProps,
  Panel: ComponentType<DashboardRoutePanelBaseProps & TExtra>,
  panelProps?: TExtra,
) {
  const shellProps = await loadDashboardRouteProps(routeProps);
  const activeOrgId = shellProps.data.orgs[0]?.id;
  const initialMembers =
    routeProps.section?.[0] === "members" && activeOrgId
      ? (serializeForClient(await getOrganizationMembers(activeOrgId)) as unknown as MemberRow[])
      : undefined;
  const initialPaymentsPage =
    routeProps.section?.[0] === "payments" && activeOrgId
      ? (serializeForClient(
          await getOrganizationPaymentsPage({
            orgId: activeOrgId,
            branchId: shellProps.data.branchScope.allBranches
              ? undefined
              : shellProps.data.branchScope.selectedBranch?.id,
            limit: 50,
          }),
        ) as unknown as { payments: PaymentRow[]; nextCursor?: string | null; limit: number })
      : undefined;
  const routePanelProps = getDashboardRoutePanelProps({
    ...shellProps,
    ...(initialMembers ? { initialMembers } : {}),
    ...(initialPaymentsPage ? { initialPaymentsPage } : {}),
  });
  const sectionContent = routePanelProps ? (
    <Panel {...routePanelProps} {...(panelProps ?? ({} as TExtra))} />
  ) : null;
  return <DashboardShell {...shellProps}>{sectionContent}</DashboardShell>;
}
