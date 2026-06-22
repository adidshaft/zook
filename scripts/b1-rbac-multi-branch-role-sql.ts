const currentConstraintCollisionAuditSql = String.raw`
SELECT
  "orgId",
  "userId",
  COUNT(*) AS assignment_count,
  ARRAY_AGG("id" ORDER BY "createdAt" ASC) AS assignment_ids,
  ARRAY_AGG("role" ORDER BY "createdAt" ASC) AS roles,
  ARRAY_AGG(COALESCE("branchId", '<org-level>') ORDER BY "createdAt" ASC) AS branches
FROM "OrganizationRoleAssignment"
GROUP BY "orgId", "userId"
HAVING COUNT(*) > 1
ORDER BY assignment_count DESC, "orgId", "userId";
`.trim();

const branchScopedDuplicateAuditSql = String.raw`
SELECT
  "orgId",
  "userId",
  "branchId",
  "role",
  COUNT(*) AS duplicate_count,
  ARRAY_AGG("id" ORDER BY "createdAt" ASC) AS assignment_ids
FROM "OrganizationRoleAssignment"
WHERE "branchId" IS NOT NULL
GROUP BY "orgId", "userId", "branchId", "role"
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, "orgId", "userId", "branchId", "role";
`.trim();

const orgLevelDuplicateAuditSql = String.raw`
SELECT
  "orgId",
  "userId",
  "role",
  COUNT(*) AS duplicate_count,
  ARRAY_AGG("id" ORDER BY "createdAt" ASC) AS assignment_ids
FROM "OrganizationRoleAssignment"
WHERE "branchId" IS NULL
GROUP BY "orgId", "userId", "role"
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, "orgId", "userId", "role";
`.trim();

const migrationSql = String.raw`
ALTER TABLE "OrganizationRoleAssignment"
DROP CONSTRAINT IF EXISTS "OrganizationRoleAssignment_orgId_userId_key";

ALTER TABLE "OrganizationRoleAssignment"
DROP CONSTRAINT IF EXISTS "OrganizationRoleAssignment_orgId_userId_role_key";

ALTER TABLE "OrganizationRoleAssignment"
ADD CONSTRAINT "OrganizationRoleAssignment_orgId_userId_branchId_role_key"
UNIQUE ("orgId", "userId", "branchId", "role");

CREATE UNIQUE INDEX organization_role_assignment_org_level_unique_idx
ON "OrganizationRoleAssignment" ("orgId", "userId", "role")
WHERE "branchId" IS NULL;
`.trim();

const validateMigrationSql = String.raw`
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'OrganizationRoleAssignment'
  AND (
    indexname = 'OrganizationRoleAssignment_orgId_userId_branchId_role_key'
    OR indexname = 'organization_role_assignment_org_level_unique_idx'
  )
ORDER BY indexname;
`.trim();

const rollbackSql = String.raw`
DROP INDEX IF EXISTS organization_role_assignment_org_level_unique_idx;

ALTER TABLE "OrganizationRoleAssignment"
DROP CONSTRAINT IF EXISTS "OrganizationRoleAssignment_orgId_userId_branchId_role_key";

ALTER TABLE "OrganizationRoleAssignment"
ADD CONSTRAINT "OrganizationRoleAssignment_orgId_userId_key"
UNIQUE ("orgId", "userId");

ALTER TABLE "OrganizationRoleAssignment"
ADD CONSTRAINT "OrganizationRoleAssignment_orgId_userId_role_key"
UNIQUE ("orgId", "userId", "role");
`.trim();

const assignmentDetailSql = String.raw`
SELECT
  "id",
  "orgId",
  "userId",
  "role",
  "branchId",
  "assignedById",
  "createdAt"
FROM "OrganizationRoleAssignment"
WHERE "orgId" = $1
  AND "userId" = $2
ORDER BY "createdAt" ASC;
`.trim();

const sections = [
  ["current-constraint-collision-audit", currentConstraintCollisionAuditSql],
  ["branch-scoped-duplicate-audit", branchScopedDuplicateAuditSql],
  ["org-level-duplicate-audit", orgLevelDuplicateAuditSql],
  ["assignment-detail", assignmentDetailSql],
  ["migration-staging-only", migrationSql],
  ["validate-migration", validateMigrationSql],
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

console.log("-- B1 RBAC multi-branch role rollout SQL");
console.log("-- Run duplicate audits on a staging clone before migration-staging-only.");
console.log("-- Rollback can fail after valid multi-role or multi-branch rows exist.");
console.log("-- Do not apply this directly to production without the rollout checklist.\n");

for (const [name, sql] of selectedSections) {
  console.log(`-- ${name}`);
  console.log(`${sql}\n`);
}
