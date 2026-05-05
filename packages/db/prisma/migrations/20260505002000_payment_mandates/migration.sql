-- CreateEnum
CREATE TYPE "PaymentMandateStatus" AS ENUM ('CREATED', 'AUTHENTICATED', 'ACTIVE', 'PENDING', 'HALTED', 'PAUSED', 'CANCELLED', 'COMPLETED', 'EXPIRED', 'FAILED');

-- CreateTable
CREATE TABLE "PaymentMandate" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "providerMandateId" TEXT,
    "providerPlanId" TEXT,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "sourceSubscriptionId" TEXT NOT NULL,
    "latestSubscriptionId" TEXT,
    "status" "PaymentMandateStatus" NOT NULL DEFAULT 'CREATED',
    "amountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "billingPeriod" TEXT NOT NULL DEFAULT 'monthly',
    "billingInterval" INTEGER NOT NULL DEFAULT 1,
    "totalCount" INTEGER NOT NULL DEFAULT 120,
    "paidCount" INTEGER NOT NULL DEFAULT 0,
    "checkoutUrl" TEXT,
    "currentStartAt" TIMESTAMP(3),
    "currentEndAt" TIMESTAMP(3),
    "nextChargeAt" TIMESTAMP(3),
    "authenticatedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMandate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMandate_provider_providerMandateId_key" ON "PaymentMandate"("provider", "providerMandateId");

-- CreateIndex
CREATE INDEX "PaymentMandate_orgId_userId_status_idx" ON "PaymentMandate"("orgId", "userId", "status");

-- CreateIndex
CREATE INDEX "PaymentMandate_sourceSubscriptionId_idx" ON "PaymentMandate"("sourceSubscriptionId");

-- CreateIndex
CREATE INDEX "PaymentMandate_latestSubscriptionId_idx" ON "PaymentMandate"("latestSubscriptionId");
