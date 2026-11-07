-- Status sesi `abandoned`: tes TANPA timer yang ditinggalkan lebih dari N hari.
-- Tujuannya membersihkan funnel admin & mematikan tombol "Lanjutkan" pada sesi mati,
-- tanpa mengarang hasil dari jawaban parsial (siswa bisa mulai lagi dari awal).
ALTER TYPE "assessment_session_status" ADD VALUE IF NOT EXISTS 'abandoned';
