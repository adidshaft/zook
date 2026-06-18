const valueAuditSql = String.raw`
SELECT 'OrganizationUser.status' AS field, "status" AS value, COUNT(*) FROM "OrganizationUser" GROUP BY "status"
UNION ALL
SELECT 'DataExportRequest.status', "status", COUNT(*) FROM "DataExportRequest" GROUP BY "status"
UNION ALL
SELECT 'AccountDeletionRequest.status', "status", COUNT(*) FROM "AccountDeletionRequest" GROUP BY "status"
UNION ALL
SELECT 'MembershipJoinRequest.status', "status", COUNT(*) FROM "MembershipJoinRequest" GROUP BY "status"
UNION ALL
SELECT 'PaymentRefund.status', "status", COUNT(*) FROM "PaymentRefund" GROUP BY "status"
UNION ALL
SELECT 'ReferralCode.status', "status", COUNT(*) FROM "ReferralCode" GROUP BY "status"
UNION ALL
SELECT 'ReferralReward.status', "status", COUNT(*) FROM "ReferralReward" GROUP BY "status"
UNION ALL
SELECT 'OrgReferralPartnership.status', "status", COUNT(*) FROM "OrgReferralPartnership" GROUP BY "status"
UNION ALL
SELECT 'TrainerCommission.status', "status", COUNT(*) FROM "TrainerCommission" GROUP BY "status"
UNION ALL
SELECT 'TrainerPayout.status', "status", COUNT(*) FROM "TrainerPayout" GROUP BY "status"
UNION ALL
SELECT 'Class.status', "status", COUNT(*) FROM "Class" GROUP BY "status"
UNION ALL
SELECT 'ClassEnrollment.status', "status", COUNT(*) FROM "ClassEnrollment" GROUP BY "status"
UNION ALL
SELECT 'OrganizationAbuseFlag.severity', "severity", COUNT(*) FROM "OrganizationAbuseFlag" GROUP BY "severity"
UNION ALL
SELECT 'OrganizationAbuseFlag.status', "status", COUNT(*) FROM "OrganizationAbuseFlag" GROUP BY "status"
UNION ALL
SELECT 'WhatsAppDevice.status', "status", COUNT(*) FROM "WhatsAppDevice" GROUP BY "status"
ORDER BY field, value;
`.trim();

