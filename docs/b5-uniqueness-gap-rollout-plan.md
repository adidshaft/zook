# B5 Uniqueness Gap Rollout Plan

Last updated: 18 June 2026

## Goal

Close the Product Plan Part B `B5` uniqueness gaps without applying production-sensitive indexes
blindly.

Current gaps:

- `Payment.receiptNumber` is nullable and not unique per organization.
- `AIQuota` can contain multiple rows for the same `(orgId, userId)` scope.
- `MemberSubscription.paymentId` is nullable and not unique, so one payment can be linked to multiple
  subscriptions.

This document is intentionally a rollout proposal only. It does not mutate `schema.prisma` or apply
migrations because uniqueness constraints can fail on existing duplicate rows and can expose
application races that must be handled before rollout.

## Current schema evidence

```prisma
model Payment {
  orgId         String?
  receiptNumber String?
  ...
  @@index([orgId, status])
}

model AIQuota {
  orgId  String?
  userId String?
  ...
  @@index([orgId])
  @@index([userId])
}

model MemberSubscription {
  orgId     String
  paymentId String?
  ...
  @@index([orgId, memberUserId, status])
}
```

## Target invariants

Use partial unique indexes where nullable legacy fields are allowed:

```sql
CREATE UNIQUE INDEX payment_org_receipt_number_unique_idx
ON "Payment" ("orgId", "receiptNumber")
WHERE "orgId" IS NOT NULL
  AND "receiptNumber" IS NOT NULL;

CREATE UNIQUE INDEX ai_quota_org_user_unique_idx
ON "AIQuota" ("orgId", "userId")
WHERE "orgId" IS NOT NULL
  AND "userId" IS NOT NULL;

CREATE UNIQUE INDEX member_subscription_payment_id_unique_idx
ON "MemberSubscription" ("paymentId")
WHERE "paymentId" IS NOT NULL;
```

These match the product-plan intent while preserving existing null semantics during the compatibility
window.

## Preflight duplicate audits

Run these on a staging clone or disposable production snapshot before creating indexes.

```sh
pnpm db:b5:sql duplicate-receipt-numbers
pnpm db:b5:sql duplicate-ai-quota
pnpm db:b5:sql duplicate-subscription-payment
```

Duplicate receipt numbers inside one org:

```sql
SELECT
  "orgId",
  "receiptNumber",
  COUNT(*) AS duplicate_count,
  ARRAY_AGG("id" ORDER BY COALESCE("recordedAt", "createdAt") ASC) AS payment_ids
FROM "Payment"
WHERE "orgId" IS NOT NULL
  AND "receiptNumber" IS NOT NULL
GROUP BY "orgId", "receiptNumber"
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, "orgId", "receiptNumber";
```

Duplicate quota rows:

```sql
SELECT
  "orgId",
  "userId",
  COUNT(*) AS duplicate_count,
  ARRAY_AGG("id" ORDER BY "updatedAt" DESC) AS quota_ids,
  SUM("usedTextDaily") AS used_text_daily,
  SUM("usedTextMonth") AS used_text_month,
  SUM("usedImagesMonth") AS used_images_month
FROM "AIQuota"
WHERE "orgId" IS NOT NULL
  AND "userId" IS NOT NULL
GROUP BY "orgId", "userId"
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, "orgId", "userId";
```

One payment linked to multiple subscriptions:

```sql
SELECT
  "paymentId",
  COUNT(*) AS duplicate_count,
  ARRAY_AGG("id" ORDER BY "createdAt" ASC) AS subscription_ids,
  ARRAY_AGG("status" ORDER BY "createdAt" ASC) AS statuses
FROM "MemberSubscription"
WHERE "paymentId" IS NOT NULL
GROUP BY "paymentId"
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, "paymentId";
```

If any query returns rows, do not apply the index yet.

## Remediation guidance

### Duplicate `Payment.receiptNumber`

Do not silently renumber historical receipts without finance approval.

Suggested staging rule:

1. Keep the earliest payment's existing receipt number.
2. For later duplicates, assign a correction suffix such as `-DUP2` only after finance signs off.
3. Record the original value in `Payment.metadata` before changing it.
4. Re-render or archive affected receipt documents so support staff can explain the correction.

### Duplicate `AIQuota`

Merge duplicate rows into the newest row for the `(orgId, userId)` pair:

1. Keep the row with the latest `updatedAt`.
2. Use the maximum configured limits across duplicates.
3. Sum usage counters only when rows share the same reset windows.
4. If reset windows differ, preserve the strictest remaining allowance or ask product/ops to decide.

