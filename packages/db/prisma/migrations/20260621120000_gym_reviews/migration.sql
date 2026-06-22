-- Public gym reviews: one review per user per gym, with moderation status.
CREATE TABLE IF NOT EXISTS "GymReview" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "body" TEXT,
  "status" TEXT NOT NULL DEFAULT 'published',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GymReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GymReview_orgId_userId_key" ON "GymReview"("orgId", "userId");
CREATE INDEX IF NOT EXISTS "GymReview_orgId_status_createdAt_idx" ON "GymReview"("orgId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "GymReview_userId_idx" ON "GymReview"("userId");
