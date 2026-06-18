# B3 Invoice Column Collapse Rollout Plan

Last updated: 18 June 2026

## Goal

Collapse the duplicated `Invoice` numbering, date, and amount columns into one canonical set.

This is Product Plan Part B item `B3`.

This document is intentionally a migration proposal only. It does not change `schema.prisma` or drop
columns because invoice identifiers and amounts are financial records. The rollout needs staging
backfill evidence and report/PDF/client compatibility checks before destructive schema work.

## Current schema problem

Current `Invoice` has three number columns, two issue-date columns, and overlapping amount columns:

```prisma
model Invoice {
  id             String        @id @default(cuid())
  orgId          String?
  branchId       String?
  ...
  number         String?       @unique
  invoiceNo      String?       @unique
  invoiceNumber  String?       @unique
  financialYear  String?
  issueDate      DateTime      @default(now())
  issuedAt       DateTime      @default(now())
  ...
  subtotalPaise  Int           @default(0)
  gstPaise       Int           @default(0)
  totalPaise     Int           @default(0)
  amountPaise    Int           @default(0)
  taxPaise       Int           @default(0)
  ...
}
```

The app currently compensates with compatibility fallbacks:

- invoice generation writes all three number columns
- reports use `invoiceNumber ?? invoiceNo`
- mobile and dashboard screens display `invoiceNumber ?? invoiceNo`
- reports fall back from `totalPaise` to `amountPaise`, and from `gstPaise` to `taxPaise`

Those fallbacks keep old data readable, but they also hide drift and make future GST work riskier.

## Canonical target

Use these canonical fields:

| Concept | Keep | Drop after backfill |
| --- | --- | --- |
| Invoice number | `invoiceNumber` | `number`, `invoiceNo` |
| Issue timestamp | `issueDate` | `issuedAt` |
| Pre-tax amount | `subtotalPaise` | none |
| Tax amount | `gstPaise` | `taxPaise` |
| Total amount | `totalPaise` | `amountPaise` |

Reasoning:

- `invoiceNumber` is the clearest API/client name and is already used by tests and UI.
- `issueDate` is already indexed for reports.
- `subtotalPaise`, `gstPaise`, and `totalPaise` match the invoice-service calculations.

## Preflight drift audit

Run this on a staging clone or disposable production snapshot before any backfill:

```sh
pnpm db:b3:sql drift-audit
pnpm db:b3:sql mismatch-detail
```

The helper emits the full drift audit query:

```sql
SELECT
  COUNT(*) FILTER (
    WHERE COALESCE("invoiceNumber", "invoiceNo", "number") IS NULL
  ) AS missing_any_number,
  COUNT(*) FILTER (
    WHERE "invoiceNumber" IS NOT NULL
      AND "invoiceNo" IS NOT NULL
      AND "invoiceNumber" <> "invoiceNo"
  ) AS invoice_number_no_mismatch,
  COUNT(*) FILTER (
    WHERE "invoiceNumber" IS NOT NULL
      AND "number" IS NOT NULL
      AND "invoiceNumber" <> "number"
  ) AS invoice_number_number_mismatch,
  COUNT(*) FILTER (
    WHERE "invoiceNo" IS NOT NULL
      AND "number" IS NOT NULL
      AND "invoiceNo" <> "number"
  ) AS invoice_no_number_mismatch,
  COUNT(*) FILTER (
    WHERE "issueDate" IS NOT NULL
      AND "issuedAt" IS NOT NULL
      AND "issueDate" <> "issuedAt"
  ) AS issue_date_mismatch,
  COUNT(*) FILTER (
    WHERE "totalPaise" <> 0
      AND "amountPaise" <> 0
      AND "totalPaise" <> "amountPaise"
  ) AS total_amount_mismatch,
  COUNT(*) FILTER (
    WHERE "gstPaise" <> 0
      AND "taxPaise" <> 0
      AND "gstPaise" <> "taxPaise"
  ) AS gst_tax_mismatch
FROM "Invoice";
```

List mismatched records for manual review:

```sql
SELECT
  "id",
  "orgId",
  "paymentId",
  "number",
  "invoiceNo",
  "invoiceNumber",
  "issueDate",
  "issuedAt",
  "subtotalPaise",
  "gstPaise",
  "totalPaise",
  "amountPaise",
  "taxPaise",
  "createdAt"
FROM "Invoice"
WHERE (
    "invoiceNumber" IS NOT NULL
    AND "invoiceNo" IS NOT NULL
    AND "invoiceNumber" <> "invoiceNo"
  )
  OR (
    "invoiceNumber" IS NOT NULL
    AND "number" IS NOT NULL
    AND "invoiceNumber" <> "number"
  )
  OR (
    "issueDate" IS NOT NULL
    AND "issuedAt" IS NOT NULL
    AND "issueDate" <> "issuedAt"
  )
  OR (
    "totalPaise" <> 0
    AND "amountPaise" <> 0
    AND "totalPaise" <> "amountPaise"
  )
  OR (
    "gstPaise" <> 0
    AND "taxPaise" <> 0
    AND "gstPaise" <> "taxPaise"
  )
ORDER BY "createdAt" DESC;
```

If any mismatch count is non-zero, stop and get finance/product sign-off for the canonical value per
invoice before applying destructive changes.

## Staging backfill SQL

After drift is reviewed, backfill canonical columns on staging:

```sh
pnpm db:b3:sql backfill-canonical-staging-only
```

