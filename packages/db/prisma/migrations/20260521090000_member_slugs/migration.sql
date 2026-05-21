-- Add nullable member slugs. Backfill runs separately before any future NOT NULL migration.
ALTER TABLE "User" ADD COLUMN "slug" VARCHAR(32);

CREATE UNIQUE INDEX "User_slug_key" ON "User"("slug");
