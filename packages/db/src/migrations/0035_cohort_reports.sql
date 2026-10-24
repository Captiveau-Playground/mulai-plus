-- (M3.3) Snapshot laporan insight kelas (portal sekolah).
-- Idempotent: aman dijalankan berulang.
CREATE TABLE IF NOT EXISTS "assessment_cohort_reports" (
  "id" text PRIMARY KEY NOT NULL,
  "batch_id" text NOT NULL,
  "org_id" text NOT NULL,
  "created_by" text,
  "period_start" timestamp,
  "period_end" timestamp,
  "snapshot" jsonb NOT NULL,
  "note" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_cohort_reports_batch_idx" ON "assessment_cohort_reports" ("batch_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_cohort_reports_org_idx" ON "assessment_cohort_reports" ("org_id");
