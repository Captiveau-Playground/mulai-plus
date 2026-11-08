-- (keputusan produk) Gabungkan role sekolah menjadi SATU: `school_admin` (label "Sekolah").
-- `school_viewer` (guru BK) dihapus agar tidak ada dua role yang perilakunya hampir sama.
-- Idempoten: aman dijalankan berulang.
UPDATE "assessment_org_members" SET "role" = 'school_admin' WHERE "role" = 'school_viewer';
--> statement-breakpoint
UPDATE "assessment_org_invites" SET "role" = 'school_admin' WHERE "role" = 'school_viewer';
--> statement-breakpoint
ALTER TABLE "assessment_org_invites" ALTER COLUMN "role" SET DEFAULT 'school_admin';
--> statement-breakpoint
UPDATE "user" SET "role" = 'school_admin' WHERE "role" = 'school_viewer';
--> statement-breakpoint
UPDATE "role"
SET "name" = 'Sekolah',
    "description" = 'Akun sekolah mitra B2B — kelola kelas, peserta, jadwal, tim, dan lihat hasil/laporan'
WHERE "id" = 'school_admin';
--> statement-breakpoint
DELETE FROM "role" WHERE "id" = 'school_viewer';
