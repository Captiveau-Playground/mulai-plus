-- (Audit fix) `assessment_cohort_reports.org_id` sebelumnya diisi id `tmb_schools`
-- sehingga tidak bisa dipakai untuk scoping organisasi maupun teardown e2e.
-- Migrasi ini memisahkan dua konsep: `org_id` = assessment_orgs, `school_id` = tmb_schools.
ALTER TABLE "assessment_cohort_reports" ADD COLUMN IF NOT EXISTS "school_id" text;
--> statement-breakpoint
-- baris lama: org_id sebenarnya berisi id sekolah → pindahkan
UPDATE "assessment_cohort_reports" r
SET "school_id" = r."org_id"
WHERE r."school_id" IS NULL
  AND EXISTS (SELECT 1 FROM "tmb_schools" s WHERE s."id" = r."org_id");
--> statement-breakpoint
-- lalu isi org_id yang benar dari relasi sekolah → organisasi
UPDATE "assessment_cohort_reports" r
SET "org_id" = o."id"
FROM "assessment_orgs" o
WHERE o."school_id" = r."school_id" AND r."org_id" = r."school_id";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_cohort_reports_school_idx" ON "assessment_cohort_reports" ("school_id");
