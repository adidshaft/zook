CREATE TYPE "SubscriptionReminderKind" AS ENUM (
  'PAYMENT_FAILED',
  'PAYMENT_RETRY',
  'TRIAL_EXPIRING',
  'SUBSCRIPTION_EXPIRING',
  'MANUAL_FOLLOW_UP'
);

CREATE TYPE "SubscriptionReminderStatus" AS ENUM (
  'PENDING',
  'SENT',
  'RESOLVED',
  'CANCELLED'
);

ALTER TABLE "PaymentSession" ADD COLUMN "branchId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "branchId" TEXT;
ALTER TABLE "Product" ADD COLUMN "branchId" TEXT;
ALTER TABLE "InventoryMovement" ADD COLUMN "branchId" TEXT;
ALTER TABLE "ShopOrder" ADD COLUMN "branchId" TEXT;

CREATE TABLE "SubscriptionReminder" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "mandateId" TEXT,
  "paymentId" TEXT,
  "paymentEventId" TEXT,
  "kind" "SubscriptionReminderKind" NOT NULL,
  "status" "SubscriptionReminderStatus" NOT NULL DEFAULT 'PENDING',
  "dueAt" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SubscriptionReminder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentSession_orgId_branchId_status_idx" ON "PaymentSession"("orgId", "branchId", "status");
CREATE INDEX "Payment_orgId_branchId_status_idx" ON "Payment"("orgId", "branchId", "status");
CREATE INDEX "Product_orgId_branchId_active_idx" ON "Product"("orgId", "branchId", "active");
CREATE INDEX "InventoryMovement_orgId_branchId_idx" ON "InventoryMovement"("orgId", "branchId");
CREATE INDEX "ShopOrder_orgId_branchId_status_idx" ON "ShopOrder"("orgId", "branchId", "status");
CREATE INDEX "SubscriptionReminder_orgId_status_dueAt_idx" ON "SubscriptionReminder"("orgId", "status", "dueAt");
CREATE INDEX "SubscriptionReminder_orgId_userId_status_idx" ON "SubscriptionReminder"("orgId", "userId", "status");
CREATE INDEX "SubscriptionReminder_subscriptionId_status_idx" ON "SubscriptionReminder"("subscriptionId", "status");
CREATE INDEX "SubscriptionReminder_mandateId_status_idx" ON "SubscriptionReminder"("mandateId", "status");
