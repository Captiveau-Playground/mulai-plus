-- (F07/K3) Normalisasi email roster: huruf kecil + trim.
-- Klaim undangan membandingkan email akun dengan email roster; data lama dari
-- jalur admin TMB/Dapodik bisa mengandung huruf besar sehingga klaim gagal (412).
-- Idempoten: hanya baris yang belum normal yang diubah.
UPDATE "tmb_batch_students"
SET "email" = lower(btrim("email"))
WHERE "email" IS NOT NULL
  AND "email" <> lower(btrim("email"));
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tmb_batch_students_email_lower_idx"
  ON "tmb_batch_students" (lower(btrim("email")))
  WHERE "email" IS NOT NULL;
