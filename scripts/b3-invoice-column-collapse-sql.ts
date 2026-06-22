const driftAuditSql = String.raw`
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
`.trim();

const mismatchDetailSql = String.raw`
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
    "invoiceNo" IS NOT NULL
    AND "number" IS NOT NULL
    AND "invoiceNo" <> "number"
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
`.trim();

const backfillCanonicalSql = String.raw`
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
`.trim();

const canonicalUniqueIndexSql = String.raw`
CREATE UNIQUE INDEX invoice_invoice_number_unique_idx
ON "Invoice" ("invoiceNumber")
WHERE "invoiceNumber" IS NOT NULL;
`.trim();

const destructiveMigrationSql = String.raw`
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
`.trim();

const validateDestructiveMigrationSql = String.raw`
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'Invoice'
  AND column_name IN ('number', 'invoiceNo', 'issuedAt', 'amountPaise', 'taxPaise');
`.trim();

const rollbackAfterDropSql = String.raw`
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
`.trim();

const sections = [
  ["drift-audit", driftAuditSql],
  ["mismatch-detail", mismatchDetailSql],
  ["backfill-canonical-staging-only", backfillCanonicalSql],
  ["canonical-unique-index-staging-only", canonicalUniqueIndexSql],
  ["destructive-migration-staging-only", destructiveMigrationSql],
  ["validate-destructive-migration", validateDestructiveMigrationSql],
  ["rollback-after-drop", rollbackAfterDropSql],
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

console.log("-- B3 invoice column collapse rollout SQL");
console.log("-- Run drift-audit and mismatch-detail on a staging clone before backfill.");
console.log("-- Backfill and destructive migration sections are staging-only migration shapes.");
console.log("-- Do not drop legacy financial columns until finance/product sign-off is attached.\n");

for (const [name, sql] of selectedSections) {
  console.log(`-- ${name}`);
  console.log(`${sql}\n`);
}
