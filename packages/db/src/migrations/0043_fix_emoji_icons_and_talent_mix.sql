-- (F07 soal) Dua perbaikan data hasil audit render soal:
--  1) opsi mode `emoji_option` yang belum punya ikon → isi skala emoji default
--     (sebelumnya siswa hanya melihat label teks, tanpa emoji animasi).
--  2) TALENT (tes bakat/kemampuan) tidak boleh memuat soal `likert` (itu item
--     minat, milik DISCOVER) → nonaktifkan agar dimensi tidak tercampur.
-- Idempoten.
UPDATE "question_options" o
SET "icon" = (ARRAY['😖', '🙁', '😐', '🙂', '😄'])[LEAST(GREATEST(o."display_order", 0), 4) + 1]
FROM "questions" q
WHERE q."id" = o."question_id"
  AND q."presentation_mode" = 'emoji_option'
  AND (o."icon" IS NULL OR btrim(o."icon") = '');
--> statement-breakpoint
UPDATE "questions" q
SET "is_active" = false
FROM "assessment_versions" v
JOIN "assessments" a ON a."id" = v."assessment_id"
WHERE q."version_id" = v."id"
  AND a."code" = 'TALENT'
  AND v."status" = 'live'
  AND q."question_type" = 'likert'
  AND q."is_active" = true;
