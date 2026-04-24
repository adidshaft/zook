import type { NotificationType } from "@zook/core";
import { getPushProvider, getPushProviderDiagnostics } from "@zook/core/providers";
import { prisma, type Prisma } from "@zook/db";

function notificationData(metadata: Prisma.JsonValue | null | undefined, fallback: Record<string, unknown>) {
  if (!metadata || Array.isArray(metadata) || typeof metadata !== "object") {
    return fallback;
  }
  return { ...fallback, ...metadata };
}

function mapPushDeliveryStatus(status: "queued" | "sent" | "failed" | "invalid_token") {
  if (status === "queued") {
    return "QUEUED" as const;
  }
  if (status === "sent") {
    return "SENT" as const;
  }
  return "FAILED" as const;
}

export async function deliverPushForNotification(input: {
  orgId?: string | null;
  notification: {
    id: string;
    type: NotificationType;
    title: string;
    body: string;
    pushEnabled: boolean;
    metadata?: Prisma.JsonValue | null;
  };
  userIds: string[];
}) {
  if (!input.notification.pushEnabled || !input.userIds.length) {
    return { attempted: false, eligibleUsers: 0, deliveries: 0 };
  }

  const preferences = await prisma.userNotificationPreference.findMany({
    where: {
      userId: { in: input.userIds },
      OR: input.orgId ? [{ orgId: input.orgId }, { orgId: null }] : [{ orgId: null }]
    }
  });
  const preferenceByUserId = new Map<string, (typeof preferences)[number]>();
  for (const preference of preferences) {
    if (!preferenceByUserId.has(preference.userId) || preference.orgId === input.orgId) {
      preferenceByUserId.set(preference.userId, preference);
    }
  }

  const eligibleUserIds = input.userIds.filter((userId) => preferenceByUserId.get(userId)?.pushEnabled ?? true);
  if (!eligibleUserIds.length) {
    return { attempted: false, eligibleUsers: 0, deliveries: 0 };
  }

  const devices = await prisma.pushDevice.findMany({
    where: {
      userId: { in: eligibleUserIds },
      status: "ACTIVE",
      revokedAt: null,
      ...(input.orgId ? { OR: [{ orgId: input.orgId }, { orgId: null }] } : {})
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
  });

  if (!devices.length) {
    return { attempted: false, eligibleUsers: eligibleUserIds.length, deliveries: 0 };
  }

  const notificationRecipients = await prisma.notificationRecipient.findMany({
    where: { notificationId: input.notification.id, userId: { in: eligibleUserIds } }
  });
  const recipientByUserId = new Map(notificationRecipients.map((recipient) => [recipient.userId, recipient]));

  const diagnostics = getPushProviderDiagnostics();
  if (diagnostics.status === "misconfigured" || diagnostics.status === "unsupported") {
    await prisma.pushDelivery.createMany({
      data: devices.map((device) => ({
        orgId: input.orgId ?? null,
        notificationId: input.notification.id,
        notificationRecipientId: recipientByUserId.get(device.userId)?.id ?? null,
        userId: device.userId,
        deviceId: device.id,
        provider: diagnostics.selectedProvider,
        status: "FAILED",
        attemptCount: 1,
        failureCode: "provider_unavailable",
        failureReason: diagnostics.missingEnv.length
          ? `Push provider is missing env: ${diagnostics.missingEnv.join(", ")}`
          : "Push provider is unavailable for this environment.",
        payload: notificationData(input.notification.metadata, {
          notificationId: input.notification.id,
          type: input.notification.type
        }) as Prisma.InputJsonValue,
        createdAt: new Date(),
        updatedAt: new Date()
      }))
    });

    return { attempted: false, eligibleUsers: eligibleUserIds.length, deliveries: devices.length };
  }

  const provider = getPushProvider();
  const payloads = devices.map((device) => ({
    token: device.token,
    title: input.notification.title,
    body: input.notification.body,
    data: notificationData(input.notification.metadata, {
      notificationId: input.notification.id,
      type: input.notification.type,
      ...(input.orgId ? { orgId: input.orgId } : {})
    })
  }));

  const results = await provider.sendBatch(payloads);

  await prisma.pushDelivery.createMany({
    data: results.map((result, index) => {
      const device = devices[index]!;
      const recipient = recipientByUserId.get(device.userId);
      const failed = result.status === "failed" || result.status === "invalid_token";
      return {
        orgId: input.orgId ?? null,
        notificationId: input.notification.id,
        notificationRecipientId: recipient?.id ?? null,
        userId: device.userId,
        deviceId: device.id,
        provider: provider.providerName,
        ...(result.providerMessageId ? { providerMessageId: result.providerMessageId } : {}),
        status: mapPushDeliveryStatus(result.status),
        attemptCount: 1,
        ...(result.status === "sent" ? { sentAt: new Date() } : {}),
        ...(failed ? { failureCode: result.errorCode ?? null, failureReason: result.errorMessage ?? null } : {}),
        payload: payloads[index]?.data as Prisma.InputJsonValue,
        response: result as unknown as Prisma.InputJsonValue,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    })
  });

  const invalidDevices = results
    .map((result, index) => ({ result, device: devices[index]! }))
    .filter((entry) => entry.result.status === "invalid_token");
  if (invalidDevices.length) {
    await prisma.$transaction(
      invalidDevices.map((entry) =>
        prisma.pushDevice.update({
          where: { id: entry.device.id },
          data: {
            status: "INVALIDATED",
            lastFailureAt: new Date(),
            failureReason: entry.result.errorMessage ?? "Device token is no longer valid.",
            updatedAt: new Date()
          }
        })
      )
    );
  }

  return {
    attempted: true,
    eligibleUsers: eligibleUserIds.length,
    deliveries: results.length
  };
}
