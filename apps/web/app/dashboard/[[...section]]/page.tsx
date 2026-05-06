import { DashboardShell } from "@/components/dashboard-shell";
import { resolveMode } from "@/components/dashboard-operational-model";
import { getDashboardData } from "@/lib/data";
import { hasCoachAccess, hasDeskAccess, hasOwnerDashboardAccess } from "@/lib/auth-destinations";
import { requireDashboardSession } from "@/lib/server-auth";
import { redirect } from "next/navigation";
import type { Permission } from "@zook/core";

const dashboardAccessPermissions = new Set([
  "ORG_VIEW_REPORTS",
  "ORG_MANAGE_STAFF",
  "ORG_MANAGE_PROFILE",
  "ORG_MANAGE_BILLING",
  "MEMBERS_VIEW",
  "MEMBERS_MANAGE",
  "PAYMENTS_VIEW",
  "MEMBERSHIP_PLAN_MANAGE",
]);

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
  payments: ["PAYMENTS_VIEW", "PAYMENTS_RECORD_OFFLINE"],
  branches: ["ORG_MANAGE_LOCATION"],
  audit: ["PRIVACY_VIEW_AUDIT"],
  ai: ["AI_MANAGE_SETTINGS", "AI_USE_TEXT"],
  "public-profile": ["ORG_MANAGE_PROFILE"],
};

function canAccessWebDashboard(session: Awaited<ReturnType<typeof requireDashboardSession>>) {
  if (session.user.isPlatformAdmin) {
    return true;
  }
  return Boolean(
    session.activeOrganization?.permissions.some((permission) =>
      dashboardAccessPermissions.has(permission),
    ),
  );
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

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<{ branchId?: string }>;
}) {
  const { section } = await params;
  const { branchId } = await searchParams;
  const session = await requireDashboardSession();
  if (!session.activeOrgId) {
    redirect(session.user.isPlatformAdmin ? "/platform" : "/gyms");
  }
  if (!session.user.isPlatformAdmin && !hasOwnerDashboardAccess(session)) {
    if (hasDeskAccess(session)) {
      redirect("/desk");
    }
    if (hasCoachAccess(session)) {
      redirect("/coach");
    }
    redirect("/gyms");
  }
  if (!canAccessWebDashboard(session)) {
    redirect("/gyms");
  }
  if (!canAccessDashboardSection(session, section?.join("/") ?? "")) {
    redirect("/dashboard");
  }
  const data = await getDashboardData(session.activeOrgId, branchId);
  return (
    <DashboardShell
      section={section}
      data={data}
      isPlatformAdmin={session.user.isPlatformAdmin}
      roles={session.activeOrganization?.roles ?? []}
      permissions={session.activeOrganization?.permissions ?? []}
      user={{
        name: session.user.name,
        email: session.user.email,
        preferredLocale: session.user.preferredLocale ?? null,
      }}
    />
  );
}
