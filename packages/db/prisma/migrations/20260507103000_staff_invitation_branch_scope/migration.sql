ALTER TABLE "StaffInvitation" ADD COLUMN "branchId" TEXT;

CREATE INDEX "StaffInvitation_orgId_branchId_idx" ON "StaffInvitation"("orgId", "branchId");
