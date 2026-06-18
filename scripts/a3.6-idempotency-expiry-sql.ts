const rowCountSql = String.raw`
SELECT COUNT(*) AS idempotency_rows
FROM "RequestIdempotency";
`.trim();

const addExpiryColumnSql = String.raw`
BEGIN;

ALTER TABLE "RequestIdempotency"
  ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);

UPDATE "RequestIdempotency"
SET "expiresAt" = "createdAt" + INTERVAL '24 hours'
WHERE "expiresAt" IS NULL;

ALTER TABLE "RequestIdempotency"
  ALTER COLUMN "expiresAt" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "RequestIdempotency_expiresAt_idx"
  ON "RequestIdempotency"("expiresAt");

COMMIT;
`.trim();

const validateExpirySql = String.raw`
SELECT
  COUNT(*) AS idempotency_rows,
  COUNT(*) FILTER (WHERE "expiresAt" IS NULL) AS null_expires_at_rows,
  MIN("createdAt") AS oldest_created_at,
  MAX("createdAt") AS newest_created_at,
  MIN("expiresAt") AS oldest_expires_at,
  MAX("expiresAt") AS newest_expires_at
FROM "RequestIdempotency";

SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'RequestIdempotency'
ORDER BY indexname;
`.trim();

const purgeExpiredSql = String.raw`
DELETE FROM "RequestIdempotency"
WHERE "expiresAt" < NOW()
  AND "id" IN (
    SELECT "id"
    FROM "RequestIdempotency"
    WHERE "expiresAt" < NOW()
    ORDER BY "expiresAt" ASC
    LIMIT 1000
  );
`.trim();

const purgePreviewSql = String.raw`
SELECT COUNT(*) AS purgeable_rows
FROM "RequestIdempotency"
WHERE "expiresAt" < NOW();

SELECT "id", "userId", "operation", "createdAt", "expiresAt"
FROM "RequestIdempotency"
WHERE "expiresAt" < NOW()
ORDER BY "expiresAt" ASC
LIMIT 50;
`.trim();

const rollbackBeforeRuntimeSwitchSql = String.raw`
DROP INDEX IF EXISTS "RequestIdempotency_expiresAt_idx";

ALTER TABLE "RequestIdempotency"
  DROP COLUMN IF EXISTS "expiresAt";
`.trim();

const sections = [
  ["row-count", rowCountSql],
  ["add-expiry-column-staging-only", addExpiryColumnSql],
  ["validate-expiry", validateExpirySql],
  ["purge-preview", purgePreviewSql],
  ["purge-expired-batch", purgeExpiredSql],
  ["rollback-before-runtime-switch", rollbackBeforeRuntimeSwitchSql],
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

console.log("-- A3.6 Idempotency expiry rollout SQL");
console.log("-- Run add-expiry-column-staging-only on a staging clone before production.");
console.log("-- Keep runtime reads on createdAt until expiresAt exists everywhere.");
console.log("-- Do not apply this directly to production without the rollout checklist.\n");

for (const [name, sql] of selectedSections) {
  console.log(`-- ${name}`);
  console.log(`${sql}\n`);
}
