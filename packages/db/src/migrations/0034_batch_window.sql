-- (M2.3) Jadwal/window tes per kelas (B2B).
-- Di luar rentang [window_start, window_end] siswa tidak bisa MEMULAI tes;
-- yang sudah mulai tetap boleh menyelesaikan (jawaban tidak hilang).
ALTER TABLE "tmb_batches" ADD COLUMN IF NOT EXISTS "schedule_mode" text DEFAULT 'anytime';
ALTER TABLE "tmb_batches" ADD COLUMN IF NOT EXISTS "window_start" timestamp;
ALTER TABLE "tmb_batches" ADD COLUMN IF NOT EXISTS "window_end" timestamp;
