const multiBranchMemberAuditSql = String.raw`
SELECT
  "orgId",
  "memberUserId",
  COUNT(DISTINCT "branchId") AS active_branch_count,
  ARRAY_AGG(DISTINCT "branchId") AS branch_ids
FROM "MemberSubscription"
WHERE "status" = 'ACTIVE'
  AND "branchId" IS NOT NULL
GROUP BY "orgId", "memberUserId"
HAVING COUNT(DISTINCT "branchId") > 1
ORDER BY active_branch_count DESC, "orgId", "memberUserId";
`.trim();

const multiBranchTrainerAuditSql = String.raw`
SELECT
  ta."orgId",
  ta."trainerUserId",
  ta."memberUserId",
  COUNT(DISTINCT ora."branchId") AS trainer_branch_count,
  ARRAY_AGG(DISTINCT ora."branchId") AS trainer_branch_ids
FROM "TrainerAssignment" ta
JOIN "OrganizationRoleAssignment" ora
  ON ora."orgId" = ta."orgId"
  AND ora."userId" = ta."trainerUserId"
  AND ora."role" = 'TRAINER'
  AND ora."branchId" IS NOT NULL
WHERE ta."active" = true
GROUP BY ta."orgId", ta."trainerUserId", ta."memberUserId"
HAVING COUNT(DISTINCT ora."branchId") > 1
ORDER BY trainer_branch_count DESC, ta."orgId", ta."trainerUserId";
`.trim();

const multiBranchPlanAssignmentAuditSql = String.raw`
SELECT
  pa."orgId",
  pa."planId",
  pa."audience",
  COUNT(DISTINCT ms."branchId") AS inferred_branch_count,
  ARRAY_AGG(DISTINCT ms."branchId") AS inferred_branch_ids
FROM "PlanAssignment" pa
JOIN "MemberSubscription" ms
  ON ms."orgId" = pa."orgId"
  AND ms."memberUserId" = pa."assignedToUserId"
  AND ms."status" = 'ACTIVE'
  AND ms."branchId" IS NOT NULL
WHERE pa."assignedToUserId" IS NOT NULL
GROUP BY pa."orgId", pa."planId", pa."audience"
HAVING COUNT(DISTINCT ms."branchId") > 1
ORDER BY inferred_branch_count DESC, pa."orgId", pa."planId";
`.trim();

const migrationPhase1Sql = String.raw`
ALTER TABLE "MemberProfile"
ADD COLUMN IF NOT EXISTS "primaryBranchId" text;

ALTER TABLE "TrainerAssignment"
ADD COLUMN IF NOT EXISTS "branchId" text;

ALTER TABLE "PersonalTrainingSubscription"
ADD COLUMN IF NOT EXISTS "branchId" text;

ALTER TABLE "PlanContent"
ADD COLUMN IF NOT EXISTS "branchId" text;

ALTER TABLE "PlanAssignment"
ADD COLUMN IF NOT EXISTS "branchId" text;

CREATE INDEX IF NOT EXISTS "MemberProfile_orgId_primaryBranchId_idx"
ON "MemberProfile" ("orgId", "primaryBranchId");

CREATE INDEX IF NOT EXISTS "TrainerAssignment_orgId_branchId_trainerUserId_idx"
ON "TrainerAssignment" ("orgId", "branchId", "trainerUserId");

CREATE INDEX IF NOT EXISTS "PersonalTrainingSubscription_orgId_branchId_status_idx"
ON "PersonalTrainingSubscription" ("orgId", "branchId", "status");

CREATE INDEX IF NOT EXISTS "PlanContent_orgId_branchId_status_idx"
ON "PlanContent" ("orgId", "branchId", "status");

CREATE INDEX IF NOT EXISTS "PlanAssignment_orgId_branchId_assignedToUserId_idx"
ON "PlanAssignment" ("orgId", "branchId", "assignedToUserId");
`.trim();

const backfillMemberProfileSql = String.raw`
WITH ranked AS (
  SELECT
    "orgId",
    "memberUserId",
    "branchId",
    ROW_NUMBER() OVER (
      PARTITION BY "orgId", "memberUserId"
      ORDER BY "createdAt" DESC
    ) AS rn
  FROM "MemberSubscription"
  WHERE "status" = 'ACTIVE'
    AND "branchId" IS NOT NULL
)
UPDATE "MemberProfile" mp
SET "primaryBranchId" = ranked."branchId"
FROM ranked
WHERE ranked.rn = 1
  AND mp."orgId" = ranked."orgId"
  AND mp."userId" = ranked."memberUserId"
  AND mp."primaryBranchId" IS NULL;
`.trim();

