ALTER TABLE "User" ADD COLUMN "preferredLocale" TEXT NOT NULL DEFAULT 'en';

ALTER TABLE "Branch" ADD COLUMN "contactPhone" TEXT;
ALTER TABLE "Branch" ADD COLUMN "contactEmail" TEXT;
ALTER TABLE "Branch" ADD COLUMN "operatingHours" JSONB;
ALTER TABLE "Branch" ADD COLUMN "amenities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Branch" ADD COLUMN "managerId" TEXT;
ALTER TABLE "Branch" ADD COLUMN "logoAssetId" TEXT;
ALTER TABLE "Branch" ADD COLUMN "coverAssetId" TEXT;
ALTER TABLE "Branch" ADD COLUMN "whatsappNumber" TEXT;

ALTER TABLE "Notification" ADD COLUMN "branchId" TEXT;

CREATE INDEX "Branch_orgId_managerId_idx" ON "Branch"("orgId", "managerId");
CREATE INDEX "Notification_orgId_branchId_status_idx" ON "Notification"("orgId", "branchId", "status");
