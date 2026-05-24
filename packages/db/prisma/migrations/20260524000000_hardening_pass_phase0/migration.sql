CREATE TYPE "DietPlanStatus" AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TYPE "InvoiceKind" AS ENUM ('MEMBERSHIP', 'SHOP', 'PT', 'SAAS', 'MANUAL');

CREATE TYPE "PlatformBroadcastSeverity" AS ENUM ('INFO', 'WARN', 'CRITICAL');

CREATE TYPE "PlatformBroadcastStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'LIVE', 'EXPIRED');

CREATE TYPE "SaaSTier" AS ENUM ('FREE', 'STARTER', 'GROWTH', 'PRO');

CREATE TYPE "ContentModerationKind" AS ENUM ('ORG_COVER', 'ORG_LOGO', 'PRODUCT', 'MEMBER_PROFILE');

CREATE TYPE "ContentModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REMOVED');

ALTER TABLE "BodyProgressEntry"
  ADD COLUMN "hipCm" DECIMAL(6,2),
  ADD COLUMN "thighCm" DECIMAL(6,2),
  ADD COLUMN "neckCm" DECIMAL(6,2),
  ADD COLUMN "shoulderCm" DECIMAL(6,2),
  ADD COLUMN "forearmCm" DECIMAL(6,2),
  ADD COLUMN "calfCm" DECIMAL(6,2),
  ADD COLUMN "muscleMassKg" DECIMAL(6,2),
  ADD COLUMN "visceralFatRating" INTEGER,
  ADD COLUMN "restingHeartRate" INTEGER,
  ADD COLUMN "recordedByUserId" TEXT;

ALTER TABLE "SaaSSubscription"
  ADD COLUMN "tier" "SaaSTier" NOT NULL DEFAULT 'FREE',
  ADD COLUMN "trialExtendedDays" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "creditPaise" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "noteForPlatform" TEXT;

ALTER TABLE "Invoice"
  ADD COLUMN "branchId" TEXT,
  ADD COLUMN "memberId" TEXT,
  ADD COLUMN "kind" "InvoiceKind" NOT NULL DEFAULT 'MEMBERSHIP',
  ADD COLUMN "number" TEXT,
  ADD COLUMN "financialYear" TEXT,
  ADD COLUMN "buyerName" TEXT,
  ADD COLUMN "buyerAddress" TEXT,
  ADD COLUMN "buyerPhone" TEXT,
  ADD COLUMN "buyerGstin" TEXT,
  ADD COLUMN "lineItems" JSONB,
  ADD COLUMN "pdfFileAssetId" TEXT,
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'INR';

