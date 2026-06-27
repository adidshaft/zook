import { prisma } from "@zook/db";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getRequestContext, requireAuth } from "../access";
import { notFoundError } from "../errors";
import { ok, readJson } from "../response";
import { clean, pathMatches } from "./core";

const notificationPreferenceSchema = z.object({
  orgId: z.string().optional(),
  transactional: z.boolean().optional(),
  operational: z.boolean().optional(),
  promotional: z.boolean().optional(),
  engagement: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
});

const notificationBulkReadSchema = z.object({
  ids: z.array(z.string()).max(100).default([]),
});

export async function handleNotificationsInbox(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["me", "notifications", "unread-count"])) {
    const userId = requireAuth(await getRequestContext(request));
    const unreadCount = await prisma.notificationRecipient.count({
      where: { userId, readAt: null, deliveryStatus: { not: "scheduled" } },
    });
    return ok({ unreadCount });
  }

  if (request.method === "GET" && pathMatches(path, ["me", "notifications", /.+/])) {
    const userId = requireAuth(await getRequestContext(request));
    const notificationId = path[2]!;
    const record = await prisma.notificationRecipient.findFirst({
      where: { userId, notificationId, deliveryStatus: { not: "scheduled" } },
    });
    if (!record) {
      throw notFoundError("Notification not found");
    }
    const notification = await prisma.notification.findUnique({
      where: { id: record.notificationId },
    });
    if (!notification) {
      throw notFoundError("Notification not found");
    }
    return ok({
      notification: {
        ...notification,
        recipientId: record.id,
        readAt: record.readAt,
        deliveryStatus: record.deliveryStatus,
        deliveredAt: record.deliveredAt,
      },
    });
  }

  if (request.method === "GET" && pathMatches(path, ["me", "notifications"])) {
    const userId = requireAuth(await getRequestContext(request));
    const limit = Math.min(
      Math.max(Number(request.nextUrl.searchParams.get("limit") ?? 50) || 50, 1),
      100,
    );
    const cursor = request.nextUrl.searchParams.get("cursor")?.trim();
    const recipients = await prisma.notificationRecipient.findMany({
      where: { userId, deliveryStatus: { not: "scheduled" } },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const page = recipients.slice(0, limit);
    const notifications = await prisma.notification.findMany({
      where: { id: { in: page.map((recipient) => recipient.notificationId) } },
    });
    return ok({
      notifications: page.map((recipient) => ({
        ...recipient,
        notification:
          notifications.find((notification) => notification.id === recipient.notificationId) ??
          null,
      })),
      nextCursor: recipients.length > limit ? (page[page.length - 1]?.id ?? null) : null,
      limit,
    });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "notifications", /.+/, "read"])) {
    const userId = requireAuth(await getRequestContext(request));
    const record = await prisma.notificationRecipient.findFirst({
      where: { id: path[2]!, userId },
    });
    if (!record) {
      throw notFoundError("Notification not found");
    }
    return ok({
      recipient: await prisma.notificationRecipient.update({
        where: { id: record.id },
        data: { readAt: record.readAt ?? new Date() },
      }),
    });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "notifications", "read"])) {
    const userId = requireAuth(await getRequestContext(request));
    const body = notificationBulkReadSchema.parse(await readJson(request));
    if (!body.ids.length) {
      return ok({ count: 0 });
    }
    const result = await prisma.notificationRecipient.updateMany({
      where: { id: { in: body.ids }, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return ok({ count: result.count });
  }
  if (request.method === "PATCH" && pathMatches(path, ["me", "notification-preferences"])) {
    const userId = requireAuth(await getRequestContext(request));
    const body = notificationPreferenceSchema.parse(await readJson(request));
    const existingPreference = await prisma.userNotificationPreference.findFirst({
      where: { userId, ...(body.orgId ? { orgId: body.orgId } : { orgId: null }) },
    });
    const preference = existingPreference
      ? await prisma.userNotificationPreference.update({
          where: { id: existingPreference.id },
          data: clean({
            transactional: body.transactional,
            operational: body.operational,
            promotional: body.promotional,
            engagement: body.engagement,
            pushEnabled: body.pushEnabled,
          }),
        })
      : await prisma.userNotificationPreference.create({
          data: clean({
            orgId: body.orgId ?? null,
            userId,
            transactional: body.transactional ?? true,
            operational: body.operational ?? true,
            promotional: body.promotional ?? true,
            engagement: body.engagement ?? true,
            pushEnabled: body.pushEnabled ?? false,
          }),
        });
    return ok({ preference });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "notification-preferences"])) {
    const userId = requireAuth(await getRequestContext(request));
    return ok({
      preferences: await prisma.userNotificationPreference.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      }),
    });
  }
  return undefined;
}
