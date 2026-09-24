-- ════════════════════════════════════════════════════════════════════
-- Optimasi Disk I/O — MULAI+ (Supabase Free tier warning "Disk IO Budget").
--
-- Masalah: pencarian ILIKE '%..%' (chatbot + explore) full table scan
-- karena tidak ada index; `study_programs` di-scan 18k baris PER pertanyaan.
-- Solusi: pg_trgm + GIN (query planner bisa pakai index utk ILIKE %..%).
--
-- IDEMPOTENT (aman dijalankan berulang). Jalankan di staging & production.
-- ════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Pencarian nama universitas (chatbot + explore list/search)
CREATE INDEX IF NOT EXISTS idx_universities_name_trgm
  ON universities USING gin (name gin_trgm_ops) WHERE status = 'Aktif';
CREATE INDEX IF NOT EXISTS idx_universities_short_name_trgm
  ON universities USING gin (short_name gin_trgm_ops) WHERE status = 'Aktif';

-- Pencarian nama prodi — SCAN TERBESAR (~289ms → target <10ms)
CREATE INDEX IF NOT EXISTS idx_study_programs_name_trgm
  ON study_programs USING gin (name gin_trgm_ops) WHERE status = 'Aktif';

-- Listing/explore (ORDER BY name LIMIT tanpa ILIKE) — hilangkan seq scan+sort
CREATE INDEX IF NOT EXISTS idx_study_programs_name_btree
  ON study_programs (name) WHERE status = 'Aktif';
CREATE INDEX IF NOT EXISTS idx_universities_name_btree
  ON universities (name) WHERE status = 'Aktif';

-- Pencarian passing grade via pemetaan PDDikti (program name)
CREATE INDEX IF NOT EXISTS idx_program_mappings_pddikti_trgm
  ON program_mappings USING gin (pddikti_program_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_program_mappings_snpmb_trgm
  ON program_mappings USING gin (snpmb_program_name gin_trgm_ops);

-- Filter lokasi explore (kota/kabupaten & provinsi)
CREATE INDEX IF NOT EXISTS idx_universities_regency_trgm
  ON universities USING gin (regency gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_universities_province_trgm
  ON universities USING gin (province gin_trgm_ops);

-- Chat: history & quota per session (id DESC dalam satu session)
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_session_created
  ON chatbot_messages (session_id, id DESC);

-- audit_log (60MB, tanpa index → 955 seq scan baca 13jt baris)
CREATE INDEX IF NOT EXISTS idx_audit_log_user
  ON audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource
  ON audit_log (resource, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created
  ON audit_log (created_at DESC);

-- Refresh statistik planner
ANALYZE;