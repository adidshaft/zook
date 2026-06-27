import { createHash, randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { getCronSecret } from "@zook/core";
import { getPaymentProvider } from "@zook/core/providers";
import { prisma, Prisma } from "@zook/db";
import { draftPayoutsForMonth } from "../domains/payouts";
import { settleReadyRewards } from "../domains/rewards/ledger";
import { forbiddenError } from "../errors";
import { deliverPushForNotification } from "../push-runtime";
import { ok } from "../response";
import { createDirectNotification, jsonObject, pathMatches } from "./core";

function requireCronSecret(request: NextRequest) {
  const cronSecret = getCronSecret();
  const authHeader = request.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    throw forbiddenError("Invalid cron authorization.");
  }
}

export async function handleCronJobs(request: NextRequest, path: string[]) {
  if (request.method === "POST" && pathMatches(path, ["cron", "account-deletion-purge"])) {
    const cronSecret = getCronSecret();
    const authHeader = request.headers.get("authorization");
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      throw forbiddenError("Invalid cron authorization.");
    }

    const now = new Date();
    const runningCutoff = new Date(now.getTime() - 30 * 60 * 1000);
    const running = await prisma.accountDeletionJob.findFirst({
      where: { status: "RUNNING", startedAt: { gte: runningCutoff } },
    });
    if (running) {
      return ok({ processed: false, skipped: true, reason: "previous_run_active" });
    }

    const jobs = await prisma.accountDeletionJob.findMany({
      where: { status: "QUEUED", scheduledFor: { lte: now } },
      orderBy: { scheduledFor: "asc" },
      take: Number(process.env.ACCOUNT_DELETION_PURGE_BATCH_SIZE ?? 25),
    });
    let succeeded = 0;
    let failed = 0;
    for (const job of jobs) {
      try {
        await prisma.$transaction(async (tx) => {
          const user = await tx.user.findUnique({
            where: { id: job.userId },
            select: { email: true },
          });
          await tx.accountDeletionJob.update({
            where: { id: job.id },
            data: { status: "RUNNING", startedAt: now },
          });
          await tx.userSession.updateMany({
            where: { userId: job.userId, revokedAt: null },
            data: { revokedAt: now },
          });
          await tx.organizationUser.updateMany({
            where: { userId: job.userId },
            data: { status: "inactive" },
          });
          await tx.user.update({
            where: { id: job.userId },
            data: {
              email: `deleted-${randomUUID()}@deleted.zook.local`,
              emailVerifiedAt: null,
              name: "Deleted account",
              phone: null,
              phoneVerifiedAt: null,
              dateOfBirth: null,
              profilePhotoUrl: null,
              gender: null,
              fitnessGoal: null,
              emergencyContact: {},
              marketingOptIn: false,
              aiConsent: false,
              deletedAt: now,
            },
          });
          await tx.accountDeletionRequest.update({
            where: { id: job.requestId },
            data: { status: "completed", processedAt: now, completedAt: now },
          });
          await tx.accountDeletionJob.update({
            where: { id: job.id },
            data: { status: "SUCCEEDED", completedAt: now, anonymizedAt: now },
          });
          await tx.auditLog.create({
            data: {
              actorUserId: job.userId,
              action: "privacy.account_deleted",
              entityType: "user",
              entityId: job.userId,
              riskLevel: "HIGH",
              metadata: {
                previousEmailHash: user?.email
                  ? createHash("sha256").update(user.email.toLowerCase()).digest("hex")
                  : null,
                accountDeletionRequestId: job.requestId,
              },
            },
          });
        });
        succeeded++;
      } catch (error) {
        failed++;
        await prisma.accountDeletionJob.update({
          where: { id: job.id },
          data: {
            status: "FAILED",
            completedAt: new Date(),
            errorCode: "ACCOUNT_DELETION_PURGE_FAILED",
            errorMessage:
              error instanceof Error ? error.message : "Unknown account deletion error",
          },
        });
      }
    }
    return ok({ processed: true, jobs: jobs.length, succeeded, failed });
  }

  if (request.method === "POST" && pathMatches(path, ["cron", "renewal-reminders"])) {
    const cronSecret = getCronSecret();
    const authHeader = request.headers.get("authorization");
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      throw forbiddenError("Invalid cron authorization.");
    }

    const now = new Date();
    const reminderWindowDays = [7, 3, 1];
    let totalCreated = 0;
    let totalSkipped = 0;
    let totalNotified = 0;

    for (const daysAhead of reminderWindowDays) {
      const windowStart = new Date(now.getTime() + (daysAhead - 1) * 24 * 60 * 60 * 1000);
      const windowEnd = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

      const expiringSubscriptions = await prisma.memberSubscription.findMany({
        where: {
          status: "ACTIVE",
          endsAt: { gte: windowStart, lt: windowEnd },
        },
        take: 500,
      });

      const planIds = [...new Set(expiringSubscriptions.map((s) => s.planId))];
      const plans = planIds.length
        ? await prisma.membershipPlan.findMany({
            where: { id: { in: planIds } },
            select: { id: true, name: true },
          })
        : [];
      const planNameById = new Map(plans.map((p) => [p.id, p.name]));
      const existingReminders = expiringSubscriptions.length
        ? await prisma.subscriptionReminder.findMany({
            where: {
              subscriptionId: { in: expiringSubscriptions.map((sub) => sub.id) },
              kind: "SUBSCRIPTION_EXPIRING",
              status: { in: ["PENDING", "SENT"] },
              dueAt: { gte: windowStart, lt: windowEnd },
            },
            select: { subscriptionId: true },
          })
        : [];
      const remindedSubscriptionIds = new Set(
        existingReminders
          .map((reminder) => reminder.subscriptionId)
          .filter((subscriptionId): subscriptionId is string => Boolean(subscriptionId)),
      );

      for (const sub of expiringSubscriptions) {
        if (remindedSubscriptionIds.has(sub.id)) {
          totalSkipped++;
          continue;
        }

        await prisma.subscriptionReminder.create({
          data: {
            orgId: sub.orgId,
            userId: sub.memberUserId,
            subscriptionId: sub.id,
            kind: "SUBSCRIPTION_EXPIRING",
            status: "SENT",
            dueAt: sub.endsAt!,
            sentAt: now,
            attemptCount: 1,
            metadata: {
              daysRemaining: daysAhead,
              planName: planNameById.get(sub.planId),
            } as Prisma.InputJsonValue,
          },
        });
        totalCreated++;

        const daysLabel = daysAhead === 1 ? "tomorrow" : `in ${daysAhead} days`;
        try {
          await createDirectNotification({
            orgId: sub.orgId,
            type: "OPERATIONAL",
            title: "Membership expiring soon",
            body: `Your membership expires ${daysLabel}. Renew now to keep your access.`,
            audience: "expiring_member",
            userIds: [sub.memberUserId],
            pushEnabled: true,
            metadata: {
              subscriptionId: sub.id,
              daysRemaining: daysAhead,
            } as Prisma.InputJsonValue,
          });
          totalNotified++;
        } catch {
          // Notification delivery is best-effort for cron.
        }
      }
    }

    for (const daysAhead of [7, 3, 1, 0]) {
      const windowStart = new Date(now.getTime() + (daysAhead - 1) * 24 * 60 * 60 * 1000);
      const windowEnd = new Date(
        now.getTime() + (daysAhead === 0 ? 1 : daysAhead) * 24 * 60 * 60 * 1000,
      );
      const trialSubscriptions = await prisma.saaSSubscription.findMany({
        where: {
          status: "TRIAL_ACTIVE",
          trialEndAt: daysAhead === 0 ? { lte: now } : { gte: windowStart, lt: windowEnd },
        },
        take: 500,
      });
      const existingTrialReminders = trialSubscriptions.length
        ? await prisma.subscriptionReminder.findMany({
            where: {
              orgId: { in: trialSubscriptions.map((sub) => sub.orgId) },
              kind: "SAAS_TRIAL_END",
              status: { in: ["PENDING", "SENT"] },
              metadata: { path: ["daysRemaining"], equals: daysAhead },
            },
            select: { orgId: true },
          })
        : [];
      const remindedTrialOrgIds = new Set(
        existingTrialReminders
          .map((reminder) => reminder.orgId)
          .filter((orgId): orgId is string => Boolean(orgId)),
      );
      const owners = trialSubscriptions.length
        ? await prisma.organizationRoleAssignment.findMany({
            where: {
              orgId: { in: [...new Set(trialSubscriptions.map((sub) => sub.orgId))] },
              role: "OWNER",
            },
            orderBy: [{ orgId: "asc" }, { createdAt: "asc" }],
          })
        : [];
      const ownerByOrgId = new Map<string, (typeof owners)[number]>();
      for (const owner of owners) {
        if (!ownerByOrgId.has(owner.orgId)) {
          ownerByOrgId.set(owner.orgId, owner);
        }
      }
      for (const sub of trialSubscriptions) {
        if (remindedTrialOrgIds.has(sub.orgId)) {
          totalSkipped++;
          continue;
        }
        const owner = ownerByOrgId.get(sub.orgId);
        if (!owner) {
          totalSkipped++;
          continue;
        }
        await prisma.subscriptionReminder.create({
          data: {
            orgId: sub.orgId,
            userId: owner.userId,
            kind: "SAAS_TRIAL_END",
            status: "SENT",
            dueAt: sub.trialEndAt,
            sentAt: now,
            attemptCount: 1,
            metadata: {
              daysRemaining: daysAhead,
              saasSubscriptionId: sub.id,
            } as Prisma.InputJsonValue,
          },
        });
        totalCreated++;
        try {
          await createDirectNotification({
            orgId: sub.orgId,
            type: "OPERATIONAL",
            title: daysAhead === 0 ? "Zook trial ended" : "Zook trial ending soon",
            body:
              daysAhead === 0
                ? "Your free Zook trial has ended. Upgrade now to keep owner tools writable."
                : `Your free Zook trial ends in ${daysAhead} days. Upgrade now to keep owner tools writable.`,
            audience: "selected_member",
            userIds: [owner.userId],
            pushEnabled: true,
            metadata: {
              saasSubscriptionId: sub.id,
              daysRemaining: daysAhead,
            } as Prisma.InputJsonValue,
          });
          totalNotified++;
        } catch {
          // Notification delivery is best-effort for cron.
        }
      }
    }

    return ok({
      processed: true,
      remindersCreated: totalCreated,
      remindersSkipped: totalSkipped,
      notificationsSent: totalNotified,
    });
  }

  if (request.method === "POST" && pathMatches(path, ["cron", "refund-reconcile"])) {
    const cronSecret = getCronSecret();
    const authHeader = request.headers.get("authorization");
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      throw forbiddenError("Invalid cron authorization.");
    }

    const provider = getPaymentProvider();
    const cutoff = new Date(Date.now() - 10 * 60 * 1000);
    const refunds = await prisma.paymentRefund.findMany({
      where: {
        status: "REQUESTED",
        createdAt: { lte: cutoff },
        provider: provider.providerName,
      },
      orderBy: { createdAt: "asc" },
      take: 50,
    });
    let reconciled = 0;
    let skipped = 0;
    for (const refund of refunds) {
      const payment = await prisma.payment.findUnique({ where: { id: refund.paymentId } });
      if (!payment?.providerRef) {
        skipped++;
        continue;
      }
      const status = await provider.getPaymentStatus({ providerPaymentId: payment.providerRef });
      if (status !== "REFUNDED" && status !== "PARTIALLY_REFUNDED") {
        skipped++;
        continue;
      }
      await prisma.paymentRefund.update({
        where: { id: refund.id },
        data: { status, processedAt: new Date() },
      });
      const successfulRefunds = await prisma.paymentRefund.findMany({
        where: {
          paymentId: payment.id,
          status: { notIn: ["FAILED", "CANCELLED", "REQUESTED", "PENDING"] },
        },
      });
      const refundedAmountPaise = successfulRefunds.reduce(
        (total, item) => total + item.amountPaise,
        0,
      );
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: refundedAmountPaise >= payment.amountPaise ? "REFUNDED" : "PARTIALLY_REFUNDED",
          metadata: {
            ...jsonObject(payment.metadata),
            refundedAmountPaise,
          },
        },
      });
      reconciled++;
    }
    return ok({ inspected: refunds.length, reconciled, skipped });
  }

  if (request.method === "POST" && pathMatches(path, ["cron", "trainer-payouts-draft"])) {
    const cronSecret = getCronSecret();
    const authHeader = request.headers.get("authorization");
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      throw forbiddenError("Invalid cron authorization.");
    }

    const month = request.nextUrl.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
    const orgs = await prisma.organization.findMany({
      where: { status: { notIn: ["DELETED", "CANCELLED"] } },
      select: { id: true },
      take: 500,
    });
    let drafted = 0;
    let skipped = 0;
    const failures: Array<{ orgId: string; error: string }> = [];
    for (const org of orgs) {
      try {
        const payouts = await draftPayoutsForMonth(org.id, month);
        drafted += payouts.length;
      } catch (cause) {
        skipped++;
        failures.push({
          orgId: org.id,
          error: cause instanceof Error ? cause.message : "Unknown payout draft error",
        });
      }
    }
    return ok({
      month,
      organizations: orgs.length,
      drafted,
      skipped,
      failures: failures.slice(0, 10),
    });
  }

  if (request.method === "POST" && pathMatches(path, ["cron", "rewards-settle"])) {
    const cronSecret = getCronSecret();
    const authHeader = request.headers.get("authorization");
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      throw forbiddenError("Invalid cron authorization.");
    }
    const result = await settleReadyRewards();
    return ok({ ok: true, ...result });
  }

  if (
    request.method === "POST" &&
    pathMatches(path, ["cron", "send-scheduled-notifications"])
  ) {
    requireCronSecret(request);
    const now = new Date();
    const due = await prisma.notification.findMany({
      where: { status: "SCHEDULED", scheduledAt: { lte: now } },
      orderBy: { scheduledAt: "asc" },
      take: 50,
      include: { recipients: true },
    });
    let processed = 0;
    let delivered = 0;
    for (const notification of due) {
      const userIds = notification.recipients.map((recipient) => recipient.userId);
      if (notification.pushEnabled && notification.orgId && userIds.length) {
        await deliverPushForNotification({
          orgId: notification.orgId,
          notification: {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            body: notification.body,
            pushEnabled: notification.pushEnabled,
            metadata: notification.metadata,
          },
          userIds,
        });
      }
      await prisma.$transaction([
        prisma.notification.update({
          where: { id: notification.id },
          data: { status: "SENT", sentAt: now },
        }),
        prisma.notificationRecipient.updateMany({
          where: { notificationId: notification.id, deliveredAt: null },
          data: { deliveryStatus: "in_app", deliveredAt: now },
        }),
      ]);
      processed++;
      delivered += userIds.length;
    }
    return ok({ ok: true, processed, delivered });
  }

  if (request.method === "POST" && pathMatches(path, ["cron", "subscription-expiry"])) {
    requireCronSecret(request);
    const result = await prisma.memberSubscription.updateMany({
      where: { status: "ACTIVE", endsAt: { lt: new Date() } },
      data: { status: "EXPIRED" },
    });
    return ok({ ok: true, expired: result.count });
  }

  return undefined;
}