const backfillTrainerAssignmentSql = String.raw`
UPDATE "TrainerAssignment" ta
SET "branchId" = mp."primaryBranchId"
FROM "MemberProfile" mp
WHERE ta."orgId" = mp."orgId"
  AND ta."memberUserId" = mp."userId"
  AND ta."branchId" IS NULL
  AND mp."primaryBranchId" IS NOT NULL;
`.trim();

const backfillPersonalTrainingSubscriptionSql = String.raw`
UPDATE "PersonalTrainingSubscription" pts
SET "branchId" = ta."branchId"
FROM "TrainerAssignment" ta
WHERE pts."orgId" = ta."orgId"
  AND pts."trainerUserId" = ta."trainerUserId"
  AND pts."memberUserId" = ta."memberUserId"
  AND pts."branchId" IS NULL
  AND ta."branchId" IS NOT NULL;
`.trim();

const backfillPlanAssignmentSql = String.raw`
UPDATE "PlanAssignment" pa
SET "branchId" = mp."primaryBranchId"
FROM "MemberProfile" mp
WHERE pa."orgId" = mp."orgId"
  AND pa."assignedToUserId" = mp."userId"
  AND pa."branchId" IS NULL
  AND mp."primaryBranchId" IS NOT NULL;
`.trim();

const validationSql = String.raw`
SELECT
  COUNT(*) FILTER (WHERE "primaryBranchId" IS NULL) AS member_profiles_without_branch
FROM "MemberProfile";

SELECT
  COUNT(*) FILTER (WHERE "branchId" IS NULL) AS trainer_assignments_without_branch
FROM "TrainerAssignment";

SELECT
  COUNT(*) FILTER (WHERE "branchId" IS NULL) AS pt_subscriptions_without_branch
FROM "PersonalTrainingSubscription";

SELECT
  COUNT(*) FILTER (WHERE "branchId" IS NULL) AS plan_assignments_without_branch
FROM "PlanAssignment";
`.trim();

const rollbackSql = String.raw`
DROP INDEX IF EXISTS "MemberProfile_orgId_primaryBranchId_idx";
DROP INDEX IF EXISTS "TrainerAssignment_orgId_branchId_trainerUserId_idx";
DROP INDEX IF EXISTS "PersonalTrainingSubscription_orgId_branchId_status_idx";
DROP INDEX IF EXISTS "PlanContent_orgId_branchId_status_idx";
DROP INDEX IF EXISTS "PlanAssignment_orgId_branchId_assignedToUserId_idx";

ALTER TABLE "PlanAssignment" DROP COLUMN IF EXISTS "branchId";
ALTER TABLE "PlanContent" DROP COLUMN IF EXISTS "branchId";
ALTER TABLE "PersonalTrainingSubscription" DROP COLUMN IF EXISTS "branchId";
ALTER TABLE "TrainerAssignment" DROP COLUMN IF EXISTS "branchId";
ALTER TABLE "MemberProfile" DROP COLUMN IF EXISTS "primaryBranchId";
`.trim();

const sections = [
  ["multi-branch-member-audit", multiBranchMemberAuditSql],
  ["multi-branch-trainer-audit", multiBranchTrainerAuditSql],
  ["multi-branch-plan-assignment-audit", multiBranchPlanAssignmentAuditSql],
  ["migration-phase-1-staging-only", migrationPhase1Sql],
  ["backfill-member-profile-staging-only", backfillMemberProfileSql],
  ["backfill-trainer-assignment-staging-only", backfillTrainerAssignmentSql],
  ["backfill-pt-subscription-staging-only", backfillPersonalTrainingSubscriptionSql],
  ["backfill-plan-assignment-staging-only", backfillPlanAssignmentSql],
  ["validation-counts", validationSql],
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

console.log("-- B4 branch-scope model rollout SQL");
console.log("-- Run ambiguity audits on a staging clone before nullable branch columns are added.");
console.log("-- Migration and backfill sections are staging-only shapes, not production commands.");
console.log("-- Keep branch fields nullable until product/ops signs off legacy ambiguous rows.\n");

for (const [name, sql] of selectedSections) {
  console.log(`-- ${name}`);
  console.log(`${sql}\n`);
}
