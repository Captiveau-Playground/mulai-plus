-- Timer per dimensi (permintaan analis #7): scope timer bisa diatur DI DALAM dimensi,
-- bukan hanya global. null = ikut config `timer_scope` global (perilaku lama).
ALTER TABLE "assessment_dimensions" ADD COLUMN IF NOT EXISTS "timer_scope" text;
