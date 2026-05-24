WITH branch_scope AS (
  SELECT id, "orgId"
  FROM (
    SELECT
      id,
      "orgId",
      row_number() OVER (
        PARTITION BY "orgId"
        ORDER BY
          CASE WHEN "isDefault" AND active THEN 0 WHEN "isDefault" THEN 1 WHEN active THEN 2 ELSE 3 END,
          "createdAt" ASC
      ) AS rank
    FROM "Branch"
  ) ranked
  WHERE rank = 1
)
UPDATE "Product" product
SET "branchId" = branch_scope.id
FROM branch_scope
WHERE product."orgId" = branch_scope."orgId"
  AND product."branchId" IS NULL;

WITH branch_scope AS (
  SELECT id, "orgId"
  FROM (
    SELECT
      id,
      "orgId",
      row_number() OVER (
        PARTITION BY "orgId"
        ORDER BY
          CASE WHEN "isDefault" AND active THEN 0 WHEN "isDefault" THEN 1 WHEN active THEN 2 ELSE 3 END,
          "createdAt" ASC
      ) AS rank
    FROM "Branch"
  ) ranked
  WHERE rank = 1
)
UPDATE "ShopOrder" shop_order
SET "branchId" = branch_scope.id
FROM branch_scope
WHERE shop_order."orgId" = branch_scope."orgId"
  AND shop_order."branchId" IS NULL;

WITH branch_scope AS (
  SELECT id, "orgId"
  FROM (
    SELECT
      id,
      "orgId",
      row_number() OVER (
        PARTITION BY "orgId"
        ORDER BY
          CASE WHEN "isDefault" AND active THEN 0 WHEN "isDefault" THEN 1 WHEN active THEN 2 ELSE 3 END,
          "createdAt" ASC
      ) AS rank
    FROM "Branch"
  ) ranked
  WHERE rank = 1
)
UPDATE "Payment" payment
SET "branchId" = branch_scope.id
FROM branch_scope
WHERE payment."orgId" = branch_scope."orgId"
  AND payment."branchId" IS NULL;

WITH branch_scope AS (
  SELECT id, "orgId"
  FROM (
    SELECT
      id,
      "orgId",
      row_number() OVER (
        PARTITION BY "orgId"
        ORDER BY
          CASE WHEN "isDefault" AND active THEN 0 WHEN "isDefault" THEN 1 WHEN active THEN 2 ELSE 3 END,
          "createdAt" ASC
      ) AS rank
    FROM "Branch"
  ) ranked
  WHERE rank = 1
)
UPDATE "MemberSubscription" subscription
SET "branchId" = branch_scope.id
FROM branch_scope
WHERE subscription."orgId" = branch_scope."orgId"
  AND subscription."branchId" IS NULL;
