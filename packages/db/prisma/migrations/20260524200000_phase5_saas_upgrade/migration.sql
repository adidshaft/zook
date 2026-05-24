-- Phase 5: trial-to-paid SaaS upgrade fields.
CREATE TYPE "SaaSBillingCycle" AS ENUM ('MONTHLY', 'YEARLY');

ALTER TYPE "SubscriptionReminderKind" ADD VALUE 'SAAS_TRIAL_END';

ALTER TABLE "SaaSSubscription"
  ADD COLUMN "billingCycle" "SaaSBillingCycle" NOT NULL DEFAULT 'MONTHLY',
  ADD COLUMN "nextRenewalAt" TIMESTAMP(3),
  ADD COLUMN "priceLockedPaise" INTEGER,
  ADD COLUMN "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;
