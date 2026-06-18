# B1 RBAC Multi-Branch Role Rollout Plan

Last updated: 18 June 2026

## Goal

Allow a staff user to hold multiple roles and branch-scoped assignments in the same organization.

This is the Product Plan Part B item `B1`.

Current `OrganizationRoleAssignment` constraints make that impossible:

```prisma
model OrganizationRoleAssignment {
  id           String   @id @default(cuid())
  orgId        String
  userId       String
  role         Role
  branchId     String?
  assignedById String?
  createdAt    DateTime @default(now())

  @@unique([orgId, userId])
  @@unique([orgId, userId, role])
  @@index([orgId, role])
  @@index([orgId, branchId])
  @@index([userId])
}
```

The first unique constraint blocks a receptionist/trainer/manager from having more than one role in
the same gym. The second blocks the same role from being scoped to more than one branch.

## Desired invariant

The assignment identity should be:

```prisma
@@unique([orgId, userId, branchId, role])
```

That target allows:

- one user to be both `TRAINER` and `RECEPTIONIST` in the same org
- one user to hold the same role in multiple branches
- one org-level assignment with `branchId = null`

## Product caveat

Postgres unique indexes treat `NULL` values as distinct, so `@@unique([orgId, userId, branchId, role])`
alone does not prevent duplicate org-level rows where `branchId IS NULL`.

Use a companion partial unique index for org-level assignments:

```sql
CREATE UNIQUE INDEX organization_role_assignment_org_level_unique_idx
ON "OrganizationRoleAssignment" ("orgId", "userId", "role")
WHERE "branchId" IS NULL;
```

This keeps branch-scoped duplicates blocked by the composite unique constraint while preserving a
single org-level assignment per role.

## Preflight audits

Generate the rollout SQL with:

```bash
pnpm db:b1:sql
```

Print a single section when needed:

```bash
pnpm db:b1:sql current-constraint-collision-audit
pnpm db:b1:sql branch-scoped-duplicate-audit
pnpm db:b1:sql org-level-duplicate-audit
pnpm db:b1:sql assignment-detail
pnpm db:b1:sql migration-staging-only
pnpm db:b1:sql validate-migration
pnpm db:b1:sql rollback
```

Run these first on a staging clone or disposable copy of production.

Current constraint collision audit:

```sql
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
```

Target duplicate audit for branch-scoped rows:

```sql
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
```

Target duplicate audit for org-level rows:

```sql
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
```

If either target duplicate audit returns rows, do not apply the new constraints yet.

## Suggested remediation rule on staging

Do not merge or delete role rows automatically.

Review each collision set with ops/product:

1. Keep every assignment that represents a real role or branch scope.
2. Remove only exact duplicates that share the same `orgId`, `userId`, `role`, and branch scope.
3. If one row is org-level and another is branch-scoped, keep both unless product confirms branch-only
   scope should replace org-level scope.
4. Preserve `assignedById` and earliest `createdAt` where possible when deduplicating.

## Staging dry-run procedure

1. Restore or clone staging from the latest production snapshot.
2. Run all preflight audits above.
3. If duplicates exist, document the cleanup decision for each collision set.
4. Apply cleanup on staging only.
5. Re-run the target duplicate audits until both return zero rows.
6. Apply the migration SQL on staging.
7. Re-run RBAC smoke tests:
   - owner can invite a trainer to two branches
   - owner can grant one user trainer and receptionist roles
   - branch-scoped staff sees only assigned branch data
   - org-level owner/admin still sees all branches
   - removing one role does not remove the user's other role or branch assignment

Migration SQL for staging:

```sql
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
```

Validation query after migration:

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'OrganizationRoleAssignment'
  AND (
    indexname = 'OrganizationRoleAssignment_orgId_userId_branchId_role_key'
    OR indexname = 'organization_role_assignment_org_level_unique_idx'
  );
```

## Prisma migration note

The composite unique constraint can be represented in Prisma:

```prisma
@@unique([orgId, userId, branchId, role])
```

The org-level `branchId IS NULL` uniqueness needs raw SQL because Prisma schema syntax does not
represent partial indexes.

Do not apply this directly to production without:

- staging clone dry-run evidence
- target duplicate audits returning zero rows
- RBAC smoke tests proving multi-role and multi-branch behavior

## Rollback

If the rollout needs to be reversed:

```sql
DROP INDEX IF EXISTS organization_role_assignment_org_level_unique_idx;

ALTER TABLE "OrganizationRoleAssignment"
DROP CONSTRAINT IF EXISTS "OrganizationRoleAssignment_orgId_userId_branchId_role_key";

ALTER TABLE "OrganizationRoleAssignment"
ADD CONSTRAINT "OrganizationRoleAssignment_orgId_userId_key"
UNIQUE ("orgId", "userId");

ALTER TABLE "OrganizationRoleAssignment"
ADD CONSTRAINT "OrganizationRoleAssignment_orgId_userId_role_key"
UNIQUE ("orgId", "userId", "role");
```

Rollback can fail if staging or production has already created valid multi-role or multi-branch rows.
If that happens, decide whether to preserve the new behavior or archive extra assignments before
restoring the old constraints.

## Production rollout checklist

- `pnpm release:preflight` passes with the target env
- fresh database backup/snapshot exists
- staging clone dry-run is documented
- target duplicate audits return zero rows immediately before applying migration
- RBAC smoke tests pass after staging migration
- owner/admin staff-management UI has been checked for multi-role and multi-branch behavior

## Out of scope in this proposal

- replacing free-string statuses with enums (`B2`)
- invoice column collapse (`B3`)
- adding branch scope to member/trainer/plan models (`B4`)
- broader uniqueness/retention work (`B5`, `B6`)
