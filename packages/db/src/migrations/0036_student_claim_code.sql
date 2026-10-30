-- (M2.6) Kode akses sekali pakai untuk peserta TANPA email.
-- Guru membagikan kode personal; siswa memasukkan kode di halaman undangan,
-- akunnya otomatis tertaut ke roster. Idempotent.
ALTER TABLE "tmb_batch_students" ADD COLUMN IF NOT EXISTS "claim_code" text;
--> statement-breakpoint
ALTER TABLE "tmb_batch_students" ADD COLUMN IF NOT EXISTS "claim_code_used_at" timestamp;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tmb_batch_students_claim_code_idx" ON "tmb_batch_students" ("claim_code") WHERE "claim_code" IS NOT NULL;