### Duplicate `MemberSubscription.paymentId`

This is money-sensitive. Review every duplicate payment group:

1. If duplicates are exact replay artifacts, keep the canonical active subscription and null out or
   cancel the duplicate's `paymentId`.
2. If one payment intentionally funded multiple memberships, stop and get a product decision because
   that contradicts the target invariant.
3. Preserve an audit trail before changing any subscription/payment linkage.

## Application compatibility requirements

Before applying the indexes, harden writers so they handle uniqueness errors cleanly.

Required checks:

- Receipt generation should not rely on `payment.count()` alone under concurrency. Use a transaction,
  retry-on-unique-conflict, or a dedicated receipt sequence table before enforcing the receipt index.
- Membership fulfillment should treat a duplicate `MemberSubscription.paymentId` insert/update as an
  idempotent replay when it points at the same payment and user.
- AI quota writes should use `upsert` against the canonical `(orgId, userId)` scope once the unique
  index exists.

Representative code areas:

- `apps/web/src/server/api-router/core.ts` (`ensurePaymentReceipt`, payment document routes)
- `apps/web/src/server/payment-runtime.ts` (membership activation/fulfillment)
- `apps/web/src/server/api-router/core.ts` (`resolveAIQuotaState` and future quota persistence)
- `packages/db/prisma/seed.ts` (seeded quotas/receipt numbers)

## Staging dry-run procedure

1. Restore or clone staging from the latest production snapshot.
2. Run all preflight duplicate audits.
3. If duplicates exist, document and apply remediation on staging only.
4. Re-run audits until they return zero rows.
5. Deploy compatibility writer changes to staging.
6. Apply the partial unique indexes on staging.
7. Run smoke tests:
   - generate the same receipt concurrently and confirm only one canonical receipt number survives
   - replay a completed membership payment webhook and confirm no duplicate active subscription
   - seed or update AI quota for a user twice and confirm one canonical row
   - desk manual payment with a unique receipt number still succeeds

Index SQL for staging:

```sh
pnpm db:b5:sql create-indexes-staging-only
```

```sql
CREATE UNIQUE INDEX payment_org_receipt_number_unique_idx
ON "Payment" ("orgId", "receiptNumber")
WHERE "orgId" IS NOT NULL
  AND "receiptNumber" IS NOT NULL;

CREATE UNIQUE INDEX ai_quota_org_user_unique_idx
ON "AIQuota" ("orgId", "userId")
WHERE "orgId" IS NOT NULL
  AND "userId" IS NOT NULL;

CREATE UNIQUE INDEX member_subscription_payment_id_unique_idx
ON "MemberSubscription" ("paymentId")
WHERE "paymentId" IS NOT NULL;
```

Validation query:

```sh
pnpm db:b5:sql validate-indexes
```

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE indexname IN (
  'payment_org_receipt_number_unique_idx',
  'ai_quota_org_user_unique_idx',
  'member_subscription_payment_id_unique_idx'
)
ORDER BY indexname;
```

## Prisma migration note

`Payment.receiptNumber` can be represented as a normal compound unique only if both fields are made
non-null, which is not compatible with legacy rows. Keep it as raw partial-index SQL unless the
business decides every payment must have an org and receipt number.

`AIQuota @@unique([orgId, userId])` and `MemberSubscription.paymentId @unique` are tempting Prisma
changes, but because both fields are nullable today, use a reviewed migration with explicit SQL first.

## Rollback

If staging rollout fails:

```sh
pnpm db:b5:sql rollback
```

```sql
DROP INDEX IF EXISTS payment_org_receipt_number_unique_idx;
DROP INDEX IF EXISTS ai_quota_org_user_unique_idx;
DROP INDEX IF EXISTS member_subscription_payment_id_unique_idx;
```

If compatibility writer changes were deployed, keep them unless they caused the failure. They are
safer than count-based receipt generation and duplicate quota inserts.

## Production rollout checklist

- duplicate audits return zero rows on staging and target production immediately before rollout
- any historical receipt/subscription remediation has finance/product sign-off
- compatibility writer changes are deployed and smoke-tested
- web gates pass: `pnpm --filter @zook/web typecheck`, `lint`, and `test`
- root `pnpm typecheck` passes if Prisma/generated DB types change
- concurrent receipt generation and duplicate webhook replay are tested on staging
- rollback SQL has been rehearsed on staging

## Out of scope in this proposal

- single-active-subscription partial index from `A1.5`
- visit-deduction uniqueness from `A1.7`
- branch-scope rollout from `B4`
- retention/partitioning work from `B6`
