-- Enforce exactly one product role per user inside each organization.
WITH ranked_role_assignments AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "orgId", "userId"
      ORDER BY
        CASE "role"
          WHEN 'MEMBER' THEN 1
          WHEN 'TRAINER' THEN 2
          WHEN 'RECEPTIONIST' THEN 3
          WHEN 'ADMIN' THEN 4
          WHEN 'OWNER' THEN 5
          ELSE 6
        END ASC,
        "createdAt" ASC
    ) AS role_rank
  FROM "OrganizationRoleAssignment"
)
DELETE FROM "OrganizationRoleAssignment"
WHERE "id" IN (
  SELECT "id"
  FROM ranked_role_assignments
  WHERE role_rank > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationRoleAssignment_orgId_userId_key"
  ON "OrganizationRoleAssignment"("orgId", "userId");
