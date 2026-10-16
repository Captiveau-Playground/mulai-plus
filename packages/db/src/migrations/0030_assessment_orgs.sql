-- M1 B2B: organisasi (sekolah/institusi) + anggotanya (admin sekolah / guru BK)
-- Ditulis manual mengikuti pola migrasi terakhir (0027–0029).

DO $$ BEGIN
  CREATE TYPE "assessment_org_status" AS ENUM ('pending', 'aktif', 'ditolak', 'nonaktif');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "assessment_org_member_role" AS ENUM ('school_admin', 'school_viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "assessment_org_member_status" AS ENUM ('pending', 'aktif', 'ditolak');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "assessment_orgs" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "type" text DEFAULT 'sekolah' NOT NULL,
  "npsn" text,
  "city" text,
  "address" text,
  "pic_name" text,
  "pic_position" text,
  "pic_phone" text,
  "pic_email" text,
  "status" "assessment_org_status" DEFAULT 'pending' NOT NULL,
  "school_id" text,
  "note" text,
  "approved_by" text,
  "approved_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_assessment_orgs_status" ON "assessment_orgs" ("status");

-- Jembatan ke tabel sekolah legacy (`tmb_schools`, dibuat di migrasi lama)
ALTER TABLE "assessment_orgs" ADD COLUMN IF NOT EXISTS "school_id" text;
DO $$ BEGIN
  ALTER TABLE "assessment_orgs"
    ADD CONSTRAINT "assessment_orgs_school_id_tmb_schools_id_fk"
    FOREIGN KEY ("school_id") REFERENCES "tmb_schools" ("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "assessment_org_members" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL REFERENCES "assessment_orgs" ("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "role" "assessment_org_member_role" DEFAULT 'school_admin' NOT NULL,
  "status" "assessment_org_member_status" DEFAULT 'pending' NOT NULL,
  "invited_by" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_assessment_org_members_user" ON "assessment_org_members" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_assessment_org_members_org" ON "assessment_org_members" ("org_id");

-- Role untuk kanal B2B (dipakai requireRole di API)
INSERT INTO "role" ("id", "name", "description", "permissions")
VALUES
  (
    'school_admin',
    'Admin Sekolah',
    'Staff BK / admin sekolah: kelola peserta & jadwal, lihat hasil dan insight sekolahnya.',
    ARRAY['access:school_dashboard', 'assessment.school.read', 'assessment.school.manage_participants', 'assessment.school.manage_schedule', 'user.read']
  ),
  (
    'school_viewer',
    'Guru BK',
    'Guru BK / wakil kepala: hanya melihat peserta, hasil, dan laporan sekolahnya.',
    ARRAY['access:school_dashboard', 'assessment.school.read', 'user.read']
  )
ON CONFLICT ("id") DO NOTHING;
