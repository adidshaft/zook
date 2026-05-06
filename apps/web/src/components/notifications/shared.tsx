"use client";

import { hasPermission, type Permission, type Role } from "@zook/core";

export type NotificationType =
  | "TRANSACTIONAL"
  | "OPERATIONAL"
  | "PROMOTIONAL"
  | "ENGAGEMENT"
  | "PLAN"
  | "SECURITY";

export type Audience =
  | "all_active_members"
  | "branch_members"
  | "expiring_soon"
  | "membership_plan"
  | "selected_members"
  | "single_member"
  | "assigned_clients";

type PermissionAudience =
  | "selected"
  | "single_member"
  | "assigned_clients"
  | "all_active_members"
  | "expiring_soon"
  | "plan"
  | "branch_members";

const notificationPermissionByType: Record<NotificationType, Permission> = {
  TRANSACTIONAL: "NOTIFICATION_SEND_SELECTED",
  OPERATIONAL: "NOTIFICATION_SEND_OPERATIONAL",
  PROMOTIONAL: "NOTIFICATION_SEND_PROMOTIONAL",
  ENGAGEMENT: "NOTIFICATION_SEND_PROMOTIONAL",
  PLAN: "NOTIFICATION_SEND_PLAN",
  SECURITY: "NOTIFICATION_SEND_SELECTED",
};

export type NotificationRow = {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  status: string;
  audience: string;
  pushEnabled?: boolean;
  createdAt: string;
  createdByName?: string | null;
  recipientStats?: {
    total: number;
    delivered: number;
    read: number;
    failed: number;
    scheduled: number;
  };
};

export type TemplateRow = {
  id: string;
  name: string;
  title: string;
  body: string;
  type: NotificationType;
  usageCount?: number;
  lastUsedAt?: string | null;
  active?: boolean;
};

export type NotificationRecipientRow = {
  id: string;
  userId: string;
  deliveryStatus: string;
  deliveredAt?: string | null;
  readAt?: string | null;
  createdAt: string;
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
};

export type MemberRow = {
  userId: string;
  profile?: { name?: string | null; phone?: string | null } | null;
};

export type BranchRow = { id: string; name: string };
export type PlanRow = { id: string; name: string; active?: boolean };

export type Preview = {
  resolvedRecipients: number;
  willDeliver: number;
  blockedByOptOut: number;
  blockedByMinor: number;
  budget?: {
    orgAllRemaining: number;
    orgOperationalRemaining: number;
    orgPromoRemaining: number;
    senderRemaining: number;
  };
};

export const messageTypes: Array<{ value: NotificationType; label: string; detail: string }> = [
  { value: "OPERATIONAL", label: "Operational update", detail: "Timings, closures, desk notices" },
  { value: "PROMOTIONAL", label: "Announcement", detail: "Sales, events, plan launches" },
  { value: "ENGAGEMENT", label: "Member engagement", detail: "Community updates and reminders" },
  { value: "PLAN", label: "Plan or workout", detail: "Trainer or membership-plan updates" },
  { value: "TRANSACTIONAL", label: "Direct message", detail: "One member, specific context" },
  { value: "SECURITY", label: "Security alert", detail: "Account or safety notice" },
];

export function audienceOptions(type: NotificationType): Array<{ value: Audience; label: string }> {
  if (type === "TRANSACTIONAL" || type === "SECURITY") {
    return [{ value: "single_member", label: "One member" }];
  }
  if (type === "PLAN") {
    return [
      { value: "assigned_clients", label: "Assigned clients" },
      { value: "membership_plan", label: "Members on a plan" },
      { value: "expiring_soon", label: "Expiring soon" },
    ];
  }
  return [
    { value: "all_active_members", label: "All active members" },
    { value: "branch_members", label: "One branch" },
    { value: "membership_plan", label: "Members on a plan" },
    { value: "expiring_soon", label: "Expiring soon" },
    ...(type === "PROMOTIONAL"
      ? []
      : [{ value: "selected_members" as const, label: "Selected members" }]),
  ];
}

export function memberLabel(member: MemberRow) {
  return member.profile?.name ?? member.profile?.phone ?? member.userId;
}

export function permissionAudience(audience: Audience): PermissionAudience {
  if (audience === "selected_members") return "selected";
  if (audience === "membership_plan") return "plan";
  return audience;
}

export function canUseNotificationOption(input: {
  roles: Role[];
  permissions: Permission[];
  type: NotificationType;
  audience: PermissionAudience;
}) {
  if (input.audience === "assigned_clients") {
    return hasPermission(input.roles, "NOTIFICATION_SEND_ASSIGNED", input.permissions);
  }
  if (input.audience === "single_member") {
    return hasPermission(input.roles, "NOTIFICATION_SEND_SELECTED", input.permissions);
  }
  return hasPermission(input.roles, notificationPermissionByType[input.type], input.permissions);
}
