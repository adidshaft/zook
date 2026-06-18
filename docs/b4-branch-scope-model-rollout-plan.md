# B4 Branch-Scope Model Rollout Plan

Last updated: 18 June 2026

## Goal

Add branch scope to models that currently represent member/trainer/plan state only at organization
scope.

This is Product Plan Part B item `B4`.

This document is intentionally a rollout proposal only. It does not mutate `schema.prisma` or apply a
migration because adding branch scope changes report filters, trainer visibility, desk workflows, and
member plan access semantics.

## Current schema gaps

The current schema has no branch field on these models:

```prisma
model MemberProfile {
  orgId  String
  userId String
  ...
  @@unique([orgId, userId])
}

model TrainerAssignment {
  orgId         String
  trainerUserId String
  memberUserId  String
  active        Boolean @default(true)
  ...
  @@unique([orgId, trainerUserId, memberUserId])
}

model PersonalTrainingSubscription {
  orgId         String
  memberUserId  String
  trainerUserId String
  ...
}

model PlanContent {
  orgId         String
  creatorUserId String
  ...
}

model PlanAssignment {
  orgId            String
  planId           String
  assignedById     String
  assignedToUserId String?
  audience         String
  ...
}
```

Meanwhile the surrounding operational models already have branch scope, including
`MemberSubscription`, `AttendanceRecord`, `Payment`, `Class`, `ShopOrder`, and role assignments.

## Target fields

Add nullable branch fields first, then tighten after backfill evidence:

| Model | Field | Purpose |
| --- | --- | --- |
| `MemberProfile` | `primaryBranchId String?` | The member's default branch for desk/report queries. |
| `TrainerAssignment` | `branchId String?` | The branch where this trainer-client relationship applies. |
| `PersonalTrainingSubscription` | `branchId String?` | Revenue/reporting branch for PT subscription and sessions. |
| `PlanContent` | `branchId String?` | Branch-specific plan templates when the content is not org-global. |
| `PlanAssignment` | `branchId String?` | Branch scope for member/audience assignment visibility. |

Do not make these fields required in the first migration. Older data and org-global plans need a
compatibility window.

## Backfill precedence

Use deterministic precedence so staging and production produce the same branch assignments.

### `MemberProfile.primaryBranchId`

1. Active `MemberSubscription.branchId` for the same `(orgId, memberUserId)`, newest first.
2. Most recent non-null `AttendanceRecord.branchId` for the same member.
3. Most recent successful `Payment.branchId` for the same member.
4. Leave `NULL` for truly org-global or ambiguous members.

### `TrainerAssignment.branchId`

1. A matching active `MemberSubscription.branchId` for `memberUserId`.
2. A branch-scoped `OrganizationRoleAssignment.branchId` for `trainerUserId` with role `TRAINER`
   when there is exactly one active branch assignment.
3. `MemberProfile.primaryBranchId` after that field is backfilled.
4. Leave `NULL` when the relationship is intentionally org-wide or ambiguous.

### `PersonalTrainingSubscription.branchId`

1. Matching active `MemberSubscription.branchId` for the member at creation time or latest active
   subscription during backfill.
2. Matching `TrainerAssignment.branchId` for `(trainerUserId, memberUserId)`.
3. `MemberProfile.primaryBranchId`.
4. Leave `NULL` for legacy ambiguous records.

### `PlanContent.branchId`

1. Leave `NULL` by default because many plan templates are intentionally org-global.
2. Only backfill when all active assignments of the plan resolve to exactly one branch.
3. Prefer explicit future UI/API input over inferred backfill for templates.

### `PlanAssignment.branchId`

1. If assigned to a single user, use `MemberProfile.primaryBranchId`.
2. Else if assigned by a trainer and all that trainer's active clients for the assignment audience
   share one branch, use that branch.
3. Else if the plan content has `branchId`, use it.
4. Leave `NULL` for org-wide assignments.

## Preflight ambiguity audits

Run these on a staging clone or disposable production snapshot.

Members with multiple active branch subscriptions:

```sql
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
```

Trainer assignments whose trainer has multiple branch roles:

```sql
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
```

Plan assignments that fan out across multiple inferred member branches:

```sql
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
```

If any audit returns rows, keep the new branch field nullable and document the product/ops decision
for each ambiguity class before enforcing stricter filtering.

## Staging migration phase 1

