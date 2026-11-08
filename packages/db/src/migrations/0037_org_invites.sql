-- (M4.1) Undangan rekan kerja sekolah (guru BK / wakil kepala).
-- Guru diundang lewat email; saat akun itu membuka portal sekolah, undangan
-- otomatis diklaim dan perannya naik jadi `school_viewer`. Idempotent.
CREATE TABLE IF NOT EXISTS "assessment_org_invites" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL REFERENCES "assessment_orgs"("id") ON DELETE CASCADE,
  "email" text NOT NULL,
  "role" text DEFAULT 'school_viewer' NOT NULL,
  "invited_by" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "accepted_at" timestamp
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "assessment_org_invites_org_email_idx" ON "assessment_org_invites" ("org_id", "email") WHERE "status" = 'pending';
