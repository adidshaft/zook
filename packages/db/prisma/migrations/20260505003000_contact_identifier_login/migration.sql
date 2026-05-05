-- Add phone verification state and channel-aware OTP challenges.
ALTER TABLE "User" ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3);

ALTER TABLE "OtpChallenge" ADD COLUMN "identifier" TEXT;
ALTER TABLE "OtpChallenge" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'email';
ALTER TABLE "OtpChallenge" ADD COLUMN "phone" TEXT;

UPDATE "OtpChallenge"
SET "identifier" = "email"
WHERE "identifier" IS NULL;

ALTER TABLE "OtpChallenge" ALTER COLUMN "identifier" SET NOT NULL;

CREATE INDEX "User_phone_idx" ON "User"("phone");
CREATE INDEX "OtpChallenge_identifier_purpose_idx" ON "OtpChallenge"("identifier", "purpose");
CREATE INDEX "OtpChallenge_phone_purpose_idx" ON "OtpChallenge"("phone", "purpose");