Add nullable columns and indexes:

```sql
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
```

## Staging backfill examples

Backfill `MemberProfile.primaryBranchId` from newest active subscription:

```sql
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
```

Backfill `TrainerAssignment.branchId` from member primary branch:

```sql
UPDATE "TrainerAssignment" ta
SET "branchId" = mp."primaryBranchId"
FROM "MemberProfile" mp
WHERE ta."orgId" = mp."orgId"
  AND ta."memberUserId" = mp."userId"
  AND ta."branchId" IS NULL
  AND mp."primaryBranchId" IS NOT NULL;
```

Backfill `PersonalTrainingSubscription.branchId` from trainer assignment:

```sql
UPDATE "PersonalTrainingSubscription" pts
SET "branchId" = ta."branchId"
FROM "TrainerAssignment" ta
WHERE pts."orgId" = ta."orgId"
  AND pts."trainerUserId" = ta."trainerUserId"
  AND pts."memberUserId" = ta."memberUserId"
  AND pts."branchId" IS NULL
  AND ta."branchId" IS NOT NULL;
```

Backfill user-specific `PlanAssignment.branchId` from member primary branch:

```sql
UPDATE "PlanAssignment" pa
SET "branchId" = mp."primaryBranchId"
FROM "MemberProfile" mp
WHERE pa."orgId" = mp."orgId"
  AND pa."assignedToUserId" = mp."userId"
  AND pa."branchId" IS NULL
  AND mp."primaryBranchId" IS NOT NULL;
```

## Application compatibility phase

Ship code in a compatibility window before making branch fields required or changing report semantics.

Required updates:

- Member list/read models should filter profiles by `primaryBranchId` when a branch is selected,
  while still falling back to subscription branch during the transition.
- Trainer-client report should filter `TrainerAssignment.branchId` when present and fall back to
  member subscription/profile branch when null.
- PT subscription create/refund/session routes should write and read `branchId`.
- Plan creation/assignment routes should accept explicit branch scope where the UI has selected one.
- Member plan reads should not leak branch-specific assignments across the active branch context.
- Dashboard/public trainer listings should treat null branch as org-global, not hidden.

Representative code areas:

- `apps/web/src/server/api-router/core.ts`
- `apps/web/src/server/reports-service.ts`
- `apps/web/src/server/domains/members/read-models.ts`
- `apps/web/src/server/domains/plans/read-models.ts`
- `apps/web/app/coach/page.tsx`
- `apps/web/app/coach/clients/[clientId]/page.tsx`
- `apps/web/app/dashboard/classes/page.tsx`

## Validation after staging rollout

Run smoke checks in both org-global and branch-selected contexts:

- owner member list for branch A excludes branch B-only members
- owner member list still shows org-global/ambiguous legacy members with clear fallback behavior
- trainer sees only clients assigned in their branch unless they have org-level trainer scope
- PT revenue and session logs appear in the selected branch report
- assigning a plan in branch A does not show as an active branch B assignment
- org-global plan templates remain visible across branches
- member app still opens historical assignments with null branch scope

SQL validation:

```sql
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
```

Null counts are allowed during the compatibility window, but they should be reviewed and explained
before any later not-null or stricter filter rollout.

## Prisma migration note

The first Prisma migration should only add nullable fields and indexes:

```prisma
primaryBranchId String?
branchId        String?
```

Any future not-null enforcement or uniqueness changes should be a separate migration after staging
evidence shows no ambiguous legacy rows.

## Rollback

Before application code depends on the columns, rollback is:

```sql
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
```

After app code starts writing branch scope, rollback should preserve an export of the branch values
before dropping columns.

## Production rollout checklist

- staging ambiguity audits are attached
- nullable-column migration succeeds on staging
- backfill SQL is run and null/ambiguity counts are reviewed
- branch-filter smoke checks pass in owner, trainer, PT, plan, and member flows
- web gates pass: `pnpm --filter @zook/web typecheck`, `lint`, and `test`
- root `pnpm typecheck` passes if Prisma generated types change
- mobile branch context behavior is manually checked if member plan payloads change
- product/ops confirms how to treat legacy null branch rows

## Out of scope in this proposal

- RBAC uniqueness migration from `B1`
- enum conversion from `B2`
- invoice-column collapse from `B3`
- feature work for classes, day passes, CRM, or GST
