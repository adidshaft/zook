import { zookDemoFixtures } from "@zook/core/demo-fixtures";

export function memberNotificationsDemoResponse(
  pathname: string,
  method: string,
  init: { body?: unknown },
  helpers: { nowIso: () => string },
) {
  if (pathname === "/me/notifications") {
    return {
      notifications: zookDemoFixtures.notifications.map((notification) => ({
        id: notification.id,
        readAt: notification.readAt,
        deliveredAt: notification.createdAt,
        notification: {
          id: notification.id,
          title: notification.title,
          body: notification.message,
          type: notification.type,
          status: "SENT",
          createdAt: notification.createdAt,
          metadata: { targetRoute: notification.targetRoute },
        },
      })),
    };
  }

  if (pathname.match(/^\/me\/notifications\/[^/]+$/) && method === "GET") {
    const notificationId = decodeURIComponent(pathname.split("/").pop() ?? "");
    const notification = zookDemoFixtures.notifications.find((entry) => entry.id === notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }
    return {
      notification: {
        id: notification.id,
        title: notification.title,
        body: notification.message,
        type: notification.type,
        createdAt: notification.createdAt,
        readAt: notification.readAt,
        metadata: { targetRoute: notification.targetRoute },
      },
    };
  }

  if (pathname === "/me/notifications/read") {
    const body = init.body as { ids?: string[] } | undefined;
    return { count: body?.ids?.length ?? 0 };
  }

  if (pathname.match(/^\/me\/notifications\/[^/]+\/read$/) && method === "POST") {
    return { ok: true };
  }

  if (pathname === "/me/consents") {
    return {
      exportRequests: [],
      deletionRequests: [],
      exportJobs: [],
      deletionJobs: [],
    };
  }

  if (pathname === "/me/data-export-request") {
    return {
      request: {
        id: "offline-export-request",
        status: "PENDING",
        createdAt: helpers.nowIso(),
      },
    };
  }

  if (pathname === "/me/account-deletion-request") {
    return {
      request: {
        id: "offline-deletion-request",
        status: "PENDING",
        createdAt: helpers.nowIso(),
        scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    };
  }

  return undefined;
}
