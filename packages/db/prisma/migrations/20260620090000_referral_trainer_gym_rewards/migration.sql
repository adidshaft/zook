-- Add granular referral reward customisations to the gym referral policy.
ALTER TABLE "ReferralPolicy" ADD COLUMN IF NOT EXISTS "trainerRewardType" TEXT NOT NULL DEFAULT 'DAYS';
ALTER TABLE "ReferralPolicy" ADD COLUMN IF NOT EXISTS "trainerRewardValue" INTEGER NOT NULL DEFAULT 7;
ALTER TABLE "ReferralPolicy" ADD COLUMN IF NOT EXISTS "memberGymReferralRewardPaise" INTEGER NOT NULL DEFAULT 0;
