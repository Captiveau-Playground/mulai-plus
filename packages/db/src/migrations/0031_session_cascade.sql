-- Hapus tes jadi SATU query: sesi ikut terhapus saat versinya dihapus.
-- Sebelumnya FK ini NO ACTION sehingga removeAssessment harus menghapus sesi
-- (dan jawaban/hasil/skor) baris demi baris → ratusan query → menembus batas
-- subrequest/CPU Worker (temuan analis #6: "Delete Assessment tidak berfungsi").
ALTER TABLE "assessment_sessions"
  DROP CONSTRAINT IF EXISTS "assessment_sessions_version_id_assessment_versions_id_fk";
ALTER TABLE "assessment_sessions"
  ADD CONSTRAINT "assessment_sessions_version_id_assessment_versions_id_fk"
  FOREIGN KEY ("version_id") REFERENCES "assessment_versions"("id") ON DELETE CASCADE;
