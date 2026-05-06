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
  audience: "selected" | "assigned_clients" | "all_active_members" | "expiring_soon" | "plan";
  permissions?: Permission[];
}): boolean {
  if (input.audience === "assigned_clients") {
    return hasPermission(input.roles, "NOTIFICATION_SEND_ASSIGNED", input.permissions);
  }
  return hasPermission(input.roles, notificationPermissionByType[input.type], input.permissions);
}

export function canReceiveNotification(type: NotificationType, user: UserSafetyState): boolean {
  if (type === "TRANSACTIONAL" || type === "SECURITY") {
    return true;
  }
  if (user.isMinor && (type === "PROMOTIONAL" || type === "ENGAGEMENT")) {
    return false;
  }
  if ((type === "PROMOTIONAL" || type === "ENGAGEMENT") && !user.marketingOptIn) {
    return false;
  }
  return true;
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