CREATE TABLE "DietPlan" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "branchId" TEXT,
  "trainerId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "calorieTarget" INTEGER,
  "proteinG" INTEGER,
  "carbsG" INTEGER,
  "fatsG" INTEGER,
  "status" "DietPlanStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DietPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DietPlanMeal" (
  "id" TEXT NOT NULL,
  "dietPlanId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "timeOfDay" TEXT,
  "items" JSONB NOT NULL,
  "calories" INTEGER,
  "proteinG" INTEGER,
  "carbsG" INTEGER,
  "fatsG" INTEGER,
  "order" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "DietPlanMeal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MealLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT,
  "dietPlanId" TEXT,
  "mealName" TEXT NOT NULL,
  "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "calories" INTEGER,
  "proteinG" INTEGER,
  "carbsG" INTEGER,
  "fatsG" INTEGER,
  "photoAssetId" TEXT,
  "notes" TEXT,

  CONSTRAINT "MealLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformBroadcast" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "severity" "PlatformBroadcastSeverity" NOT NULL DEFAULT 'INFO',
  "targetOrgIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "targetRoles" "Role"[] NOT NULL DEFAULT ARRAY[]::"Role"[],
  "scheduledAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "status" "PlatformBroadcastStatus" NOT NULL DEFAULT 'DRAFT',
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PlatformBroadcast_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FeatureFlag" (
  "key" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "description" TEXT,
  "rolloutPercent" INTEGER NOT NULL DEFAULT 0,
  "overrideOrgIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "updatedByUserId" TEXT,

  CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "ImpersonationSession" (
  "id" TEXT NOT NULL,
  "platformAdminUserId" TEXT NOT NULL,
  "targetUserId" TEXT NOT NULL,
  "targetOrgId" TEXT,
  "reason" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "ipHash" TEXT NOT NULL,
  "userAgentHash" TEXT NOT NULL,
  "actionsCount" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "ImpersonationSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentModerationFlag" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "kind" "ContentModerationKind" NOT NULL,
  "fileAssetId" TEXT,
  "targetId" TEXT,
  "status" "ContentModerationStatus" NOT NULL DEFAULT 'PENDING',
  "reporterUserId" TEXT,
  "reason" TEXT,
  "reviewedByUserId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ContentModerationFlag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");
CREATE INDEX "AuditLog_createdAt_orgId_idx" ON "AuditLog"("createdAt", "orgId");
CREATE INDEX "Invoice_orgId_branchId_issueDate_idx" ON "Invoice"("orgId", "branchId", "issueDate");
CREATE INDEX "Invoice_memberId_idx" ON "Invoice"("memberId");
CREATE INDEX "Invoice_paymentId_idx" ON "Invoice"("paymentId");
CREATE INDEX "Payment_orgId_branchId_createdAt_idx" ON "Payment"("orgId", "branchId", "createdAt");
CREATE INDEX "ShopOrder_orgId_branchId_status_createdAt_idx" ON "ShopOrder"("orgId", "branchId", "status", "createdAt");
CREATE INDEX "DietPlan_orgId_memberId_status_idx" ON "DietPlan"("orgId", "memberId", "status");
CREATE INDEX "DietPlan_orgId_trainerId_idx" ON "DietPlan"("orgId", "trainerId");
CREATE INDEX "DietPlan_orgId_branchId_idx" ON "DietPlan"("orgId", "branchId");
CREATE INDEX "DietPlanMeal_dietPlanId_order_idx" ON "DietPlanMeal"("dietPlanId", "order");
CREATE INDEX "MealLog_userId_loggedAt_idx" ON "MealLog"("userId", "loggedAt");
CREATE INDEX "MealLog_organizationId_userId_idx" ON "MealLog"("organizationId", "userId");
CREATE INDEX "MealLog_dietPlanId_idx" ON "MealLog"("dietPlanId");
CREATE INDEX "PlatformBroadcast_status_scheduledAt_idx" ON "PlatformBroadcast"("status", "scheduledAt");
CREATE INDEX "PlatformBroadcast_publishedAt_idx" ON "PlatformBroadcast"("publishedAt");
CREATE INDEX "ImpersonationSession_platformAdminUserId_startedAt_idx" ON "ImpersonationSession"("platformAdminUserId", "startedAt");
CREATE INDEX "ImpersonationSession_targetUserId_startedAt_idx" ON "ImpersonationSession"("targetUserId", "startedAt");
CREATE INDEX "ImpersonationSession_targetOrgId_startedAt_idx" ON "ImpersonationSession"("targetOrgId", "startedAt");
CREATE INDEX "ImpersonationSession_endedAt_idx" ON "ImpersonationSession"("endedAt");
CREATE INDEX "ContentModerationFlag_orgId_status_createdAt_idx" ON "ContentModerationFlag"("orgId", "status", "createdAt");
CREATE INDEX "ContentModerationFlag_kind_status_idx" ON "ContentModerationFlag"("kind", "status");
CREATE INDEX "ContentModerationFlag_fileAssetId_idx" ON "ContentModerationFlag"("fileAssetId");
CREATE INDEX "ContentModerationFlag_targetId_idx" ON "ContentModerationFlag"("targetId");
