import { createHash } from "node:crypto";
import { buildStorageKey } from "@zook/core/providers";
import { Prisma, prisma } from "@zook/db";
import type { NextRequest } from "next/server";

import { getRequestContext, requireAuth } from "../access";
import { writeAuditLog } from "../audit";
import { conflictError } from "../errors";
import { assertRateLimit } from "../rate-limit";
import { currentRequestId } from "../request-state";
import { ok } from "../response";
import {
  assertNotImpersonating,
  clean,
  getStorageProviderOrThrow,
  pathMatches,
  USER_HISTORY_LIST_LIMIT,
} from "./core";

async function generateUserDataExport(input: { userId: string; orgId?: string }) {
  const [
    user,
    memberships,
    attendance,
    payments,
    consents,
    exportRequests,
    deletionRequests,
    shopOrders,
    planAssignments,
    workouts,
    progressEntries,
    habits,
  ] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: input.userId } }),
    prisma.memberSubscription.findMany({
      where: clean({
        memberUserId: input.userId,
        orgId: input.orgId ?? undefined,
      }),
      orderBy: { createdAt: "desc" },
    }),
    prisma.attendanceRecord.findMany({
      where: clean({
        userId: input.userId,
        orgId: input.orgId ?? undefined,
      }),
      orderBy: { checkedInAt: "desc" },
    }),
    prisma.payment.findMany({
      where: clean({
        userId: input.userId,
        orgId: input.orgId ?? undefined,
      }),
      orderBy: { createdAt: "desc" },
    }),
    prisma.consentRecord.findMany({
      where: clean({
        userId: input.userId,
        orgId: input.orgId ?? undefined,
      }),
      orderBy: { createdAt: "desc" },
    }),
    prisma.dataExportRequest.findMany({
      where: { userId: input.userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.accountDeletionRequest.findMany({
      where: { userId: input.userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.shopOrder.findMany({
      where: clean({
        userId: input.userId,
        orgId: input.orgId ?? undefined,
      }),
      orderBy: { createdAt: "desc" },
    }),
    prisma.planAssignment.findMany({
      where: clean({
        assignedToUserId: input.userId,
        orgId: input.orgId ?? undefined,
      }),
      orderBy: { createdAt: "desc" },
    }),
    prisma.workoutSession.findMany({
      where: clean({
        userId: input.userId,
        organizationId: input.orgId ?? undefined,
        deletedAt: null,
      }),
      orderBy: { startedAt: "desc" },
    }),
    prisma.bodyProgressEntry.findMany({
      where: clean({
        userId: input.userId,
        organizationId: input.orgId ?? undefined,
      }),
      orderBy: { measuredAt: "desc" },
    }),
    prisma.memberHabit.findMany({
      where: clean({
        userId: input.userId,
        organizationId: input.orgId ?? undefined,
      }),
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const recipients = await prisma.notificationRecipient.findMany({
    where: { userId: input.userId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const notifications = recipients.length
    ? await prisma.notification.findMany({
        where: { id: { in: recipients.map((recipient) => recipient.notificationId) } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const payload = {
    exportedAt: new Date().toISOString(),
    scope: input.orgId ? { orgId: input.orgId } : { scope: "all_orgs" },
    user,
    memberships,
    attendance,
    payments,
    consents,
    exportRequests,
    deletionRequests,
    shopOrders,
    planAssignments,
    workouts,
    progressEntries,
    habits,
    notifications: recipients.map((recipient) => ({
      ...recipient,
      notification:
        notifications.find((notification) => notification.id === recipient.notificationId) ?? null,
    })),
  };

  const body = Buffer.from(JSON.stringify(payload, null, 2), "utf8");
  const checksum = createHash("sha256").update(body).digest("hex");
  const key = buildStorageKey({
    category: "privacy_export",
    ...(input.orgId ? { orgId: input.orgId } : {}),
    ownerUserId: input.userId,
    originalName: `zook-data-export-${input.userId}.json`,
  });
  const storageProvider = getStorageProviderOrThrow();
  const upload = await storageProvider.uploadFile({
    category: "privacy_export",
    key,
    body,
    contentType: "application/json",
    sizeBytes: body.length,
    originalName: `zook-data-export-${input.userId}.json`,
    visibility: "private",
    cacheControl: "private, max-age=0, no-store",
  });
  const signedUrl = await storageProvider.getSignedUrl({ key, expiresInSeconds: 24 * 60 * 60 });
  const fileAsset = await prisma.fileAsset.create({
    data: {
      ...(input.orgId ? { orgId: input.orgId } : {}),
      ownerUserId: input.userId,
      originalName: `zook-data-export-${input.userId}.json`,
      storageKey: key,
      url: upload.url,
      mimeType: "application/json",
      sizeBytes: body.length,
      purpose: "data_export",
      category: "privacy_export",
      visibility: "private",
      storageProvider: storageProvider.getDiagnostics().provider,
      checksum,
      metadata: {
        recordCount:
          memberships.length +
          attendance.length +
          payments.length +
          consents.length +
          shopOrders.length +
          planAssignments.length +
          workouts.length +
          progressEntries.length +
          habits.length +
          recipients.length,
      } as Prisma.InputJsonValue,
    },
  });

  return {
    fileAssetId: fileAsset.id,
    exportUrl: signedUrl,
    checksum,
    recordCount:
      memberships.length +
      attendance.length +
      payments.length +
      consents.length +
      shopOrders.length +
      planAssignments.length +
      workouts.length +
      progressEntries.length +
      habits.length +
      recipients.length,
  };
}

export async function handlePrivacy(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["me", "guardian-consent"])) {
    requireAuth(await getRequestContext(request));
    return ok({
      deprecated: true,
      message: "Guardian consent is no longer required for membership, attendance, plans, or PT.",
      consents: [],
      challenges: [],
    });
  }
  if (
    request.method === "POST" &&
    (pathMatches(path, ["me", "guardian-consent", "request"]) ||
      pathMatches(path, ["me", "guardian-consent", "resend"]) ||
      pathMatches(path, ["me", "guardian-consent", "verify"]))
  ) {
    requireAuth(await getRequestContext(request));
    return ok({
      deprecated: true,
      message: "Guardian consent is no longer required for membership, attendance, plans, or PT.",
    });
  }
  if (request.method === "GET" && pathMatches(path, ["guardian-consent", /.+/])) {
    return ok({
      deprecated: true,
      message: "Guardian consent links are deprecated because guardian approval is no longer required.",
    });
  }
  if (
    request.method === "POST" &&
    (pathMatches(path, ["guardian-consent", /.+/, "verify"]) ||
      pathMatches(path, ["guardian-consent", /.+/, "resend"]))
  ) {
    return ok({
      deprecated: true,
      message: "Guardian consent links are deprecated because guardian approval is no longer required.",
    });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "consents"])) {
    const userId = requireAuth(await getRequestContext(request));
    const [consents, guardianConsents, exportRequests, exportJobs, deletionRequests, deletionJobs] =
      await Promise.all([
        prisma.consentRecord.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: USER_HISTORY_LIST_LIMIT,
        }),
        prisma.guardianConsent.findMany({
          where: { minorUserId: userId },
          orderBy: { createdAt: "desc" },
          take: USER_HISTORY_LIST_LIMIT,
        }),
        prisma.dataExportRequest.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: USER_HISTORY_LIST_LIMIT,
        }),
        prisma.dataExportJob.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: USER_HISTORY_LIST_LIMIT,
        }),
        prisma.accountDeletionRequest.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: USER_HISTORY_LIST_LIMIT,
        }),
        prisma.accountDeletionJob.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: USER_HISTORY_LIST_LIMIT,
        }),
      ]);
    return ok({
      consents,
      guardianConsents,
      exportRequests,
      exportJobs,
      deletionRequests,
      deletionJobs,
    });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "data-export-request"])) {
    const ctx = await getRequestContext(request);
    assertNotImpersonating(ctx, "Data export");
    const userId = requireAuth(ctx);
    await assertRateLimit(
      "privacyRequestByActor",
      `${ctx.orgId ?? "global"}:${userId}:export`,
      "Too many data export requests from this account.",
    );
    const existing = await prisma.dataExportRequest.findFirst({
      where: { userId, status: { in: ["requested", "processing", "ready"] } },
      orderBy: { createdAt: "desc" },
    });
    if (existing) {
      throw conflictError("A data export request is already in progress or ready for download.");
    }
    const exportRequest = await prisma.dataExportRequest.create({
      data: clean({
        orgId: ctx.orgId,
        userId,
        requestId: currentRequestId(),
        status: "requested",
      }),
    });
    const exportJob = await prisma.dataExportJob.create({
      data: clean({
        requestId: exportRequest.id,
        orgId: ctx.orgId,
        userId,
        status: "RUNNING",
        format: "JSON",
        requestedById: userId,
        startedAt: new Date(),
      }),
    });
    let completedRequest = exportRequest;
    let completedJob = exportJob;
    try {
      const generated = await generateUserDataExport({
        userId,
        ...(ctx.orgId ? { orgId: ctx.orgId } : {}),
      });
      completedJob = await prisma.dataExportJob.update({
        where: { id: exportJob.id },
        data: {
          status: "SUCCEEDED",
          fileAssetId: generated.fileAssetId,
          exportUrl: generated.exportUrl,
          checksum: generated.checksum,
          recordCount: generated.recordCount,
          completedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      completedRequest = await prisma.dataExportRequest.update({
        where: { id: exportRequest.id },
        data: {
          status: "ready",
          latestJobId: completedJob.id,
          exportUrl: generated.exportUrl,
          processedById: userId,
          processedAt: new Date(),
          completedAt: new Date(),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export generation failed";
      completedJob = await prisma.dataExportJob.update({
        where: { id: exportJob.id },
        data: {
          status: "FAILED",
          errorMessage: message,
          completedAt: new Date(),
        },
      });
      completedRequest = await prisma.dataExportRequest.update({
        where: { id: exportRequest.id },
        data: {
          status: "failed",
          latestJobId: completedJob.id,
          failureReason: message,
          processedById: userId,
          processedAt: new Date(),
        },
      });
    }
    await prisma.consentRecord.create({
      data: clean({
        orgId: ctx.orgId,
        userId,
        type: "DATA_EXPORT",
        status: completedJob.status === "SUCCEEDED" ? "GRANTED" : "PENDING",
        recordedById: userId,
        metadata: { exportRequestId: exportRequest.id } as Prisma.InputJsonValue,
      }),
    });
    await writeAuditLog({
      request,
      actorUserId: userId,
      action: "privacy.data_export_requested",
      entityType: "data_export_request",
      entityId: exportRequest.id,
      ...(ctx.orgId ? { orgId: ctx.orgId } : {}),
    });
    return ok({ request: completedRequest, job: completedJob });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "account-deletion-request"])) {
    const ctx = await getRequestContext(request);
    assertNotImpersonating(ctx, "Account deletion");
    const userId = requireAuth(ctx);
    await assertRateLimit(
      "privacyRequestByActor",
      `${ctx.orgId ?? "global"}:${userId}:deletion`,
      "Too many account deletion requests from this account.",
    );
    const existing = await prisma.accountDeletionRequest.findFirst({
      where: { userId, status: { in: ["requested", "processing", "scheduled"] } },
      orderBy: { createdAt: "desc" },
    });
    if (existing) {
      throw conflictError("An account deletion request is already open for this account.");
    }
    const deletionRequest = await prisma.accountDeletionRequest.create({
      data: clean({
        orgId: ctx.orgId,
        userId,
        requestId: currentRequestId(),
        status: "requested",
      }),
    });
    const retentionDays = Math.max(1, Number(process.env.ACCOUNT_DELETION_RETENTION_DAYS ?? 30));
    const scheduledFor = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);
    const deletionJob = await prisma.accountDeletionJob.create({
      data: clean({
        requestId: deletionRequest.id,
        orgId: ctx.orgId,
        userId,
        status: "QUEUED",
        requestedById: userId,
        scheduledFor,
        retentionUntil: scheduledFor,
      }),
    });
    const updatedRequest = await prisma.accountDeletionRequest.update({
      where: { id: deletionRequest.id },
      data: {
        latestJobId: deletionJob.id,
        scheduledFor: deletionJob.scheduledFor,
      },
    });
    await prisma.consentRecord.create({
      data: clean({
        orgId: ctx.orgId,
        userId,
        type: "ACCOUNT_DELETION",
        status: "PENDING",
        recordedById: userId,
        metadata: { accountDeletionRequestId: deletionRequest.id } as Prisma.InputJsonValue,
      }),
    });
    await writeAuditLog({
      request,
      actorUserId: userId,
      action: "privacy.account_deletion_requested",
      entityType: "account_deletion_request",
      entityId: deletionRequest.id,
      ...(ctx.orgId ? { orgId: ctx.orgId } : {}),
    });
    return ok({ request: updatedRequest, job: deletionJob });
  }
  return undefined;
}
