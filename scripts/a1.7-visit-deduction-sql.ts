const duplicateAuditSql = String.raw`
SELECT
  "subscriptionId",
  "attendanceId",
  COUNT(*) AS usage_count,
  ARRAY_AGG("id" ORDER BY "createdAt" ASC) AS usage_ids
FROM "MembershipUsage"
WHERE "attendanceId" IS NOT NULL
GROUP BY "subscriptionId", "attendanceId"
HAVING COUNT(*) > 1
ORDER BY usage_count DESC, "subscriptionId", "attendanceId";
`.trim();

const detailSql = String.raw`
SELECT
  "id",
  "orgId",
  "subscriptionId",
  "attendanceId",
  "usedVisits",
  "usageDate",
  "metadata",
  "createdAt"
FROM "MembershipUsage"
WHERE "subscriptionId" = $1
  AND "attendanceId" = $2
ORDER BY "createdAt" ASC;
`.trim();

const attendanceSourceSql = String.raw`
SELECT
  mu."id" AS usage_id,
  mu."subscriptionId",
  mu."attendanceId",
  mu."usedVisits",
  ar."orgId",
  ar."branchId",
  ar."userId",
  ar."dateKey",
  ar."status",
  ar."checkedInAt"
FROM "MembershipUsage" mu
LEFT JOIN "AttendanceRecord" ar
  ON ar."id" = mu."attendanceId"
WHERE mu."attendanceId" = $1
ORDER BY mu."createdAt" ASC;
`.trim();

const createIndexSql = String.raw`
CREATE UNIQUE INDEX membership_usage_unique_subscription_attendance_idx
ON "MembershipUsage" ("subscriptionId", "attendanceId")
WHERE "attendanceId" IS NOT NULL;
`.trim();

const validateIndexSql = String.raw`
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'MembershipUsage'
  AND indexname = 'membership_usage_unique_subscription_attendance_idx';
`.trim();

const rollbackSql = String.raw`
DROP INDEX IF EXISTS membership_usage_unique_subscription_attendance_idx;
`.trim();

const sections = [
  ["duplicate-audit", duplicateAuditSql],
  ["detail-query", detailSql],
  ["attendance-source-query", attendanceSourceSql],
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

console.log("-- A1.7 Visit deduction uniqueness rollout SQL");
console.log("-- Run duplicate-audit on a staging clone before applying create-index-staging-only.");
console.log("-- Duplicate usage rows can require MemberSubscription.remainingVisits reconciliation.");
console.log("-- Do not apply this directly to production without the rollout checklist.\n");

for (const [name, sql] of selectedSections) {
  console.log(`-- ${name}`);
  console.log(`${sql}\n`);
}
