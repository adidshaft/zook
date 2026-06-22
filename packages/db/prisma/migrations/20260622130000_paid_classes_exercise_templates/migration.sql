ALTER TYPE "PaymentPurpose" ADD VALUE IF NOT EXISTS 'CLASS_BOOKING';

CREATE TYPE "ExerciseTemplateScope" AS ENUM ('ORG', 'TRAINER');

ALTER TABLE "Class"
  ADD COLUMN "pricePaise" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "trainerCommissionBps" INTEGER;

ALTER TABLE "ClassEnrollment"
  ADD COLUMN "paymentId" TEXT,
  ADD COLUMN "paymentSessionId" TEXT,
  ADD COLUMN "paidAt" TIMESTAMP(3),
  ADD COLUMN "refundPaymentId" TEXT,
  ADD COLUMN "refundedAt" TIMESTAMP(3);

CREATE INDEX "ClassEnrollment_paymentSessionId_idx" ON "ClassEnrollment"("paymentSessionId");
CREATE INDEX "ClassEnrollment_paymentId_idx" ON "ClassEnrollment"("paymentId");

CREATE TABLE "ExerciseTemplate" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "scope" "ExerciseTemplateScope" NOT NULL,
  "createdByUserId" TEXT,
  "name" TEXT NOT NULL,
  "muscleGroup" TEXT,
  "equipment" TEXT,
  "defaultSets" INTEGER,
  "defaultReps" INTEGER,
  "defaultRestSeconds" INTEGER,
  "tempo" TEXT,
  "notes" TEXT,
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExerciseTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExerciseTemplate_orgId_scope_createdByUserId_name_key" ON "ExerciseTemplate"("orgId", "scope", "createdByUserId", "name");
CREATE INDEX "ExerciseTemplate_orgId_scope_idx" ON "ExerciseTemplate"("orgId", "scope");
CREATE INDEX "ExerciseTemplate_orgId_active_featured_idx" ON "ExerciseTemplate"("orgId", "active", "featured");