const invalidValueAuditSql = String.raw`
WITH allowed_values(field, value) AS (
  VALUES
    ('OrganizationUser.status', 'active'),
    ('OrganizationUser.status', 'inactive'),
    ('OrganizationUser.status', 'suspended'),
    ('DataExportRequest.status', 'requested'),
    ('DataExportRequest.status', 'processing'),
    ('DataExportRequest.status', 'ready'),
    ('DataExportRequest.status', 'failed'),
    ('DataExportRequest.status', 'cancelled'),
    ('AccountDeletionRequest.status', 'requested'),
    ('AccountDeletionRequest.status', 'processing'),
    ('AccountDeletionRequest.status', 'scheduled'),
    ('AccountDeletionRequest.status', 'completed'),
    ('AccountDeletionRequest.status', 'failed'),
    ('AccountDeletionRequest.status', 'cancelled'),
    ('MembershipJoinRequest.status', 'pending'),
    ('MembershipJoinRequest.status', 'approved'),
    ('MembershipJoinRequest.status', 'rejected'),
    ('MembershipJoinRequest.status', 'cancelled'),
    ('PaymentRefund.status', 'REQUESTED'),
    ('PaymentRefund.status', 'PROCESSING'),
    ('PaymentRefund.status', 'SUCCEEDED'),
    ('PaymentRefund.status', 'FAILED'),
    ('PaymentRefund.status', 'CANCELLED'),
    ('ReferralCode.status', 'active'),
    ('ReferralCode.status', 'paused'),
    ('ReferralCode.status', 'expired'),
    ('ReferralCode.status', 'revoked'),
    ('ReferralReward.status', 'pending'),
    ('ReferralReward.status', 'applied'),
    ('ReferralReward.status', 'paid'),
    ('ReferralReward.status', 'expired'),
    ('ReferralReward.status', 'cancelled'),
    ('OrgReferralPartnership.status', 'active'),
    ('OrgReferralPartnership.status', 'inactive'),
    ('OrgReferralPartnership.status', 'paused'),
    ('OrgReferralPartnership.status', 'ended'),
    ('TrainerCommission.status', 'pending'),
    ('TrainerCommission.status', 'approved'),
    ('TrainerCommission.status', 'paid'),
    ('TrainerCommission.status', 'cancelled'),
    ('TrainerPayout.status', 'pending'),
    ('TrainerPayout.status', 'processing'),
    ('TrainerPayout.status', 'paid'),
    ('TrainerPayout.status', 'failed'),
    ('TrainerPayout.status', 'cancelled'),
    ('Class.status', 'scheduled'),
    ('Class.status', 'cancelled'),
    ('Class.status', 'completed'),
    ('ClassEnrollment.status', 'confirmed'),
    ('ClassEnrollment.status', 'waitlisted'),
    ('ClassEnrollment.status', 'cancelled'),
    ('ClassEnrollment.status', 'attended'),
    ('ClassEnrollment.status', 'no_show'),
    ('OrganizationAbuseFlag.severity', 'low'),
    ('OrganizationAbuseFlag.severity', 'medium'),
    ('OrganizationAbuseFlag.severity', 'high'),
    ('OrganizationAbuseFlag.severity', 'critical'),
    ('OrganizationAbuseFlag.status', 'open'),
    ('OrganizationAbuseFlag.status', 'reviewing'),
    ('OrganizationAbuseFlag.status', 'resolved'),
    ('OrganizationAbuseFlag.status', 'dismissed'),
    ('WhatsAppDevice.status', 'ACTIVE'),
    ('WhatsAppDevice.status', 'INACTIVE'),
    ('WhatsAppDevice.status', 'REVOKED')
),
current_values AS (
  SELECT 'OrganizationUser.status' AS field, "status" AS value, COUNT(*) FROM "OrganizationUser" GROUP BY "status"
  UNION ALL
  SELECT 'DataExportRequest.status', "status", COUNT(*) FROM "DataExportRequest" GROUP BY "status"
  UNION ALL
  SELECT 'AccountDeletionRequest.status', "status", COUNT(*) FROM "AccountDeletionRequest" GROUP BY "status"
  UNION ALL
  SELECT 'MembershipJoinRequest.status', "status", COUNT(*) FROM "MembershipJoinRequest" GROUP BY "status"
  UNION ALL
  SELECT 'PaymentRefund.status', "status", COUNT(*) FROM "PaymentRefund" GROUP BY "status"
  UNION ALL
  SELECT 'ReferralCode.status', "status", COUNT(*) FROM "ReferralCode" GROUP BY "status"
  UNION ALL
  SELECT 'ReferralReward.status', "status", COUNT(*) FROM "ReferralReward" GROUP BY "status"
  UNION ALL
  SELECT 'OrgReferralPartnership.status', "status", COUNT(*) FROM "OrgReferralPartnership" GROUP BY "status"
  UNION ALL
  SELECT 'TrainerCommission.status', "status", COUNT(*) FROM "TrainerCommission" GROUP BY "status"
  UNION ALL
  SELECT 'TrainerPayout.status', "status", COUNT(*) FROM "TrainerPayout" GROUP BY "status"
  UNION ALL
  SELECT 'Class.status', "status", COUNT(*) FROM "Class" GROUP BY "status"
  UNION ALL
  SELECT 'ClassEnrollment.status', "status", COUNT(*) FROM "ClassEnrollment" GROUP BY "status"
  UNION ALL
  SELECT 'OrganizationAbuseFlag.severity', "severity", COUNT(*) FROM "OrganizationAbuseFlag" GROUP BY "severity"
  UNION ALL
  SELECT 'OrganizationAbuseFlag.status', "status", COUNT(*) FROM "OrganizationAbuseFlag" GROUP BY "status"
  UNION ALL
  SELECT 'WhatsAppDevice.status', "status", COUNT(*) FROM "WhatsAppDevice" GROUP BY "status"
)
SELECT current_values.*
FROM current_values
LEFT JOIN allowed_values
  ON allowed_values.field = current_values.field
 AND allowed_values.value = current_values.value
WHERE allowed_values.value IS NULL
ORDER BY current_values.field, current_values.value;
`.trim();

