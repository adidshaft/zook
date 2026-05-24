ALTER TABLE "UserSession"
ADD COLUMN "originalUserId" TEXT,
ADD COLUMN "impersonationSessionId" TEXT;

ALTER TYPE "OrganizationStatus" ADD VALUE IF NOT EXISTS 'DELETED';

ALTER TABLE "ImpersonationSession"
ADD COLUMN "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '60 minutes');

CREATE INDEX "UserSession_impersonationSessionId_idx" ON "UserSession"("impersonationSessionId");
CREATE INDEX "UserSession_originalUserId_idx" ON "UserSession"("originalUserId");
