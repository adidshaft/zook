# B6 Retention And Scale Rollout Plan

Last updated: 18 June 2026

## Goal

Add retention, purge, and scale controls for operational tables that grow without bound.

This is Product Plan Part B item `B6`.

This document is intentionally a rollout proposal only. It does not mutate `schema.prisma`, apply
partitioning, or delete data. The affected tables contain audit, push, provider-health,
idempotency, and notification history, so rollout needs staging counts, legal/privacy retention
agreement, and rollback rehearsals.

## Current schema evidence

Current gaps:

- `RequestIdempotency` has `createdAt` but no `expiresAt` despite runtime using a 24-hour replay
  window.
- `AuditLog` has no retention or partitioning marker.
- `PushDelivery` has no retention marker.
- `ProviderHealthCheck` has no retention marker.
- `NotificationRecipient` has no `orgId`, so tenant-scoped notification retention and reporting
  require joins through `Notification`.

Relevant current model excerpts:

```prisma
model RequestIdempotency {
  userId      String?
  operation   String
  requestHash String
  body        Json
  createdAt   DateTime @default(now())

  @@unique([userId, operation, requestHash])
  @@index([createdAt])
}

model AuditLog {
  orgId     String?
  action    String
  metadata  Json?
  createdAt DateTime @default(now())
}

model NotificationRecipient {
  notificationId String
  userId         String
  readAt         DateTime?
  createdAt      DateTime @default(now())

  @@unique([notificationId, userId])
  @@index([userId, readAt])
}
```

## Target changes

Add explicit expiry metadata:

| Model | New field | Suggested default policy |
| --- | --- | --- |
| `RequestIdempotency` | `expiresAt DateTime` | `createdAt + 24 hours` |
| `PushDelivery` | `expiresAt DateTime?` | `createdAt + 90 days` |
| `ProviderHealthCheck` | `expiresAt DateTime?` | `checkedAt + 30 days` |
| `NotificationRecipient` | `expiresAt DateTime?` | `createdAt + 180 days` after read/delivered |
| `AuditLog` | partitioned by `createdAt` | retain operational logs per legal/privacy policy |
| `NotificationRecipient` | `orgId String?` | copied from parent `Notification.orgId` |

Do not add an `AuditLog.expiresAt` field unless legal/privacy confirms an audit-log deletion policy.
Partitioning gives scale without prematurely deleting compliance evidence.

## Preflight row-count audit

Run on a staging clone or disposable production snapshot:

```sql
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
```

Notification recipient org backfill audit:

```sql
SELECT
  COUNT(*) AS recipients,
  COUNT(n."orgId") AS recipients_with_parent_org,
  COUNT(*) - COUNT(n."orgId") AS recipients_without_parent_org
FROM "NotificationRecipient" nr
LEFT JOIN "Notification" n ON n."id" = nr."notificationId";
```

Large tenant distribution audit:

```sql
SELECT n."orgId", COUNT(*) AS recipient_rows
FROM "NotificationRecipient" nr
JOIN "Notification" n ON n."id" = nr."notificationId"
GROUP BY n."orgId"
ORDER BY recipient_rows DESC
LIMIT 25;
```

## Staging migration phase 1: add nullable metadata

Add nullable fields first:

```sql
ALTER TABLE "RequestIdempotency"
ADD COLUMN IF NOT EXISTS "expiresAt" timestamp(3);

ALTER TABLE "PushDelivery"
ADD COLUMN IF NOT EXISTS "expiresAt" timestamp(3);

ALTER TABLE "ProviderHealthCheck"
ADD COLUMN IF NOT EXISTS "expiresAt" timestamp(3);

ALTER TABLE "NotificationRecipient"
ADD COLUMN IF NOT EXISTS "orgId" text,
ADD COLUMN IF NOT EXISTS "expiresAt" timestamp(3);
```

Backfill:

```sql
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
```

Indexes:

```sql
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
```

After `RequestIdempotency.expiresAt` is fully backfilled, make it required in a later migration:

```sql
ALTER TABLE "RequestIdempotency"
ALTER COLUMN "expiresAt" SET NOT NULL;
```

## Staging migration phase 2: runtime compatibility

Deploy runtime changes after phase 1:

- write `RequestIdempotency.expiresAt` on every idempotent operation
- read idempotency rows with `expiresAt > now()` instead of only `createdAt >= now - 24h`
- write `NotificationRecipient.orgId` whenever recipients are created
- write retention `expiresAt` for new push/provider/recipient rows
- keep createdAt-based fallback reads until all environments have the new columns

Representative code areas:

- `apps/web/src/server/api-router/core.ts`
- `apps/web/src/server/push-runtime.ts`
- `apps/web/src/server/audit.ts`
- `packages/db/prisma/seed.ts`

## Purge job design

Run deletes in small batches and skip rows without `expiresAt`.

Example SQL for a generic batch:

```sql
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
```

Repeat for:

- `RequestIdempotency`
- `PushDelivery`
- `ProviderHealthCheck`
- `NotificationRecipient`

Do not purge `AuditLog` until the legal/privacy retention policy is signed off.

Suggested endpoint/job:

- `POST /api/cron/retention-purge`
- protected by `CRON_SECRET`
- emits structured audit/log output with table counts
- refuses to run in production without explicit retention env values

## AuditLog partitioning plan

Partitioning `AuditLog` is a separate migration because it may require table recreation depending on
current Postgres constraints and Prisma support.

Preferred staging route:

1. Create `AuditLog_v2` partitioned by range on `createdAt`.
2. Create monthly partitions, starting with the oldest observed month and at least three future
   months.
3. Copy data in batches ordered by `createdAt`.
4. Validate row counts and sample hashes.
5. Swap table names in a short maintenance window.
6. Recreate indexes on each partition.

Example partition shape:

```sql
CREATE TABLE "AuditLog_v2" (
  LIKE "AuditLog" INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES
) PARTITION BY RANGE ("createdAt");

CREATE TABLE "AuditLog_2026_06"
PARTITION OF "AuditLog_v2"
FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
```

Do not apply this directly through Prisma without a staging rehearsal. Prisma migrations can manage
raw SQL, but partition operations must be reviewed manually.

## Validation queries

After phase 1:

```sql
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
```

After purge dry-run:

```sql
SELECT COUNT(*)
FROM "RequestIdempotency"
WHERE "expiresAt" < NOW();
```

The expired idempotency count should trend to zero after the purge job runs.

## Rollback

Before runtime depends on the new fields:

```sql
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
```

After runtime writes these fields, rollback should keep columns nullable rather than drop them unless
the code rollback is deployed first.

AuditLog partition rollback requires restoring from the pre-swap table or backup. Rehearse this on
staging before production.

## Production rollout checklist

- staging row-count audit is attached
- legal/privacy confirms retention durations for each table
- phase-1 nullable columns and indexes succeed on staging
- runtime compatibility release is deployed before strict `NOT NULL` enforcement
- purge job dry-run deletes only expired rows
- AuditLog partitioning has separate staging rehearsal and rollback evidence
- web gates pass: `pnpm --filter @zook/web typecheck`, `lint`, and `test`
- root `pnpm typecheck` passes if Prisma/generated DB types change
- observability dashboard tracks purge counts and oldest retained row per table

## Out of scope in this proposal

- idempotency route coverage from `A3.6`
- notification fan-out queueing from `A3.2`
- async push delivery from `A3.3`
- branch-scope model rollout from `B4`
