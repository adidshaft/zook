import { createHash, randomUUID } from "node:crypto";
import { PrismaClient } from "../packages/db/src/index";

const prisma = new PrismaClient();

function anonymizedEmail(userId: string) {
  return `deleted-${randomUUID()}@deleted.zook.local`;
}

async function main() {
  const now = new Date();
  const jobs = await prisma.accountDeletionJob.findMany({
    where: {
      status: "QUEUED",
      scheduledFor: { lte: now },
    },
    orderBy: { scheduledFor: "asc" },
    take: Number(process.env.ACCOUNT_DELETION_PURGE_BATCH_SIZE ?? 25),
  });

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
            email: anonymizedEmail(job.userId),
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
    } catch (error) {
      await prisma.accountDeletionJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          errorCode: "ACCOUNT_DELETION_PURGE_FAILED",
          errorMessage: error instanceof Error ? error.message : "Unknown account deletion error",
        },
      });
    }
  }
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
