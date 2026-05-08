-- Durable refund ledger and multi-photo product support.
CREATE TABLE IF NOT EXISTS "PaymentRefund" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "branchId" TEXT,
  "paymentId" TEXT NOT NULL,
  "provider" TEXT,
  "providerRefundId" TEXT,
  "amountPaise" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "reason" TEXT,
  "requestedById" TEXT,
  "processedAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "providerResponse" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PaymentRefund_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentRefund_provider_providerRefundId_key"
  ON "PaymentRefund"("provider", "providerRefundId");

CREATE INDEX IF NOT EXISTS "PaymentRefund_orgId_status_createdAt_idx"
  ON "PaymentRefund"("orgId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "PaymentRefund_paymentId_createdAt_idx"
  ON "PaymentRefund"("paymentId", "createdAt");

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "imageUrls" JSONB;
