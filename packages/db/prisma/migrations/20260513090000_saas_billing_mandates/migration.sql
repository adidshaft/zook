CREATE TABLE "SaaSBillingMandate" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "providerMandateId" TEXT,
    "providerPlanId" TEXT,
    "orgId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
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
    "paymentSessionId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SaaSBillingMandate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SaaSBillingMandate_orgId_key" ON "SaaSBillingMandate"("orgId");
CREATE UNIQUE INDEX "SaaSBillingMandate_provider_providerMandateId_key" ON "SaaSBillingMandate"("provider", "providerMandateId");
CREATE INDEX "SaaSBillingMandate_status_idx" ON "SaaSBillingMandate"("status");
CREATE INDEX "SaaSBillingMandate_nextChargeAt_idx" ON "SaaSBillingMandate"("nextChargeAt");
