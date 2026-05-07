CREATE INDEX "MemberSubscription_orgId_status_idx" ON "MemberSubscription"("orgId", "status");
CREATE INDEX "AttendanceRecord_orgId_status_branchId_createdAt_idx" ON "AttendanceRecord"("orgId", "status", "branchId", "createdAt");
CREATE INDEX "Payment_orgId_status_createdAt_idx" ON "Payment"("orgId", "status", "createdAt");
