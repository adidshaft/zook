import type { Permission, Role } from "./types";

export const notificationPermissions = {
  createDraft: "NOTIFICATION_CREATE_DRAFT",
  sendSelectedMember: "NOTIFICATION_SEND_SELECTED",
  sendAssignedClient: "NOTIFICATION_SEND_ASSIGNED",
  sendOperationalBroadcast: "NOTIFICATION_SEND_OPERATIONAL",
  sendPromotionalBroadcast: "NOTIFICATION_SEND_PROMOTIONAL",
  sendRenewalCampaign: "NOTIFICATION_SEND_RENEWAL",
  sendPlanDietNotification: "NOTIFICATION_SEND_PLAN",
  approveBroadcast: "NOTIFICATION_APPROVE_BROADCAST",
  manageTemplates: "NOTIFICATION_MANAGE_TEMPLATES",
  viewDeliveryAnalytics: "NOTIFICATION_VIEW_ANALYTICS"
} satisfies Record<string, Permission>;

const ownerPermissions: Permission[] = [
  "ORG_MANAGE_BILLING",
  "ORG_MANAGE_STAFF",
  "ORG_MANAGE_PERMISSIONS",
  "ORG_MANAGE_PROFILE",
  "ORG_MANAGE_LOCATION",
  "ORG_VIEW_REPORTS",
  "MEMBERS_VIEW",
  "MEMBERS_MANAGE",
  "MEMBERSHIP_PLAN_MANAGE",
  "MEMBERSHIP_SUBSCRIPTION_MANAGE",
  "PAYMENTS_VIEW",
  "PAYMENTS_RECORD_OFFLINE",
  "PAYMENTS_REFUND",
  "COUPONS_MANAGE",
  "REFERRALS_MANAGE",
  "ATTENDANCE_QR_DISPLAY",
  "ATTENDANCE_APPROVE",
  "ATTENDANCE_MANUAL_OVERRIDE",
  "TRAINERS_MANAGE",
  "PT_RECORD",
  "PLANS_CREATE",
  "PLANS_PUBLISH_ALL",
  "PLANS_PUBLISH_ASSIGNED",
  "AI_USE_TEXT",
  "AI_GENERATE_PLAN",
  "AI_GENERATE_IMAGE",
  "AI_MANAGE_SETTINGS",
  "SHOP_MANAGE_PRODUCTS",
  "SHOP_FULFILL_ORDER",
  ...Object.values(notificationPermissions),
  "PRIVACY_VIEW_AUDIT"
];

export const defaultRolePermissions: Record<Role, Permission[]> = {
  PLATFORM_ADMIN: ["PLATFORM_MANAGE_ORGS", "PLATFORM_VIEW_AI_USAGE", "PLATFORM_MANAGE_SETTINGS"],
  OWNER: ownerPermissions,
  ADMIN: ownerPermissions.filter(
    (permission) =>
      permission !== "ORG_MANAGE_BILLING" && permission !== "ORG_MANAGE_PERMISSIONS",
  ),
  RECEPTIONIST: [
    "MEMBERS_VIEW",
    "PAYMENTS_RECORD_OFFLINE",
    "ATTENDANCE_QR_DISPLAY",
    "ATTENDANCE_APPROVE",
    "ATTENDANCE_MANUAL_OVERRIDE",
    "SHOP_FULFILL_ORDER",
    "NOTIFICATION_CREATE_DRAFT",
    "NOTIFICATION_SEND_OPERATIONAL"
  ],
  TRAINER: [
    "MEMBERS_VIEW",
    "PT_RECORD",
    "PLANS_CREATE",
    "PLANS_PUBLISH_ASSIGNED",
    "AI_USE_TEXT",
    "AI_GENERATE_PLAN",
    "AI_GENERATE_IMAGE",
    "NOTIFICATION_CREATE_DRAFT",
    "NOTIFICATION_SEND_ASSIGNED",
    "NOTIFICATION_SEND_PLAN"
  ],
  MEMBER: ["AI_USE_TEXT"]
};

export function permissionsForRoles(roles: Role[], overrides: Permission[] = []): Permission[] {
  return Array.from(
    new Set([...roles.flatMap((role) => defaultRolePermissions[role] ?? []), ...overrides]),
  );
}

export function hasPermission(
  roles: Role[],
  permission: Permission,
  overrides: Permission[] = [],
): boolean {
  return permissionsForRoles(roles, overrides).includes(permission);
}

export function requirePermission(
  roles: Role[],
  permission: Permission,
  overrides: Permission[] = [],
): void {
  if (!hasPermission(roles, permission, overrides)) {
    throw new Error(`Permission denied: ${permission}`);
  }
}

export function canAccessPlatform(roles: Role[], isPlatformAdmin = false): boolean {
  return isPlatformAdmin || roles.includes("PLATFORM_ADMIN");
}
