const createSchemaSql = String.raw`
CREATE TYPE "BackgroundJobStatus" AS ENUM (
  'QUEUED',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'DEAD',
  'CANCELLED'
);

CREATE TABLE "BackgroundJob" (
  "id" text PRIMARY KEY,
  "orgId" text,
  "queue" text NOT NULL,
  "kind" text NOT NULL,
  "status" "BackgroundJobStatus" NOT NULL DEFAULT 'QUEUED',
  "dedupeKey" text,
  "payload" jsonb NOT NULL,
  "result" jsonb,
  "attempts" integer NOT NULL DEFAULT 0,
  "maxAttempts" integer NOT NULL DEFAULT 5,
  "runAt" timestamp(3) NOT NULL DEFAULT now(),
  "lockedAt" timestamp(3),
  "lockedBy" text,
  "lastError" text,
  "completedAt" timestamp(3),
  "expiresAt" timestamp(3),
  "createdById" text,
  "createdAt" timestamp(3) NOT NULL DEFAULT now(),
  "updatedAt" timestamp(3) NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX background_job_queue_dedupe_unique_idx
ON "BackgroundJob" ("queue", "dedupeKey")
WHERE "dedupeKey" IS NOT NULL;

CREATE INDEX "BackgroundJob_status_queue_runAt_idx"
ON "BackgroundJob" ("status", "queue", "runAt");

CREATE INDEX "BackgroundJob_orgId_status_createdAt_idx"
ON "BackgroundJob" ("orgId", "status", "createdAt");

CREATE INDEX "BackgroundJob_expiresAt_idx"
ON "BackgroundJob" ("expiresAt");
`.trim();

const validateSchemaSql = String.raw`
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'BackgroundJob'
ORDER BY indexname;

SELECT enumlabel
FROM pg_enum
WHERE enumtypid = '"BackgroundJobStatus"'::regtype
ORDER BY enumsortorder;
`.trim();

const claimJobsSql = String.raw`
WITH claim AS (
  SELECT "id"
  FROM "BackgroundJob"
  WHERE "status" = 'QUEUED'
    AND "queue" = $1
    AND "runAt" <= NOW()
  ORDER BY "runAt" ASC, "createdAt" ASC
  LIMIT $2
  FOR UPDATE SKIP LOCKED
)
UPDATE "BackgroundJob" job
SET
  "status" = 'RUNNING',
  "lockedAt" = NOW(),
  "lockedBy" = $3,
  "attempts" = job."attempts" + 1,
  "updatedAt" = NOW()
FROM claim
WHERE job."id" = claim."id"
RETURNING job.*;
`.trim();

const completeJobSql = String.raw`
UPDATE "BackgroundJob"
SET
  "status" = 'SUCCEEDED',
  "result" = $2::jsonb,
  "completedAt" = NOW(),
  "lockedAt" = NULL,
  "lockedBy" = NULL,
  "updatedAt" = NOW()
WHERE "id" = $1
  AND "status" = 'RUNNING'
RETURNING *;
`.trim();

const failJobSql = String.raw`
UPDATE "BackgroundJob"
SET
  "status" = CASE
    WHEN "attempts" >= "maxAttempts" THEN 'DEAD'::"BackgroundJobStatus"
    ELSE 'QUEUED'::"BackgroundJobStatus"
  END,
  "runAt" = CASE
    WHEN "attempts" >= "maxAttempts" THEN "runAt"
    ELSE NOW() + (($2 * POWER(2, GREATEST("attempts" - 1, 0)))::text || ' seconds')::interval
  END,
  "lastError" = LEFT($3, 2000),
  "lockedAt" = NULL,
  "lockedBy" = NULL,
  "updatedAt" = NOW()
WHERE "id" = $1
  AND "status" = 'RUNNING'
RETURNING *;
`.trim();

const queueDepthSql = String.raw`
SELECT
  "queue",
  "status",
  COUNT(*) AS job_count,
  MIN("runAt") AS oldest_run_at,
  MIN("createdAt") AS oldest_created_at
FROM "BackgroundJob"
GROUP BY "queue", "status"
ORDER BY "queue", "status";
`.trim();

const rollbackSql = String.raw`
DROP TABLE IF EXISTS "BackgroundJob";
DROP TYPE IF EXISTS "BackgroundJobStatus";
`.trim();

const exportUnfinishedSql = String.raw`
SELECT *
FROM "BackgroundJob"
WHERE "status" IN ('QUEUED', 'RUNNING', 'FAILED')
ORDER BY "createdAt" ASC;
`.trim();

const sections = [
  ["create-schema-staging-only", createSchemaSql],
  ["validate-schema", validateSchemaSql],
  ["claim-jobs", claimJobsSql],
  ["complete-job", completeJobSql],
  ["fail-or-reschedule-job", failJobSql],
  ["queue-depth", queueDepthSql],
  ["export-unfinished-before-rollback", exportUnfinishedSql],
  ["rollback-before-producers", rollbackSql],
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

console.log("-- A3.1 Durable queue rollout SQL");
console.log("-- Run create-schema-staging-only on a staging clone before any production migration.");
console.log("-- Do not move producers to the queue until worker claim/complete/fail behavior is verified.");
console.log("-- Do not apply this directly to production without the rollout checklist.\n");

for (const [name, sql] of selectedSections) {
  console.log(`-- ${name}`);
  console.log(`${sql}\n`);
}
