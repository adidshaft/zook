const duplicateAuditSql = String.raw`
SELECT
  "orgId",
  "branchId",
  "userId",
  "dateKey",
  COUNT(*) AS record_count,
  ARRAY_AGG("id" ORDER BY "checkedInAt" ASC, "createdAt" ASC) AS attendance_ids
FROM "AttendanceRecord"
GROUP BY "orgId", "branchId", "userId", "dateKey"
HAVING COUNT(*) > 1
ORDER BY record_count DESC, "orgId", "branchId", "userId", "dateKey";
`.trim();

const detailSql = String.raw`
SELECT
  "id",
  "orgId",
  "branchId",
  "userId",
  "subscriptionId",
  "status",
  "source",
  "dateKey",
  "checkedInAt",
  "checkedOutAt",
  "approvedAt",
  "approvedById",
  "rejectedAt",
  "rejectedById",
  "rejectionReason",
  "suspiciousFlags",
  "qrTokenId",
  "deviceId",
  "createdAt"
FROM "AttendanceRecord"
WHERE "orgId" = $1
  AND "branchId" = $2
  AND "userId" = $3
  AND "dateKey" = $4
ORDER BY "checkedInAt" ASC, "createdAt" ASC;
`.trim();

const createIndexSql = String.raw`
CREATE UNIQUE INDEX attendance_record_one_per_day_idx
ON "AttendanceRecord" ("orgId", "branchId", "userId", "dateKey");
`.trim();

const validateIndexSql = String.raw`
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'AttendanceRecord'
  AND indexname = 'attendance_record_one_per_day_idx';
`.trim();

const rollbackSql = String.raw`
DROP INDEX IF EXISTS attendance_record_one_per_day_idx;
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

console.log("-- A1.6 Attendance per-day uniqueness rollout SQL");
console.log("-- Run duplicate-audit on a staging clone before applying create-index-staging-only.");
console.log("-- Confirm product wants one row per org/branch/user/dateKey regardless of status.");
console.log("-- Do not apply this directly to production without the rollout checklist.\n");

for (const [name, sql] of selectedSections) {
  console.log(`-- ${name}`);
  console.log(`${sql}\n`);
}
