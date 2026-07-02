import type { OrgRole } from "@zook/core";
import { Prisma, prisma } from "@zook/db";
import { deliverPushForNotification } from "../push-runtime";

function clean<T extends Record<string, unknown>>(input: T): any {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

export async function createDirectNotification(input: {
  orgId?: string;
  createdById?: string;
  type: "TRANSACTIONAL" | "OPERATIONAL" | "PROMOTIONAL" | "ENGAGEMENT" | "PLAN" | "SECURITY";
  title: string;
  body: string;
  audience: string;
  metadata?: Prisma.InputJsonValue;
  userIds: string[];
  pushEnabled?: boolean;
}) {
  const notification = await prisma.notification.create({
    data: clean({
      orgId: input.orgId,
      createdById: input.createdById,
      type: input.type,
      title: input.title,
      body: input.body,
      audience: input.audience,
      pushEnabled:
        input.pushEnabled ?? (input.type === "TRANSACTIONAL" || input.type === "SECURITY"),
      metadata: input.metadata,
      status: "SENT",
      sentAt: new Date(),
    }),
  });
  if (input.userIds.length) {
    await prisma.notificationRecipient.createMany({
      data: input.userIds.map((userId) => ({
        notificationId: notification.id,
        userId,
        deliveryStatus: "in_app",
        deliveredAt: new Date(),
      })),
      skipDuplicates: true,
    });
  }
  await deliverPushForNotification({
    ...(input.orgId ? { orgId: input.orgId } : {}),
    notification: {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      pushEnabled: notification.pushEnabled,
      metadata: notification.metadata,
    },
    userIds: input.userIds,
  });
  return notification;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolvePlatformBroadcastRecipients(input: {
  targetOrgIds: string[];
  targetRoles: OrgRole[];
}) {
  const orgs = await prisma.organization.findMany({
    where: {
      ...(input.targetOrgIds.length ? { id: { in: input.targetOrgIds } } : {}),
      status: { notIn: ["SUSPENDED", "DELETED"] },
    },
    select: { id: true },
    take: 500,
  });
  const orgIds = orgs.map((org) => org.id);
  if (!orgIds.length) {
    return new Map<string, string[]>();
  }

  const memberships = await prisma.organizationUser.findMany({
    where: { orgId: { in: orgIds }, status: "active" },
    select: { orgId: true, userId: true },
  });
  if (!input.targetRoles.length) {
    const byOrg = new Map<string, Set<string>>();
    for (const membership of memberships) {
      const users = byOrg.get(membership.orgId) ?? new Set<string>();
      users.add(membership.userId);
      byOrg.set(membership.orgId, users);
    }
    return new Map(Array.from(byOrg, ([orgId, users]) => [orgId, Array.from(users)]));
  }

  const roleAssignments = await prisma.organizationRoleAssignment.findMany({
    where: { orgId: { in: orgIds }, role: { in: input.targetRoles } },
    select: { orgId: true, userId: true },
  });
  const activeByOrg = new Map<string, Set<string>>();
  for (const membership of memberships) {
    const users = activeByOrg.get(membership.orgId) ?? new Set<string>();
    users.add(membership.userId);
    activeByOrg.set(membership.orgId, users);
  }

  const byOrg = new Map<string, Set<string>>();
  for (const assignment of roleAssignments) {
    if (!activeByOrg.get(assignment.orgId)?.has(assignment.userId)) {
      continue;
    }
    const users = byOrg.get(assignment.orgId) ?? new Set<string>();
    users.add(assignment.userId);
    byOrg.set(assignment.orgId, users);
  }
  return new Map(Array.from(byOrg, ([orgId, users]) => [orgId, Array.from(users)]));
}

export async function fanOutPlatformBroadcast(input: {
  broadcast: {
    id: string;
    title: string;
    body: string;
    severity: string;
    targetOrgIds: string[];
    targetRoles: OrgRole[];
    createdByUserId: string;
  };
}) {
  const recipientsByOrg = await resolvePlatformBroadcastRecipients({
    targetOrgIds: input.broadcast.targetOrgIds,
    targetRoles: input.broadcast.targetRoles,
  });
  let notifications = 0;
  let recipients = 0;
  let chunksSent = 0;
  for (const [orgId, userIds] of recipientsByOrg) {
    for (const chunk of chunkArray(userIds, 500)) {
      if (chunksSent > 0) {
        await sleep(60_000);
      }
      const notification = await createDirectNotification({
        orgId,
        createdById: input.broadcast.createdByUserId,
        type: "OPERATIONAL",
        title: input.broadcast.title,
        body: input.broadcast.body,
        audience: "platform_broadcast",
        pushEnabled: true,
        metadata: {
          platformBroadcastId: input.broadcast.id,
          severity: input.broadcast.severity,
          throttle: "max_500_push_devices_per_minute",
        } as Prisma.InputJsonValue,
        userIds: chunk,
      });
      notifications += notification ? 1 : 0;
      recipients += chunk.length;
      chunksSent++;
    }
  }
  return { notifications, recipients, chunks: chunksSent, throttleMsBetweenChunks: 60_000 };
}
