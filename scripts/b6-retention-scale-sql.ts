const rowCountAuditSql = String.raw`
SELECT 'RequestIdempotency' AS table_name, COUNT(*) AS rows, MIN("createdAt") AS oldest, MAX("createdAt") AS newest
FROM "RequestIdempotency"
UNION ALL
SELECT 'AuditLog', COUNT(*), MIN("createdAt"), MAX("createdAt")
FROM "AuditLog"
UNION ALL
SELECT 'PushDelivery', COUNT(*), MIN("createdAt"), MAX("createdAt")
FROM "PushDelivery"
UNION ALL
SELECT 'ProviderHealthCheck', COUNT(*), MIN("checkedAt"), MAX("checkedAt")
FROM "ProviderHealthCheck"
UNION ALL
SELECT 'NotificationRecipient', COUNT(*), MIN("createdAt"), MAX("createdAt")
FROM "NotificationRecipient"
ORDER BY table_name;
`.trim();

const notificationRecipientOrgAuditSql = String.raw`
SELECT
  COUNT(*) AS recipients,
  COUNT(n."orgId") AS recipients_with_parent_org,
  COUNT(*) - COUNT(n."orgId") AS recipients_without_parent_org
FROM "NotificationRecipient" nr
LEFT JOIN "Notification" n ON n."id" = nr."notificationId";
`.trim();

const tenantDistributionAuditSql = String.raw`
SELECT n."orgId", COUNT(*) AS recipient_rows
FROM "NotificationRecipient" nr
JOIN "Notification" n ON n."id" = nr."notificationId"
GROUP BY n."orgId"
ORDER BY recipient_rows DESC
LIMIT 25;
`.trim();

const migrationPhase1Sql = String.raw`
ALTER TABLE "RequestIdempotency"
ADD COLUMN IF NOT EXISTS "expiresAt" timestamp(3);

ALTER TABLE "PushDelivery"
ADD COLUMN IF NOT EXISTS "expiresAt" timestamp(3);

ALTER TABLE "ProviderHealthCheck"
ADD COLUMN IF NOT EXISTS "expiresAt" timestamp(3);

ALTER TABLE "NotificationRecipient"
ADD COLUMN IF NOT EXISTS "orgId" text,
ADD COLUMN IF NOT EXISTS "expiresAt" timestamp(3);
`.trim();

const backfillSql = String.raw`
UPDATE "RequestIdempotency"
SET "expiresAt" = "createdAt" + INTERVAL '24 hours'
WHERE "expiresAt" IS NULL;

UPDATE "PushDelivery"
SET "expiresAt" = "createdAt" + INTERVAL '90 days'
WHERE "expiresAt" IS NULL;

UPDATE "ProviderHealthCheck"
SET "expiresAt" = "checkedAt" + INTERVAL '30 days'
WHERE "expiresAt" IS NULL;

UPDATE "NotificationRecipient" nr
SET "orgId" = n."orgId"
FROM "Notification" n
WHERE nr."notificationId" = n."id"
  AND nr."orgId" IS NULL;

UPDATE "NotificationRecipient"
SET "expiresAt" = "createdAt" + INTERVAL '180 days'
WHERE "expiresAt" IS NULL
  AND ("readAt" IS NOT NULL OR "deliveredAt" IS NOT NULL);
`.trim();

const createIndexesSql = String.raw`
CREATE INDEX IF NOT EXISTS "RequestIdempotency_expiresAt_idx"
ON "RequestIdempotency" ("expiresAt");

CREATE INDEX IF NOT EXISTS "PushDelivery_expiresAt_idx"
ON "PushDelivery" ("expiresAt");

CREATE INDEX IF NOT EXISTS "ProviderHealthCheck_expiresAt_idx"
ON "ProviderHealthCheck" ("expiresAt");

CREATE INDEX IF NOT EXISTS "NotificationRecipient_orgId_createdAt_idx"
ON "NotificationRecipient" ("orgId", "createdAt");

CREATE INDEX IF NOT EXISTS "NotificationRecipient_expiresAt_idx"
ON "NotificationRecipient" ("expiresAt");
`.trim();

const enforceIdempotencyExpirySql = String.raw`
ALTER TABLE "RequestIdempotency"
ALTER COLUMN "expiresAt" SET NOT NULL;
`.trim();

const validatePhase1Sql = String.raw`
SELECT COUNT(*) AS missing_idempotency_expiry
FROM "RequestIdempotency"
WHERE "expiresAt" IS NULL;

SELECT COUNT(*) AS recipients_missing_org
FROM "NotificationRecipient" nr
JOIN "Notification" n ON n."id" = nr."notificationId"
WHERE n."orgId" IS NOT NULL
  AND nr."orgId" IS NULL;

SELECT indexname, indexdef
FROM pg_indexes
WHERE indexname IN (
  'RequestIdempotency_expiresAt_idx',
  'PushDelivery_expiresAt_idx',
  'ProviderHealthCheck_expiresAt_idx',
  'NotificationRecipient_orgId_createdAt_idx',
  'NotificationRecipient_expiresAt_idx'
)
ORDER BY indexname;
`.trim();

