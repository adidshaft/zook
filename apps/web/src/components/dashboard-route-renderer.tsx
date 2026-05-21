import { redirect } from "next/navigation";
import { DashboardShell } from "./dashboard-shell";
import {
  canAccessWebDashboard,
  requireDashboardSectionPermission,
} from "@/lib/dashboard-guards";
import { getDashboardData } from "@/lib/data";
import { destinationToHref, resolvePostLoginDestination } from "@/lib/auth-destinations";
import { getOrigins } from "@/lib/origins";
import { requireDashboardSession } from "@/lib/server-auth";

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

  const data = await getDashboardData(session.activeOrgId, branchId);
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
