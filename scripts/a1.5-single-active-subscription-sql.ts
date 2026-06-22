const duplicateAuditSql = String.raw`
SELECT
  "orgId",
  "branchId",
  "memberUserId",
  COUNT(*) AS active_count,
  ARRAY_AGG("id" ORDER BY "createdAt" ASC) AS subscription_ids
FROM "MemberSubscription"
WHERE status = 'ACTIVE'
GROUP BY "orgId", "branchId", "memberUserId"
HAVING COUNT(*) > 1
ORDER BY active_count DESC, "orgId", "branchId", "memberUserId";
`.trim();

const detailSql = String.raw`
SELECT
  "id",
  "orgId",
  "branchId",
  "memberUserId",
  "planId",
  "status",
  "startsAt",
  "endsAt",
  "remainingVisits",
  "paymentId",
  "activatedById",
  "createdAt",
  "updatedAt"
FROM "MemberSubscription"
WHERE "orgId" = $1
  AND "branchId" = $2
  AND "memberUserId" = $3
ORDER BY
  CASE WHEN status = 'ACTIVE' THEN 0 ELSE 1 END,
  "createdAt" ASC;
`.trim();

const createIndexSql = String.raw`
CREATE UNIQUE INDEX member_subscription_single_active_idx
ON "MemberSubscription" ("orgId", "branchId", "memberUserId")
WHERE status = 'ACTIVE';
`.trim();

const validateIndexSql = String.raw`
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'MemberSubscription'
  AND indexname = 'member_subscription_single_active_idx';
`.trim();

const rollbackSql = String.raw`
DROP INDEX IF EXISTS member_subscription_single_active_idx;
`.trim();

const sections = [
  ["duplicate-audit", duplicateAuditSql],
  ["detail-query", detailSql],
  ["create-index-staging-only", createIndexSql],
  ["validate-index", validateIndexSql],
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

console.log("-- A1.5 Single Active Subscription rollout SQL");
console.log("-- Run duplicate-audit on a staging clone before applying create-index-staging-only.");
console.log("-- Do not apply this directly to production without the rollout checklist.\n");

for (const [name, sql] of selectedSections) {
  console.log(`-- ${name}`);
  console.log(`${sql}\n`);
}