const purgePreviewSql = String.raw`
SELECT 'RequestIdempotency' AS table_name, COUNT(*) AS expired_rows
FROM "RequestIdempotency"
WHERE "expiresAt" IS NOT NULL
  AND "expiresAt" < NOW()
UNION ALL
SELECT 'PushDelivery', COUNT(*)
FROM "PushDelivery"
WHERE "expiresAt" IS NOT NULL
  AND "expiresAt" < NOW()
UNION ALL
SELECT 'ProviderHealthCheck', COUNT(*)
FROM "ProviderHealthCheck"
WHERE "expiresAt" IS NOT NULL
  AND "expiresAt" < NOW()
UNION ALL
SELECT 'NotificationRecipient', COUNT(*)
FROM "NotificationRecipient"
WHERE "expiresAt" IS NOT NULL
  AND "expiresAt" < NOW()
ORDER BY table_name;
`.trim();

const purgeExpiredPushDeliveryBatchSql = String.raw`
WITH expired AS (
  SELECT "id"
  FROM "PushDelivery"
  WHERE "expiresAt" IS NOT NULL
    AND "expiresAt" < NOW()
  ORDER BY "expiresAt" ASC
  LIMIT 1000
)
DELETE FROM "PushDelivery"
WHERE "id" IN (SELECT "id" FROM expired);
`.trim();

const purgeExpiredIdempotencyBatchSql = String.raw`
WITH expired AS (
  SELECT "id"
  FROM "RequestIdempotency"
  WHERE "expiresAt" IS NOT NULL
    AND "expiresAt" < NOW()
  ORDER BY "expiresAt" ASC
  LIMIT 1000
)
DELETE FROM "RequestIdempotency"
WHERE "id" IN (SELECT "id" FROM expired);
`.trim();

const purgeExpiredProviderHealthBatchSql = String.raw`
WITH expired AS (
  SELECT "id"
  FROM "ProviderHealthCheck"
  WHERE "expiresAt" IS NOT NULL
    AND "expiresAt" < NOW()
  ORDER BY "expiresAt" ASC
  LIMIT 1000
)
DELETE FROM "ProviderHealthCheck"
WHERE "id" IN (SELECT "id" FROM expired);
`.trim();

const purgeExpiredNotificationRecipientBatchSql = String.raw`
WITH expired AS (
  SELECT "id"
  FROM "NotificationRecipient"
  WHERE "expiresAt" IS NOT NULL
    AND "expiresAt" < NOW()
  ORDER BY "expiresAt" ASC
  LIMIT 1000
)
DELETE FROM "NotificationRecipient"
WHERE "id" IN (SELECT "id" FROM expired);
`.trim();

const auditLogPartitionExampleSql = String.raw`
CREATE TABLE "AuditLog_v2" (
  LIKE "AuditLog" INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES
) PARTITION BY RANGE ("createdAt");

CREATE TABLE "AuditLog_2026_06"
PARTITION OF "AuditLog_v2"
FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
`.trim();

const rollbackSql = String.raw`
DROP INDEX IF EXISTS "RequestIdempotency_expiresAt_idx";
DROP INDEX IF EXISTS "PushDelivery_expiresAt_idx";
DROP INDEX IF EXISTS "ProviderHealthCheck_expiresAt_idx";
DROP INDEX IF EXISTS "NotificationRecipient_orgId_createdAt_idx";
DROP INDEX IF EXISTS "NotificationRecipient_expiresAt_idx";

ALTER TABLE "NotificationRecipient" DROP COLUMN IF EXISTS "expiresAt";
ALTER TABLE "NotificationRecipient" DROP COLUMN IF EXISTS "orgId";
ALTER TABLE "ProviderHealthCheck" DROP COLUMN IF EXISTS "expiresAt";
ALTER TABLE "PushDelivery" DROP COLUMN IF EXISTS "expiresAt";
ALTER TABLE "RequestIdempotency" DROP COLUMN IF EXISTS "expiresAt";
`.trim();

const sections = [
  ["row-count-audit", rowCountAuditSql],
  ["notification-recipient-org-audit", notificationRecipientOrgAuditSql],
  ["tenant-distribution-audit", tenantDistributionAuditSql],
  ["migration-phase-1-staging-only", migrationPhase1Sql],
  ["backfill-staging-only", backfillSql],
  ["create-indexes-staging-only", createIndexesSql],
  ["enforce-idempotency-expiry-staging-only", enforceIdempotencyExpirySql],
  ["validate-phase-1", validatePhase1Sql],
  ["purge-preview", purgePreviewSql],
  ["purge-expired-push-delivery-batch", purgeExpiredPushDeliveryBatchSql],
  ["purge-expired-idempotency-batch", purgeExpiredIdempotencyBatchSql],
  ["purge-expired-provider-health-batch", purgeExpiredProviderHealthBatchSql],
  ["purge-expired-notification-recipient-batch", purgeExpiredNotificationRecipientBatchSql],
  ["audit-log-partition-example", auditLogPartitionExampleSql],
  ["rollback", rollbackSql],
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

console.log("-- B6 retention and scale rollout SQL");
console.log("-- Run audits on a staging clone before adding retention metadata.");
console.log("-- Migration, purge, and partition sections are staging-only dry-run shapes.");
console.log("-- Do not purge AuditLog without legal/privacy retention sign-off.\n");

for (const [name, sql] of selectedSections) {
  console.log(`-- ${name}`);
  console.log(`${sql}\n`);
}
