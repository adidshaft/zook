import { DashboardShell } from "@/components/dashboard-shell";
import { resolveMode } from "@/components/dashboard-operational-model";
import { getDashboardData } from "@/lib/data";
import {
  destinationToHref,
  hasOwnerDashboardAccess,
  resolvePostLoginDestination,
} from "@/lib/auth-destinations";
import { getOrigins } from "@/lib/origins";
import { requireDashboardSession } from "@/lib/server-auth";
import { redirect } from "next/navigation";
import type { Permission } from "@zook/core";

type DashboardRouteProps = {
  section?: string[] | undefined;
  searchParams: Promise<{ branchId?: string }>;
};

const sectionAccessPermissions: Partial<Record<ReturnType<typeof resolveMode>, Permission[]>> = {
  members: ["MEMBERS_VIEW", "MEMBERS_MANAGE"],
  "join-requests": ["MEMBERS_VIEW", "MEMBERS_MANAGE"],
  attendance: ["ATTENDANCE_QR_DISPLAY", "ATTENDANCE_APPROVE", "ATTENDANCE_MANUAL_OVERRIDE"],
  notifications: ["NOTIFICATION_CREATE_DRAFT"],
  "notification-templates": ["NOTIFICATION_MANAGE_TEMPLATES", "NOTIFICATION_CREATE_DRAFT"],
  "notification-history": ["NOTIFICATION_CREATE_DRAFT"],
  reports: ["ORG_VIEW_REPORTS"],
  shop: ["SHOP_MANAGE_PRODUCTS", "SHOP_FULFILL_ORDER"],
  staff: ["ORG_MANAGE_STAFF"],
  plans: ["MEMBERSHIP_PLAN_MANAGE"],
  "plan-coupons": ["COUPONS_MANAGE"],
  "plan-offers": ["COUPONS_MANAGE"],
  "plan-referrals": ["REFERRALS_MANAGE"],
  payments: ["PAYMENTS_VIEW", "PAYMENTS_RECORD_OFFLINE"],
  "payment-refunds": ["PAYMENTS_REFUND"],
  branches: ["ORG_MANAGE_LOCATION"],
  audit: ["PRIVACY_VIEW_AUDIT"],
  ai: ["AI_MANAGE_SETTINGS", "AI_USE_TEXT"],
  billing: ["ORG_MANAGE_BILLING"],
  settings: ["ORG_MANAGE_PROFILE", "NOTIFICATION_MANAGE_TEMPLATES", "ATTENDANCE_QR_DISPLAY"],
  "public-profile": ["ORG_MANAGE_PROFILE"],
};

function canAccessWebDashboard(session: Awaited<ReturnType<typeof requireDashboardSession>>) {
  if (session.user.isPlatformAdmin) {
    return true;
  }
  return hasOwnerDashboardAccess(session);
}

function canAccessDashboardSection(
  session: Awaited<ReturnType<typeof requireDashboardSession>>,
  sectionKey: string,
) {
  if (session.user.isPlatformAdmin || !sectionKey) {
    return true;
  }
  const required = sectionAccessPermissions[resolveMode(sectionKey)];
  if (!required?.length) {
    return true;
  }
  const permissions = new Set(session.activeOrganization?.permissions ?? []);
  return required.some((permission) => permissions.has(permission));
}

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
  if (!session.user.isPlatformAdmin && !hasOwnerDashboardAccess(session)) {
    redirect(postLoginHref());
  }
  if (!canAccessWebDashboard(session)) {
    redirect(postLoginHref());
  }
  if (!canAccessDashboardSection(session, section?.join("/") ?? "")) {
    redirect("/dashboard");
  }
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
  return (
    <DashboardShell
      section={shellProps.section}
      data={shellProps.data}
      isPlatformAdmin={shellProps.isPlatformAdmin}
      roles={shellProps.roles}
      permissions={shellProps.permissions}
      user={shellProps.user}
    />
  );
}
