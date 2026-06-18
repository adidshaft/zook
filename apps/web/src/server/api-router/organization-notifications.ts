import type { NextRequest } from "next/server";
import { z } from "zod";
import { publicUserEmail } from "@zook/core";
import { canSendNotification } from "@zook/core/services";
import { Prisma, prisma } from "@zook/db";
import { getRequestContext, requireOrgPermission } from "../access";
import { writeAuditLog } from "../audit";
import { forbiddenError, notFoundError } from "../errors";
import { assertRateLimit } from "../rate-limit";
import { deliverPushForNotification } from "../push-runtime";
import { ok, readJson } from "../response";
import {
  assertLimitAvailable,
  clean,
  enforceNotificationBudgets,
  getNotificationBudgetSnapshot,
  getObjectMetadata,
  getOrgSaasEntitlements,
  getOrgSaasUsage,
  notificationComposerSchema,
  pathMatches,
  resolveNotificationPreview,
  resolveNotificationRecipients,
  resolveOrgBranch,
  splitRecipientsByDailyCap,
} from "./core";

const notificationTemplateCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  type: z.enum(["TRANSACTIONAL", "OPERATIONAL", "PROMOTIONAL", "ENGAGEMENT", "PLAN", "SECURITY"]),
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(2).max(1000),
});

const notificationTemplatePatchSchema = notificationTemplateCreateSchema
  .partial()
  .extend({ active: z.boolean().optional() });

