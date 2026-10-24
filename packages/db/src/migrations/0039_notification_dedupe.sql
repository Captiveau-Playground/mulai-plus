-- (M5.1) Notifikasi: kunci dedupe agar pemicu otomatis tidak mengirim berulang.
ALTER TABLE "notification" ADD COLUMN IF NOT EXISTS "dedupe_key" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "notification_dedupe_key_idx" ON "notification" ("dedupe_key") WHERE "dedupe_key" IS NOT NULL;