```sql
UPDATE "Invoice"
SET
  "invoiceNumber" = COALESCE("invoiceNumber", "invoiceNo", "number"),
  "issueDate" = COALESCE("issueDate", "issuedAt", "createdAt"),
  "totalPaise" = CASE
    WHEN "totalPaise" <> 0 THEN "totalPaise"
    ELSE "amountPaise"
  END,
  "gstPaise" = CASE
    WHEN "gstPaise" <> 0 THEN "gstPaise"
    ELSE "taxPaise"
  END,
  "subtotalPaise" = CASE
    WHEN "subtotalPaise" <> 0 THEN "subtotalPaise"
    WHEN "amountPaise" <> 0 THEN GREATEST("amountPaise" - "taxPaise", 0)
    ELSE "subtotalPaise"
  END
WHERE
  "invoiceNumber" IS NULL
  OR "issueDate" IS NULL
  OR "totalPaise" = 0
  OR ("gstPaise" = 0 AND "taxPaise" <> 0)
  OR ("subtotalPaise" = 0 AND "amountPaise" <> 0);
```

Then enforce the canonical uniqueness target on staging:

```sh
pnpm db:b3:sql canonical-unique-index-staging-only
```

```sql
CREATE UNIQUE INDEX invoice_invoice_number_unique_idx
ON "Invoice" ("invoiceNumber")
WHERE "invoiceNumber" IS NOT NULL;
```

## Compatibility release before dropping columns

Ship a code-only release before the destructive migration:

1. Invoice generation writes only canonical values in business logic, but can still dual-write legacy
   fields during the transition if old clients need it.
2. Reports and PDFs read canonical fields first and record any legacy fallback usage through
   structured logs.
3. Mobile DTOs continue accepting legacy fields until the oldest supported mobile build is past the
   compatibility window.
4. Acceptance tests assert new invoices have matching canonical values and no dependence on legacy
   fallbacks.

Known code areas to update in the compatibility release:

- `apps/web/src/server/invoices/generate.ts`
- `apps/web/src/server/reports-service.ts`
- `apps/web/src/server/api-router/core.ts`
- `apps/web/src/components/dashboard/sections/billing-section.tsx`
- `apps/mobile/src/components/membership/payments-section.tsx`
- `apps/mobile/app/membership/receipt/[paymentId].tsx`
- `apps/mobile/src/lib/domains/shared/types.ts`

## Destructive staging migration

Only after the compatibility release is deployed and staging drift stays at zero:

```sh
pnpm db:b3:sql destructive-migration-staging-only
```

```sql
ALTER TABLE "Invoice"
DROP CONSTRAINT IF EXISTS "Invoice_number_key";

ALTER TABLE "Invoice"
DROP CONSTRAINT IF EXISTS "Invoice_invoiceNo_key";

DROP INDEX IF EXISTS invoice_invoice_number_unique_idx;

ALTER TABLE "Invoice"
DROP COLUMN IF EXISTS "number",
DROP COLUMN IF EXISTS "invoiceNo",
DROP COLUMN IF EXISTS "issuedAt",
DROP COLUMN IF EXISTS "amountPaise",
DROP COLUMN IF EXISTS "taxPaise";

ALTER TABLE "Invoice"
ALTER COLUMN "invoiceNumber" SET NOT NULL;

ALTER TABLE "Invoice"
ADD CONSTRAINT "Invoice_invoiceNumber_key" UNIQUE ("invoiceNumber");
```

Validation after destructive migration:

```sh
pnpm db:b3:sql validate-destructive-migration
```

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'Invoice'
  AND column_name IN ('number', 'invoiceNo', 'issuedAt', 'amountPaise', 'taxPaise');
```

The validation query should return zero rows.

## Prisma migration note

The final Prisma model should keep only:

```prisma
invoiceNumber String   @unique
issueDate     DateTime @default(now())
subtotalPaise Int      @default(0)
gstPaise      Int      @default(0)
totalPaise    Int      @default(0)
```

Do not let Prisma generate a blind drop-column migration until the staging backfill and compatibility
release have both been completed.

## Rollback

Rollback is easy before the destructive migration: keep the legacy columns and revert application
code to legacy fallbacks.

After columns are dropped, rollback requires re-adding them from canonical values:

```sh
pnpm db:b3:sql rollback-after-drop
```

```sql
ALTER TABLE "Invoice"
ADD COLUMN IF NOT EXISTS "number" text,
ADD COLUMN IF NOT EXISTS "invoiceNo" text,
ADD COLUMN IF NOT EXISTS "issuedAt" timestamp(3),
ADD COLUMN IF NOT EXISTS "amountPaise" integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "taxPaise" integer NOT NULL DEFAULT 0;

UPDATE "Invoice"
SET
  "number" = COALESCE("number", "invoiceNumber"),
  "invoiceNo" = COALESCE("invoiceNo", "invoiceNumber"),
  "issuedAt" = COALESCE("issuedAt", "issueDate"),
  "amountPaise" = CASE WHEN "amountPaise" = 0 THEN "totalPaise" ELSE "amountPaise" END,
  "taxPaise" = CASE WHEN "taxPaise" = 0 THEN "gstPaise" ELSE "taxPaise" END;
```

Recreating the old unique constraints can fail if duplicate legacy values were introduced during the
rollback window, so rehearse rollback on staging.

## Production rollout checklist

- staging drift audit returns zero mismatches after backfill
- finance/product signs off on any invoices that had mismatched values
- compatibility release has shipped and has no legacy fallback logs for the agreed window
- web gates pass: `pnpm --filter @zook/web typecheck`, `lint`, and `test`
- mobile typecheck/test gates pass if mobile DTOs or receipt UI are changed
- root `pnpm typecheck` passes if `packages/db` generated types change
- invoice PDF/report/export smoke tests pass on staging
- rollback SQL has been tested on staging

## Out of scope in this proposal

- GST-compliant invoice line items and CGST/SGST/IGST (`E2.3`)
- status enum rollout (`B2`)
- referential integrity rollout (`A1.1`)
- invoice sequence numbering policy changes
