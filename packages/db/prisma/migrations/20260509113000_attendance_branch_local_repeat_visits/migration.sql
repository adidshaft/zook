-- Allow Indian gyms to record multiple same-day visits while keeping date/branch lookups fast.
DROP INDEX IF EXISTS "AttendanceRecord_orgId_branchId_userId_dateKey_key";
CREATE INDEX IF NOT EXISTS "AttendanceRecord_orgId_branchId_userId_dateKey_idx" ON "AttendanceRecord"("orgId", "branchId", "userId", "dateKey");