const createTypesSql = String.raw`
CREATE TYPE "OrganizationUserStatusNew" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
CREATE TYPE "DataExportRequestStatusNew" AS ENUM ('REQUESTED', 'PROCESSING', 'READY', 'FAILED', 'CANCELLED');
CREATE TYPE "AccountDeletionRequestStatusNew" AS ENUM ('REQUESTED', 'PROCESSING', 'SCHEDULED', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "MembershipJoinRequestStatusNew" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE "PaymentRefundStatusNew" AS ENUM ('REQUESTED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
CREATE TYPE "ReferralCodeStatusNew" AS ENUM ('ACTIVE', 'PAUSED', 'EXPIRED', 'REVOKED');
CREATE TYPE "ReferralRewardStatusNew" AS ENUM ('PENDING', 'APPLIED', 'PAID', 'EXPIRED', 'CANCELLED');
CREATE TYPE "OrgReferralPartnershipStatusNew" AS ENUM ('ACTIVE', 'INACTIVE', 'PAUSED', 'ENDED');
CREATE TYPE "TrainerCommissionStatusNew" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'CANCELLED');
CREATE TYPE "TrainerPayoutStatusNew" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED');
CREATE TYPE "ClassStatusNew" AS ENUM ('SCHEDULED', 'CANCELLED', 'COMPLETED');
CREATE TYPE "ClassEnrollmentStatusNew" AS ENUM ('CONFIRMED', 'WAITLISTED', 'CANCELLED', 'ATTENDED', 'NO_SHOW');
CREATE TYPE "OrganizationAbuseFlagSeverityNew" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "OrganizationAbuseFlagStatusNew" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED');
CREATE TYPE "WhatsAppDeviceStatusNew" AS ENUM ('ACTIVE', 'INACTIVE', 'REVOKED');
`.trim();

