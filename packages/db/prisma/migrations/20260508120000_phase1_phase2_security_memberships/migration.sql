ALTER TABLE "UserSession"
  ADD COLUMN "deviceFingerprintHash" TEXT,
  ADD COLUMN "newDeviceNotifiedAt" TIMESTAMP(3),
  ADD COLUMN "lastSeenAt" TIMESTAMP(3);

CREATE INDEX "UserSession_userId_deviceFingerprintHash_idx"
  ON "UserSession"("userId", "deviceFingerprintHash");

ALTER TABLE "MemberSubscription"
  ADD COLUMN "resumesAt" TIMESTAMP(3),
  ADD COLUMN "pauseDaysUsed" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Coupon"
  ADD COLUMN "redemptionCount" INTEGER NOT NULL DEFAULT 0;

UPDATE "Coupon" AS c
SET "redemptionCount" = counted.count
FROM (
  SELECT "couponId", COUNT(*)::INTEGER AS count
  FROM "CouponRedemption"
  GROUP BY "couponId"
) AS counted
WHERE c.id = counted."couponId";

ALTER TABLE "AttendanceQrToken"
  ADD COLUMN "scanCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastScannedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "CouponRedemption_paymentSessionId_couponId_userId_key"
  ON "CouponRedemption"("paymentSessionId", "couponId", "userId");