export async function handleOrganizationNotifications(request: NextRequest, path: string[]) {
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "notifications", "preview"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "NOTIFICATION_CREATE_DRAFT");
    await assertRateLimit(
      "notificationSendByActor",
      `${orgId}:${userId}:preview`,
      "Too many notification previews from this account.",
    );
    const body = notificationComposerSchema.parse(await readJson(request));
    if (body.branchId) {
      await resolveOrgBranch(orgId, body.branchId);
    }
    const permissionAudience =
      body.audience === "selected_members"
        ? "selected"
        : body.audience === "single_member"
          ? "single_member"
          : body.audience === "membership_plan"
            ? "plan"
            : body.audience;
    if (
      !canSendNotification({
        roles: ctx.roles,
        permissions: ctx.permissions,
        type: body.type,
        audience: permissionAudience,
      })
    ) {
      throw forbiddenError("You do not have permission to send this notification.");
    }
    const preview = await resolveNotificationPreview(
      clean({
        orgId,
        senderUserId: userId,
        audience: body.audience,
        type: body.type,
        selectedUserIds: body.selectedUserIds,
        singleUserId: body.singleUserId,
        planId: body.planId,
        branchId: body.branchId,
        daysAhead: body.daysAhead,
        excludeMinors: body.excludeMinors,
      }),
    );
    return ok({
      resolvedRecipients: preview.resolvedRecipients,
      willDeliver: preview.willDeliver,
      blockedByOptOut: preview.blockedByOptOut,
      blockedByMinor: preview.blockedByMinor,
      budget: await getNotificationBudgetSnapshot({ orgId, senderUserId: userId }),
    });
  }

  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "notifications"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "NOTIFICATION_CREATE_DRAFT");
    await assertRateLimit(
      "notificationSendByActor",
      `${orgId}:${userId}`,
      "Too many notification sends. Please wait before trying again.",
    );
    const body = notificationComposerSchema.parse(await readJson(request));
    if (body.branchId) {
      await resolveOrgBranch(orgId, body.branchId);
    }
    const permissionAudience =
      body.audience === "selected_members"
        ? "selected"
        : body.audience === "single_member"
          ? "single_member"
          : body.audience === "membership_plan"
            ? "plan"
            : body.audience;
    if (
      !canSendNotification({
        roles: ctx.roles,
        permissions: ctx.permissions,
        type: body.type,
        audience: permissionAudience,
      })
    ) {
      throw forbiddenError("You do not have permission to send this notification.");
    }
    const recipientUserIds = await resolveNotificationRecipients(
      clean({
        orgId,
        senderUserId: userId,
        audience: body.audience,
        type: body.type,
        selectedUserIds: body.selectedUserIds,
        singleUserId: body.singleUserId,
        ...(body.planId ? { planId: body.planId } : {}),
        branchId: body.branchId,
        daysAhead: body.daysAhead,
        excludeMinors: body.excludeMinors,
      }),
    );
    const [{ tier, entitlements }, usage] = await Promise.all([
      getOrgSaasEntitlements(orgId),
      getOrgSaasUsage(orgId),
    ]);
    assertLimitAvailable({
      limit: entitlements.notificationMonthlyLimit,
      used: usage.notificationMonthlyCount,
      add: recipientUserIds.length,
      label: "Monthly notification recipient",
      tier,
    });
    const recipientSplit = body.scheduleAt
      ? { sendNowUserIds: recipientUserIds, scheduledUserIds: [] as string[] }
      : await splitRecipientsByDailyCap({ orgId, recipientUserIds });
    await enforceNotificationBudgets({
      orgId,
      senderUserId: userId,
      type: body.type,
      recipientUserIds: recipientSplit.sendNowUserIds,
    });
    const scheduledFor = new Date();
    scheduledFor.setDate(scheduledFor.getDate() + 1);
    scheduledFor.setHours(8, 0, 0, 0);
    const onlyScheduledRecipients =
      !body.scheduleAt &&
      recipientSplit.scheduledUserIds.length > 0 &&
      recipientSplit.sendNowUserIds.length === 0;
    const notification = await prisma.notification.create({
      data: clean({
        orgId,
        branchId: body.branchId,
        createdById: userId,
        type: body.type,
        title: body.title,
        body: body.body,
        audience: body.audience,
        pushEnabled: body.pushEnabled,
        scheduledAt: body.scheduleAt
          ? new Date(body.scheduleAt)
          : onlyScheduledRecipients
            ? scheduledFor
            : undefined,
        status: body.scheduleAt || onlyScheduledRecipients ? "SCHEDULED" : "SENT",
        sentAt: body.scheduleAt || onlyScheduledRecipients ? undefined : new Date(),
        metadata: clean({
          selectedUserIds: body.selectedUserIds.length ? body.selectedUserIds : undefined,
          singleUserId: body.singleUserId,
          planId: body.planId,
          branchId: body.branchId,
          daysAhead: body.daysAhead,
          templateId: body.templateId,
          excludeMinors: body.excludeMinors,
          scheduledRecipientCount: recipientSplit.scheduledUserIds.length || undefined,
          scheduledRecipientUserIds: recipientSplit.scheduledUserIds.length
            ? recipientSplit.scheduledUserIds
            : undefined,
          scheduledRecipientsFor: recipientSplit.scheduledUserIds.length
            ? scheduledFor.toISOString()
            : undefined,
          ...(body.metadata ?? {}),
        }) as Prisma.InputJsonValue,
      }),
    });
    if (recipientUserIds.length) {
      await prisma.notificationRecipient.createMany({
        data: [
          ...recipientSplit.sendNowUserIds.map((recipientUserId) => ({
            notificationId: notification.id,
            userId: recipientUserId,
            deliveryStatus: body.scheduleAt ? "scheduled" : "in_app",
            ...(body.scheduleAt ? {} : { deliveredAt: new Date() }),
          })),
          ...recipientSplit.scheduledUserIds.map((recipientUserId) => ({
            notificationId: notification.id,
            userId: recipientUserId,
            deliveryStatus: "scheduled",
          })),
        ],
        skipDuplicates: true,
      });
    }
    if (!body.scheduleAt) {
      await deliverPushForNotification({
        orgId,
        notification: {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          pushEnabled: notification.pushEnabled,
          metadata: notification.metadata,
        },
        userIds: recipientSplit.sendNowUserIds,
      });
    }
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "notification.sent",
      entityType: "notification",
      entityId: notification.id,
      metadata: {
        type: notification.type,
        audience: notification.audience,
        recipients: recipientSplit.sendNowUserIds.length,
        scheduledRecipients: recipientSplit.scheduledUserIds.length,
      },
    });
    return ok({
      notification,
      recipientCount: recipientSplit.sendNowUserIds.length,
      scheduledRecipientCount: recipientSplit.scheduledUserIds.length,
    });
  }

  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "notifications", "templates"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "NOTIFICATION_CREATE_DRAFT");
    const templates = await prisma.notificationTemplate.findMany({
      where: { orgId, active: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
    const templateIds = new Set(templates.map((template) => template.id));
    const notifications = templateIds.size
      ? await prisma.notification.findMany({
          where: { orgId },
          select: { metadata: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 500,
        })
      : [];
    const usage = notifications.reduce<
      Map<string, { usageCount: number; lastUsedAt: Date | null }>
    >((map, notification) => {
      const templateId = getObjectMetadata(notification.metadata).templateId;
      if (typeof templateId !== "string" || !templateIds.has(templateId)) {
        return map;
      }
      const current = map.get(templateId) ?? { usageCount: 0, lastUsedAt: null };
      current.usageCount += 1;
      if (!current.lastUsedAt || notification.createdAt > current.lastUsedAt) {
        current.lastUsedAt = notification.createdAt;
      }
      map.set(templateId, current);
      return map;
    }, new Map());
    return ok({
      templates: templates.map((template) => ({
        ...template,
        usageCount: usage.get(template.id)?.usageCount ?? 0,
        lastUsedAt: usage.get(template.id)?.lastUsedAt ?? null,
      })),
    });
  }

  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "notifications", "templates"])
  ) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "NOTIFICATION_MANAGE_TEMPLATES");
    const body = notificationTemplateCreateSchema.parse(await readJson(request));
    const template = await prisma.notificationTemplate.create({
      data: { orgId, createdById: userId, ...body },
    });
    return ok({ template });
  }

  if (
    request.method === "PATCH" &&
    pathMatches(path, ["orgs", /.+/, "notifications", "templates", /.+/])
  ) {
    const orgId = path[1]!;
    const templateId = path[4]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "NOTIFICATION_MANAGE_TEMPLATES");
    const body = notificationTemplatePatchSchema.parse(await readJson(request));
    const existing = await prisma.notificationTemplate.findFirst({
      where: { id: templateId, orgId },
    });
    if (!existing) {
      throw notFoundError("Template not found");
    }
    const template = await prisma.notificationTemplate.update({
      where: { id: existing.id },
      data: clean(body),
    });
    return ok({ template });
  }

  if (
    request.method === "DELETE" &&
    pathMatches(path, ["orgs", /.+/, "notifications", "templates", /.+/])
  ) {
    const orgId = path[1]!;
    const templateId = path[4]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "NOTIFICATION_MANAGE_TEMPLATES");
    const existing = await prisma.notificationTemplate.findFirst({
      where: { id: templateId, orgId },
    });
    if (!existing) {
      throw notFoundError("Template not found");
    }
    const template = await prisma.notificationTemplate.update({
      where: { id: existing.id },
      data: { active: false },
    });
    return ok({ template });
  }

  if (
    request.method === "GET" &&
    pathMatches(path, ["orgs", /.+/, "notifications", /.+/, "recipients"])
  ) {
    const orgId = path[1]!;
    const notificationId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "NOTIFICATION_CREATE_DRAFT");
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, orgId },
    });
    if (!notification) {
      throw notFoundError("Notification not found");
    }
    const recipients = await prisma.notificationRecipient.findMany({
      where: { notificationId },
      orderBy: [{ deliveryStatus: "asc" }, { createdAt: "desc" }],
      take: 500,
    });
    const users = recipients.length
      ? await prisma.user.findMany({
          where: { id: { in: recipients.map((recipient) => recipient.userId) } },
          select: { id: true, name: true, email: true, phone: true },
        })
      : [];
    const usersById = new Map(users.map((user) => [user.id, user]));
    return ok({
      notification,
      recipients: recipients.map((recipient) => {
        const user = usersById.get(recipient.userId);
        return {
          ...recipient,
          user: user
            ? {
                id: user.id,
                name: user.name,
                email: publicUserEmail(user.email) ?? "",
                phone: user.phone,
              }
            : null,
        };
      }),
    });
  }

  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "notifications", /.+/, "resend-undelivered"])
  ) {
    const orgId = path[1]!;
    const notificationId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "NOTIFICATION_CREATE_DRAFT");
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, orgId },
    });
    if (!notification) {
      throw notFoundError("Notification not found");
    }
    const recipients = await prisma.notificationRecipient.findMany({
      where: {
        notificationId,
        OR: [
          { deliveryStatus: "failed" },
          { deliveredAt: null, deliveryStatus: { not: "scheduled" } },
        ],
      },
    });
    if (!recipients.length) {
      return ok({ resent: 0 });
    }
    await enforceNotificationBudgets({
      orgId,
      senderUserId: userId,
      type: notification.type,
      recipientUserIds: recipients.map((recipient) => recipient.userId),
    });
    await deliverPushForNotification({
      orgId,
      notification: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        pushEnabled: notification.pushEnabled,
        metadata: notification.metadata,
      },
      userIds: recipients.map((recipient) => recipient.userId),
    });
    await prisma.notificationRecipient.updateMany({
      where: { id: { in: recipients.map((recipient) => recipient.id) } },
      data: { deliveryStatus: "in_app", deliveredAt: new Date() },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "notification.resend_undelivered",
      entityType: "notification",
      entityId: notification.id,
      metadata: { recipients: recipients.length },
    });
    return ok({ resent: recipients.length });
  }

  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "notifications"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "NOTIFICATION_CREATE_DRAFT");
    const notifications = await prisma.notification.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const notificationIds = notifications.map((notification) => notification.id);
    const creatorIds = notifications
      .map((notification) => notification.createdById)
      .filter((id): id is string => Boolean(id));
    const [recipients, creators] = await Promise.all([
      notificationIds.length
        ? prisma.notificationRecipient.findMany({
            where: { notificationId: { in: notificationIds } },
            select: {
              notificationId: true,
              deliveryStatus: true,
              deliveredAt: true,
              readAt: true,
            },
          })
        : Promise.resolve([]),
      creatorIds.length
        ? prisma.user.findMany({
            where: { id: { in: creatorIds } },
            select: { id: true, name: true, email: true },
          })
        : Promise.resolve([]),
    ]);
    const creatorById = new Map(creators.map((creator) => [creator.id, creator]));
    const recipientStats = recipients.reduce<
      Map<
        string,
        { total: number; delivered: number; read: number; failed: number; scheduled: number }
      >
    >((map, recipient) => {
      const current = map.get(recipient.notificationId) ?? {
        total: 0,
        delivered: 0,
        read: 0,
        failed: 0,
        scheduled: 0,
      };
      current.total += 1;
      if (recipient.deliveredAt || recipient.deliveryStatus === "in_app") current.delivered += 1;
      if (recipient.readAt) current.read += 1;
      if (recipient.deliveryStatus === "failed") current.failed += 1;
      if (recipient.deliveryStatus === "scheduled") current.scheduled += 1;
      map.set(recipient.notificationId, current);
      return map;
    }, new Map());
    return ok({
      notifications: notifications.map((notification) => {
        const creator = notification.createdById ? creatorById.get(notification.createdById) : null;
        return {
          ...notification,
          createdByName: creator?.name ?? creator?.email ?? null,
          recipientStats: recipientStats.get(notification.id) ?? {
            total: 0,
            delivered: 0,
            read: 0,
            failed: 0,
            scheduled: 0,
          },
        };
      }),
    });
  }

  return undefined;
}
