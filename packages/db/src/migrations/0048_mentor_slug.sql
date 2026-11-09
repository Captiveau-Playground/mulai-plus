-- Slug publik mentor untuk URL /mentors/<slug> (dibuat dari nama panggilan).
ALTER TABLE "mentor_detail" ADD COLUMN IF NOT EXISTS "slug" text;
CREATE UNIQUE INDEX IF NOT EXISTS "mentor_detail_slug_idx" ON "mentor_detail" ("slug");
