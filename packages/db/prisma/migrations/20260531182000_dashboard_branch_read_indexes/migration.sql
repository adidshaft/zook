CREATE INDEX IF NOT EXISTS "MemberProfile_orgId_createdAt_idx" ON "MemberProfile"("orgId", "createdAt");
CREATE INDEX IF NOT EXISTS "MemberSubscription_orgId_branchId_memberUserId_idx" ON "MemberSubscription"("orgId", "branchId", "memberUserId");
CREATE INDEX IF NOT EXISTS "Payment_orgId_branchId_recordedAt_createdAt_idx" ON "Payment"("orgId", "branchId", "recordedAt", "createdAt");
CREATE INDEX IF NOT EXISTS "Payment_orgId_recordedAt_createdAt_idx" ON "Payment"("orgId", "recordedAt", "createdAt");
CREATE INDEX IF NOT EXISTS "AttendanceRecord_orgId_branchId_checkedInAt_idx" ON "AttendanceRecord"("orgId", "branchId", "checkedInAt");
CREATE INDEX IF NOT EXISTS "AttendanceRecord_orgId_checkedInAt_idx" ON "AttendanceRecord"("orgId", "checkedInAt");
