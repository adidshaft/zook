import { redirect } from "next/navigation";
import type { AuthSessionSummary, Permission } from "@zook/core";
import { hasOwnerDashboardAccess } from "./auth-destinations";

const sectionAccessPermissions: Record<string, Permission[]> = {
  members: ["MEMBERS_VIEW", "MEMBERS_MANAGE"],
  "members/join-requests": ["MEMBERS_VIEW", "MEMBERS_MANAGE"],
  "join-requests": ["MEMBERS_VIEW", "MEMBERS_MANAGE"],
  attendance: ["ATTENDANCE_QR_DISPLAY", "ATTENDANCE_APPROVE", "ATTENDANCE_MANUAL_OVERRIDE"],
  notifications: ["NOTIFICATION_CREATE_DRAFT"],
  "notifications/templates": ["NOTIFICATION_MANAGE_TEMPLATES", "NOTIFICATION_CREATE_DRAFT"],
  "notifications/history": ["NOTIFICATION_CREATE_DRAFT"],
  reports: ["ORG_VIEW_REPORTS"],
  shop: ["SHOP_MANAGE_PRODUCTS", "SHOP_FULFILL_ORDER"],
  "shop/orders": ["SHOP_FULFILL_ORDER"],
  staff: ["ORG_MANAGE_STAFF"],
  plans: ["MEMBERSHIP_PLAN_MANAGE"],
  "plans/coupons": ["COUPONS_MANAGE"],
  "plans/offers": ["COUPONS_MANAGE"],
  "plans/referrals": ["REFERRALS_MANAGE"],
  payments: ["PAYMENTS_VIEW", "PAYMENTS_RECORD_OFFLINE"],
  payouts: ["TRAINERS_MANAGE"],
  "payments/refunds": ["PAYMENTS_REFUND"],
  branches: ["ORG_MANAGE_LOCATION"],
  audit: ["PRIVACY_VIEW_AUDIT"],
  ai: ["AI_MANAGE_SETTINGS", "AI_USE_TEXT"],
  billing: ["ORG_MANAGE_BILLING"],
  settings: ["ORG_MANAGE_PROFILE", "NOTIFICATION_MANAGE_TEMPLATES", "ATTENDANCE_QR_DISPLAY"],
  "public-profile": ["ORG_MANAGE_PROFILE"],
};

export function canAccessWebDashboard(session: Pick<AuthSessionSummary, "activeOrganization" | "user">) {
  if (session.user.isPlatformAdmin) {
    return true;
  }
  return hasOwnerDashboardAccess(session);
}

export function requirePermission(session: AuthSessionSummary, ...required: Permission[]) {
  if (session.user.isPlatformAdmin || required.length === 0) {
    return;
  }
  const permissions = new Set(session.activeOrganization?.permissions ?? []);
  if (!required.some((permission) => permissions.has(permission))) {
    redirect("/dashboard");
  }
}

export function requireDashboardSectionPermission(session: AuthSessionSummary, sectionKey: string) {
  if (!sectionKey) {
    return;
  }
  requirePermission(session, ...(sectionAccessPermissions[sectionKey] ?? []));
}
