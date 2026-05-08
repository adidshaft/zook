
-- DropIndex
DROP INDEX IF EXISTS "Payment_orgId_status_createdAt_idx";

-- DropIndex
DROP INDEX IF EXISTS "Payment_sessionId_idx";

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS     "gstNumber" TEXT,
ADD COLUMN IF NOT EXISTS     "gstPaise" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS     "gstRateBps" INTEGER,
ADD COLUMN IF NOT EXISTS     "invoiceNumber" TEXT,
ADD COLUMN IF NOT EXISTS     "invoiceStatus" TEXT NOT NULL DEFAULT 'issued',
ADD COLUMN IF NOT EXISTS     "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS     "pdfAssetId" TEXT,
ADD COLUMN IF NOT EXISTS     "shopOrderId" TEXT,
ADD COLUMN IF NOT EXISTS     "subscriptionId" TEXT,
ADD COLUMN IF NOT EXISTS     "subtotalPaise" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS     "totalPaise" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "paymentId" DROP NOT NULL,
ALTER COLUMN "invoiceNo" DROP NOT NULL,
ALTER COLUMN "amountPaise" SET DEFAULT 0,
ALTER COLUMN "status" SET DEFAULT 'SUCCEEDED';

-- AlterTable
ALTER TABLE "OtpChallenge" ADD COLUMN IF NOT EXISTS     "ipFailureCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS     "lockedUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "RequestIdempotency" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "operation" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "resultHash" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "body" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestIdempotency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TrainerCommission" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "period" TIMESTAMP(3) NOT NULL,
    "ptSessionCount" INTEGER NOT NULL,
    "planAssignmentCount" INTEGER NOT NULL,
    "commissionBps" INTEGER NOT NULL,
    "totalPaise" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainerCommission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TrainerPayout" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "totalPaise" INTEGER NOT NULL,
    "bankAccount" JSONB,
    "upiId" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'upi',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "transactionId" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainerPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Class" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "classType" TEXT NOT NULL,
    "maxCapacity" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "recurrenceRule" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ClassEnrollment" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "ClassEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "WhatsAppDevice" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "deviceLabel" TEXT,
    "deviceFingerprint" TEXT,
    "locale" TEXT,
    "timezone" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "lastRegisteredAt" TIMESTAMP(3),
    "optedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppDevice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RequestIdempotency_createdAt_idx" ON "RequestIdempotency"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "RequestIdempotency_userId_operation_requestHash_key" ON "RequestIdempotency"("userId", "operation", "requestHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TrainerCommission_orgId_status_idx" ON "TrainerCommission"("orgId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TrainerCommission_trainerId_period_idx" ON "TrainerCommission"("trainerId", "period");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TrainerCommission_orgId_trainerId_period_key" ON "TrainerCommission"("orgId", "trainerId", "period");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TrainerPayout_orgId_status_idx" ON "TrainerPayout"("orgId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TrainerPayout_trainerId_createdAt_idx" ON "TrainerPayout"("trainerId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Class_orgId_startTime_idx" ON "Class"("orgId", "startTime");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Class_branchId_startTime_idx" ON "Class"("branchId", "startTime");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Class_trainerId_startTime_idx" ON "Class"("trainerId", "startTime");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClassEnrollment_memberId_status_idx" ON "ClassEnrollment"("memberId", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ClassEnrollment_classId_memberId_key" ON "ClassEnrollment"("classId", "memberId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WhatsAppDevice_orgId_userId_idx" ON "WhatsAppDevice"("orgId", "userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WhatsAppDevice_userId_status_idx" ON "WhatsAppDevice"("userId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WhatsAppDevice_status_updatedAt_idx" ON "WhatsAppDevice"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppDevice_provider_phone_userId_key" ON "WhatsAppDevice"("provider", "phone", "userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Invoice_orgId_issueDate_idx" ON "Invoice"("orgId", "issueDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Invoice_subscriptionId_idx" ON "Invoice"("subscriptionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Invoice_shopOrderId_idx" ON "Invoice"("shopOrderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notification_orgId_status_createdAt_idx" ON "Notification"("orgId", "status", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OtpChallenge_ipAddress_purpose_idx" ON "OtpChallenge"("ipAddress", "purpose");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OtpChallenge_lockedUntil_idx" ON "OtpChallenge"("lockedUntil");
