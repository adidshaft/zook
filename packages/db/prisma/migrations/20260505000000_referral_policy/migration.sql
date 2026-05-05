-- CreateTable
CREATE TABLE "ReferralPolicy" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "referrerRewardType" TEXT NOT NULL DEFAULT 'DAYS',
    "referrerRewardValue" INTEGER NOT NULL DEFAULT 7,
    "referredDiscountType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "referredDiscountValue" INTEGER NOT NULL DEFAULT 1000,
    "maxDiscountCapBps" INTEGER NOT NULL DEFAULT 3000,
    "maxReferralsPerMonth" INTEGER NOT NULL DEFAULT 5,
    "referralCodeExpiryDays" INTEGER NOT NULL DEFAULT 90,
    "trainerReferralEnabled" BOOLEAN NOT NULL DEFAULT true,
    "staffReferralEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReferralPolicy_orgId_key" ON "ReferralPolicy"("orgId");

-- CreateIndex
CREATE INDEX "ReferralPolicy_orgId_enabled_idx" ON "ReferralPolicy"("orgId", "enabled");
