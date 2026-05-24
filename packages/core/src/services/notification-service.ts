import type { NotificationType, Permission, Role, UserSafetyState } from "../types";
import { hasPermission } from "../permissions";

const notificationPermissionByType: Record<NotificationType, Permission> = {
  TRANSACTIONAL: "NOTIFICATION_SEND_SELECTED",
  OPERATIONAL: "NOTIFICATION_SEND_OPERATIONAL",
  PROMOTIONAL: "NOTIFICATION_SEND_PROMOTIONAL",
  ENGAGEMENT: "NOTIFICATION_SEND_PROMOTIONAL",
  PLAN: "NOTIFICATION_SEND_PLAN",
  SECURITY: "NOTIFICATION_SEND_SELECTED"
};

export function canSendNotification(input: {
  roles: Role[];
  type: NotificationType;
  audience:
    | "selected"
    | "single_member"
    | "assigned_clients"
    | "all_active_members"
    | "expiring_soon"
    | "plan"
    | "branch_members";
  permissions?: Permission[];
}): boolean {
  if (input.audience === "assigned_clients") {
    return hasPermission(input.roles, "NOTIFICATION_SEND_ASSIGNED", input.permissions);
  }
  if (input.audience === "single_member") {
    return hasPermission(input.roles, "NOTIFICATION_SEND_SELECTED", input.permissions);
  }
  return hasPermission(input.roles, notificationPermissionByType[input.type], input.permissions);
}

export function canReceiveNotification(type: NotificationType, user: UserSafetyState): boolean {
  if (type === "TRANSACTIONAL" || type === "SECURITY") {
    return true;
  }
  if ((type === "PROMOTIONAL" || type === "ENGAGEMENT") && !user.marketingOptIn) {
    return false;
  }
  return true;
}

export type NotificationRateLimitKey =
  | "notificationSenderMinute"
  | "notificationSenderDaily"
  | "notificationOrgAllDaily"
  | "notificationOrgOperationalDaily"
  | "notificationOrgPromoDaily"
  | "notificationRecipientDaily";

export async function enforceNotificationRateLimits(input: {
  orgId: string;
  senderUserId: string;
  type: NotificationType;
  recipientUserIds: string[];
  consume: (rule: NotificationRateLimitKey, key: string, message: string) => Promise<void>;
}) {
  await input.consume(
    "notificationSenderMinute",
    `${input.orgId}:${input.senderUserId}`,
    "Please wait a moment before sending another message.",
  );
  await input.consume(
    "notificationSenderDaily",
    `${input.orgId}:${input.senderUserId}`,
    "This sender has reached today's message limit.",
  );
  await input.consume(
    "notificationOrgAllDaily",
    input.orgId,
    "This gym has reached today's message limit.",
  );
  if (input.type === "OPERATIONAL") {
    await input.consume(
      "notificationOrgOperationalDaily",
      input.orgId,
      "This gym has reached today's operational message limit.",
    );
  }
  if (input.type === "PROMOTIONAL" || input.type === "ENGAGEMENT") {
    await input.consume(
      "notificationOrgPromoDaily",
      input.orgId,
      "This gym has reached today's announcement limit.",
    );
  }
  for (const recipientUserId of input.recipientUserIds) {
    await input.consume(
      "notificationRecipientDaily",
      `${input.orgId}:${recipientUserId}`,
      "Some members have already received too many messages today.",
    );
  }
}

export type WhatsAppTransactionalTopic = "PAYMENT" | "ATTENDANCE" | "MEMBERSHIP";

const whatsappFanoutTopics = new Set<WhatsAppTransactionalTopic>([
  "PAYMENT",
  "ATTENDANCE",
  "MEMBERSHIP"
]);

export function shouldFanOutWhatsApp(input: {
  notificationType: NotificationType;
  topic?: string | null;
  recipientOptedIn: boolean;
}) {
  return (
    input.recipientOptedIn &&
    input.notificationType === "TRANSACTIONAL" &&
    Boolean(input.topic && whatsappFanoutTopics.has(input.topic as WhatsAppTransactionalTopic))
  );
}
