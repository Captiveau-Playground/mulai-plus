-- (M4.3) Referral antar sekolah: tiap sekolah punya kode rujukan sendiri dan
-- mencatat sekolah mana yang mendaftar lewat kodenya. Idempotent.
ALTER TABLE "assessment_orgs" ADD COLUMN IF NOT EXISTS "referral_code" text;
--> statement-breakpoint
ALTER TABLE "assessment_orgs" ADD COLUMN IF NOT EXISTS "referred_by_org_id" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "assessment_orgs_referral_code_idx" ON "assessment_orgs" ("referral_code") WHERE "referral_code" IS NOT NULL;
