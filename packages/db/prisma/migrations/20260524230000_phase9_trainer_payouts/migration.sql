ALTER TABLE "PersonalTrainingSessionLog"
  ADD COLUMN "payoutLineId" TEXT;

CREATE TABLE "TrainerPayoutConfig" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "trainerId" TEXT NOT NULL,
  "baseMonthlyPaise" INTEGER NOT NULL DEFAULT 0,
  "ptCommissionPercent" INTEGER NOT NULL DEFAULT 0,
  "perSessionFeePaise" INTEGER NOT NULL DEFAULT 0,
  "payDay" INTEGER NOT NULL DEFAULT 5,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TrainerPayoutConfig_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TrainerPayout"
  ADD COLUMN "period" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "paidAt" TIMESTAMP(3),
  ADD COLUMN "paidById" TEXT,
  ADD COLUMN "paidMethod" TEXT,
  ADD COLUMN "paidNote" TEXT,
  ADD COLUMN "proofFileAssetId" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "TrainerPayoutLine" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "trainerId" TEXT NOT NULL,
  "payoutId" TEXT,
  "period" TIMESTAMP(3) NOT NULL,
  "kind" TEXT NOT NULL,
  "sourceType" TEXT,
  "sourceId" TEXT,
  "description" TEXT NOT NULL,
  "amountPaise" INTEGER NOT NULL,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainerPayoutLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TrainerPayoutConfig_orgId_trainerId_key"
  ON "TrainerPayoutConfig"("orgId", "trainerId");
CREATE INDEX "TrainerPayoutConfig_orgId_idx"
  ON "TrainerPayoutConfig"("orgId");

CREATE UNIQUE INDEX "TrainerPayout_orgId_trainerId_period_key"
  ON "TrainerPayout"("orgId", "trainerId", "period");

CREATE UNIQUE INDEX "TrainerPayoutLine_orgId_trainerId_kind_sourceId_key"
  ON "TrainerPayoutLine"("orgId", "trainerId", "kind", "sourceId");
CREATE INDEX "TrainerPayoutLine_orgId_trainerId_period_idx"
  ON "TrainerPayoutLine"("orgId", "trainerId", "period");
CREATE INDEX "TrainerPayoutLine_payoutId_idx"
  ON "TrainerPayoutLine"("payoutId");
CREATE INDEX "PersonalTrainingSessionLog_orgId_trainerUserId_sessionAt_idx"
  ON "PersonalTrainingSessionLog"("orgId", "trainerUserId", "sessionAt");
