-- Track an attendance record as a check-in session that can be closed later.
ALTER TABLE "AttendanceRecord"
  ADD COLUMN "checkedOutAt" TIMESTAMP(3),
  ADD COLUMN "checkoutReason" TEXT,
  ADD COLUMN "durationSeconds" INTEGER;

CREATE INDEX "AttendanceRecord_orgId_branchId_userId_checkedOutAt_idx"
  ON "AttendanceRecord"("orgId", "branchId", "userId", "checkedOutAt");
