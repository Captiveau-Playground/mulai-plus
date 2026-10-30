-- Lanjutan 0043: soal `likert` (item MINAT) di TALENT juga dinonaktifkan pada
-- versi DRAFT/archived, bukan hanya live — supaya draft yang dirilis ulang tidak
-- memasukkan kembali dimensi bakat dengan soal minat. Idempoten.
UPDATE "questions" q
SET "is_active" = false
FROM "assessment_versions" v
JOIN "assessments" a ON a."id" = v."assessment_id"
WHERE q."version_id" = v."id"
  AND a."code" = 'TALENT'
  AND v."status" <> 'archived'
  AND q."question_type" = 'likert'
  AND q."is_active" = true;
