-- Referral incentive ledger: cash wallet, ledger lifecycle, withdrawals, and gym referral attribution.
ALTER TYPE "SaaSBillingCycle" ADD VALUE IF NOT EXISTS 'SEMIANNUAL';

DO $$ BEGIN
  CREATE TYPE "RewardLedgerKind" AS ENUM (
    'GYM_TO_ZOOK_CASH',
    'MEMBER_TO_GYM_CASH',
    'GYM_TO_ZOOK_DAYS',
    'MEMBER_TO_GYM_DAYS'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "RewardLedgerSource" AS ENUM ('PLATFORM', 'ORG');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "RewardLedgerStatus" AS ENUM ('PENDING', 'QUALIFIED', 'PAYABLE', 'PAID', 'REVERSED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "RewardWithdrawalStatus" AS ENUM ('REQUESTED', 'PAID', 'REJECTED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "UserRewardWallet" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "balancePaise" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserRewardWallet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RewardLedgerEntry" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" "RewardLedgerKind" NOT NULL,
  "source" "RewardLedgerSource" NOT NULL,
  "fundingOrgId" TEXT,
  "referredOrgId" TEXT,
  "referredUserId" TEXT,
  "amountPaise" INTEGER NOT NULL,
  "status" "RewardLedgerStatus" NOT NULL DEFAULT 'PENDING',
  "qualifiedAt" TIMESTAMP(3),
  "payableAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "reversedAt" TIMESTAMP(3),
  "payoutId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RewardLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RewardWithdrawal" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amountPaise" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "status" "RewardWithdrawalStatus" NOT NULL DEFAULT 'REQUESTED',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "paidMethod" TEXT,
  "paidNote" TEXT,
  "proofFileAssetId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RewardWithdrawal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserRewardWallet_userId_key" ON "UserRewardWallet"("userId");
CREATE INDEX IF NOT EXISTS "UserRewardWallet_userId_idx" ON "UserRewardWallet"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "RewardLedgerEntry_userId_kind_referredOrgId_key" ON "RewardLedgerEntry"("userId", "kind", "referredOrgId");
CREATE UNIQUE INDEX IF NOT EXISTS "RewardLedgerEntry_userId_kind_referredUserId_key" ON "RewardLedgerEntry"("userId", "kind", "referredUserId");
CREATE INDEX IF NOT EXISTS "RewardLedgerEntry_userId_status_idx" ON "RewardLedgerEntry"("userId", "status");
CREATE INDEX IF NOT EXISTS "RewardLedgerEntry_source_fundingOrgId_status_idx" ON "RewardLedgerEntry"("source", "fundingOrgId", "status");
CREATE INDEX IF NOT EXISTS "RewardLedgerEntry_referredOrgId_idx" ON "RewardLedgerEntry"("referredOrgId");
CREATE INDEX IF NOT EXISTS "RewardLedgerEntry_referredUserId_idx" ON "RewardLedgerEntry"("referredUserId");
CREATE INDEX IF NOT EXISTS "RewardLedgerEntry_payoutId_idx" ON "RewardLedgerEntry"("payoutId");
CREATE INDEX IF NOT EXISTS "RewardWithdrawal_userId_status_idx" ON "RewardWithdrawal"("userId", "status");
CREATE INDEX IF NOT EXISTS "RewardWithdrawal_status_requestedAt_idx" ON "RewardWithdrawal"("status", "requestedAt");

ALTER TABLE "OrgReferralPartnership" ADD COLUMN IF NOT EXISTS "referrerUserId" TEXT;
ALTER TABLE "OrgReferralPartnership" ADD COLUMN IF NOT EXISTS "referrerRole" "Role";
ALTER TABLE "OrgReferralPartnership" ADD COLUMN IF NOT EXISTS "referrerOrgId" TEXT;
ALTER TABLE "OrgReferralPartnership" ADD COLUMN IF NOT EXISTS "code" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "OrgReferralPartnership_referrerUserId_targetOrgId_key" ON "OrgReferralPartnership"("referrerUserId", "targetOrgId");
CREATE INDEX IF NOT EXISTS "OrgReferralPartnership_referrerUserId_idx" ON "OrgReferralPartnership"("referrerUserId");
CREATE INDEX IF NOT EXISTS "OrgReferralPartnership_code_idx" ON "OrgReferralPartnership"("code");
