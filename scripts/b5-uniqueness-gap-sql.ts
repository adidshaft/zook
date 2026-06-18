const duplicateReceiptNumbersSql = String.raw`
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
`.trim();

const duplicateAiQuotaSql = String.raw`
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
`.trim();

const duplicateSubscriptionPaymentSql = String.raw`
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
`.trim();

const createIndexesSql = String.raw`
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
`.trim();

const validateIndexesSql = String.raw`
SELECT indexname, indexdef
FROM pg_indexes
WHERE indexname IN (
  'payment_org_receipt_number_unique_idx',
  'ai_quota_org_user_unique_idx',
  'member_subscription_payment_id_unique_idx'
)
ORDER BY indexname;
`.trim();

const rollbackSql = String.raw`
DROP INDEX IF EXISTS payment_org_receipt_number_unique_idx;
DROP INDEX IF EXISTS ai_quota_org_user_unique_idx;
DROP INDEX IF EXISTS member_subscription_payment_id_unique_idx;
`.trim();

const sections = [
  ["duplicate-receipt-numbers", duplicateReceiptNumbersSql],
  ["duplicate-ai-quota", duplicateAiQuotaSql],
  ["duplicate-subscription-payment", duplicateSubscriptionPaymentSql],
  ["create-indexes-staging-only", createIndexesSql],
  ["validate-indexes", validateIndexesSql],
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

console.log("-- B5 uniqueness gap rollout SQL");
console.log("-- Run duplicate audits on a staging clone before create-indexes-staging-only.");
console.log("-- Do not apply partial unique indexes until duplicate rows and writer races are remediated.");
console.log("-- Receipt and subscription remediation require finance/product sign-off.\n");

for (const [name, sql] of selectedSections) {
  console.log(`-- ${name}`);
  console.log(`${sql}\n`);
}
