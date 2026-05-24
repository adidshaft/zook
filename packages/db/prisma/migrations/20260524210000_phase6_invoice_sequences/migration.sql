-- Phase 6: atomic invoice number sequences per organization and financial year.
CREATE TABLE "InvoiceSequence" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "financialYear" TEXT NOT NULL,
  "nextSequence" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InvoiceSequence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InvoiceSequence_orgId_scope_financialYear_key"
  ON "InvoiceSequence"("orgId", "scope", "financialYear");

CREATE INDEX "InvoiceSequence_scope_financialYear_idx"
  ON "InvoiceSequence"("scope", "financialYear");