const castColumnsSql = String.raw`
ALTER TABLE "OrganizationUser"
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" TYPE "OrganizationUserStatusNew"
USING UPPER("status")::"OrganizationUserStatusNew",
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

ALTER TABLE "DataExportRequest"
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" TYPE "DataExportRequestStatusNew"
USING UPPER("status")::"DataExportRequestStatusNew",
ALTER COLUMN "status" SET DEFAULT 'REQUESTED';

ALTER TABLE "AccountDeletionRequest"
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" TYPE "AccountDeletionRequestStatusNew"
USING UPPER("status")::"AccountDeletionRequestStatusNew",
ALTER COLUMN "status" SET DEFAULT 'REQUESTED';

ALTER TABLE "MembershipJoinRequest"
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" TYPE "MembershipJoinRequestStatusNew"
USING UPPER("status")::"MembershipJoinRequestStatusNew",
ALTER COLUMN "status" SET DEFAULT 'PENDING';

ALTER TABLE "PaymentRefund"
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" TYPE "PaymentRefundStatusNew"
USING "status"::"PaymentRefundStatusNew",
ALTER COLUMN "status" SET DEFAULT 'REQUESTED';

ALTER TABLE "ReferralCode"
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" TYPE "ReferralCodeStatusNew"
USING UPPER("status")::"ReferralCodeStatusNew",
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

ALTER TABLE "ReferralReward"
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" TYPE "ReferralRewardStatusNew"
USING UPPER("status")::"ReferralRewardStatusNew",
ALTER COLUMN "status" SET DEFAULT 'PENDING';

ALTER TABLE "OrgReferralPartnership"
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" TYPE "OrgReferralPartnershipStatusNew"
USING UPPER("status")::"OrgReferralPartnershipStatusNew",
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

ALTER TABLE "TrainerCommission"
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" TYPE "TrainerCommissionStatusNew"
USING UPPER("status")::"TrainerCommissionStatusNew",
ALTER COLUMN "status" SET DEFAULT 'PENDING';

ALTER TABLE "TrainerPayout"
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" TYPE "TrainerPayoutStatusNew"
USING UPPER("status")::"TrainerPayoutStatusNew",
ALTER COLUMN "status" SET DEFAULT 'PENDING';

ALTER TABLE "Class"
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" TYPE "ClassStatusNew"
USING UPPER("status")::"ClassStatusNew",
ALTER COLUMN "status" SET DEFAULT 'SCHEDULED';

ALTER TABLE "ClassEnrollment"
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" TYPE "ClassEnrollmentStatusNew"
USING UPPER("status")::"ClassEnrollmentStatusNew",
ALTER COLUMN "status" SET DEFAULT 'CONFIRMED';

ALTER TABLE "OrganizationAbuseFlag"
ALTER COLUMN "severity" TYPE "OrganizationAbuseFlagSeverityNew"
USING UPPER("severity")::"OrganizationAbuseFlagSeverityNew",
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" TYPE "OrganizationAbuseFlagStatusNew"
USING UPPER("status")::"OrganizationAbuseFlagStatusNew",
ALTER COLUMN "status" SET DEFAULT 'OPEN';

ALTER TABLE "WhatsAppDevice"
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" TYPE "WhatsAppDeviceStatusNew"
USING "status"::"WhatsAppDeviceStatusNew",
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
`.trim();

const validateMigrationSql = String.raw`
SELECT table_name, column_name, udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'OrganizationUser',
    'DataExportRequest',
    'AccountDeletionRequest',
    'MembershipJoinRequest',
    'PaymentRefund',
    'ReferralCode',
    'ReferralReward',
    'OrgReferralPartnership',
    'TrainerCommission',
    'TrainerPayout',
    'Class',
    'ClassEnrollment',
    'OrganizationAbuseFlag',
    'WhatsAppDevice'
  )
  AND column_name IN ('status', 'severity')
ORDER BY table_name, column_name;
`.trim();

const rollbackExampleSql = String.raw`
ALTER TABLE "PaymentRefund"
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" TYPE text
USING "status"::text,
ALTER COLUMN "status" SET DEFAULT 'REQUESTED';

DROP TYPE IF EXISTS "PaymentRefundStatusNew";
`.trim();

const sections = [
  ["value-audit", valueAuditSql],
  ["invalid-value-audit", invalidValueAuditSql],
  ["create-types-staging-only", createTypesSql],
  ["cast-columns-staging-only", castColumnsSql],
  ["validate-migration", validateMigrationSql],
  ["rollback-example", rollbackExampleSql],
] as const;

const requestedSection = process.argv[2];
const selectedSections = requestedSection
  ? sections.filter(([name]) => name === requestedSection)
  : sections;

if (requestedSection && selectedSections.length === 0) {
  console.error(
    `Unknown section "${requestedSection}". Expected one of: ${sections.map(([name]) => name).join(", ")}`,
  );
  process.exit(1);
}

console.log("-- B2 status enum rollout SQL");
console.log("-- Run value-audit and invalid-value-audit on a staging clone before enum casts.");
console.log("-- create-types-staging-only and cast-columns-staging-only are dry-run migration shapes.");
console.log("-- Do not apply this directly to production without product sign-off on enum values.\n");

for (const [name, sql] of selectedSections) {
  console.log(`-- ${name}`);
  console.log(`${sql}\n`);
}
