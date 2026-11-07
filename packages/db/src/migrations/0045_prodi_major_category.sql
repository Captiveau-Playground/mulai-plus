-- Kategori jurusan TMB per prodi (hasil pencocokan Pola Jurusan).
-- Tujuan: `computeRecommendations()` cukup membaca kolom ini (O(n), tanpa regex)
-- sehingga `discover/finish` tidak membakar CPU Worker.
ALTER TABLE "study_programs" ADD COLUMN IF NOT EXISTS "major_category_key" text;
CREATE INDEX IF NOT EXISTS "idx_study_programs_major_category" ON "study_programs" ("major_category_key");
