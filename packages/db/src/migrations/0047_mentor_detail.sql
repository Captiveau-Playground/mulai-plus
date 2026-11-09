-- Data detail mentor (diisi PM/admin) + gerbang persetujuan tampil di landing page.
-- Status aktif/nonaktif memakai `user.banned` (satu sumber kebenaran untuk akses akun).
CREATE TABLE IF NOT EXISTS "mentor_detail" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE CASCADE,
  "display_name" text,
  "jurusan" text,
  "jurusan_id" text,
  "kampus" text,
  "kampus_id" text,
  "tahun_masuk" integer,
  "bidang_pekerjaan" text,
  "bergabung_pada" timestamp,
  "social_media" jsonb,
  "pencapaian" text,
  "photo_url" text,
  "is_public" boolean DEFAULT false NOT NULL,
  "approved_at" timestamp,
  "approved_by" text,
  "updated_by" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "mentor_detail_public_idx" ON "mentor_detail" ("is_public");
CREATE INDEX IF NOT EXISTS "mentor_detail_kampus_idx" ON "mentor_detail" ("kampus_id");
