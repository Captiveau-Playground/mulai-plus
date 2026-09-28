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
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_universities_name_trgm
  ON universities USING gin (name gin_trgm_ops) WHERE status = 'Aktif';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_universities_short_name_trgm
  ON universities USING gin (short_name gin_trgm_ops) WHERE status = 'Aktif';

-- Pencarian nama prodi — SCAN TERBESAR (~289ms → target <10ms)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_study_programs_name_trgm
  ON study_programs USING gin (name gin_trgm_ops) WHERE status = 'Aktif';

-- Listing/explore (ORDER BY name LIMIT tanpa ILIKE) — hilangkan seq scan+sort
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_study_programs_name_btree
  ON study_programs (name) WHERE status = 'Aktif';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_universities_name_btree
  ON universities (name) WHERE status = 'Aktif';

-- Pencarian passing grade via pemetaan PDDikti (program name)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_program_mappings_pddikti_trgm
  ON program_mappings USING gin (pddikti_program_name gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_program_mappings_snpmb_trgm
  ON program_mappings USING gin (snpmb_program_name gin_trgm_ops);

-- Filter lokasi explore (kota/kabupaten & provinsi)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_universities_regency_trgm
  ON universities USING gin (regency gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_universities_province_trgm
  ON universities USING gin (province gin_trgm_ops);

-- Chat: history & quota per session (id DESC dalam satu session)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chatbot_messages_session_created
  ON chatbot_messages (session_id, id DESC);

-- audit_log (60MB, tanpa index → 955 seq scan baca 13jt baris)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_user
  ON audit_log (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_resource
  ON audit_log (resource, resource_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_created
  ON audit_log (created_at DESC);

-- ═══ Chatbot (AI Assistant) ═══
-- Sidebar sessions per user + banned check (dipakai tiap render sidebar)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chatbot_sessions_user_active
  ON chatbot_sessions (user_id, last_active DESC);
-- Analytics admin: trender harian/jam & KPI (chatbot_messages.created_at)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chatbot_messages_created
  ON chatbot_messages (created_at);
-- KPI feedback 👍👎 (COUNT WHERE role='assistant' AND feedback='up/down')
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chatbot_messages_role_feedback
  ON chatbot_messages (role, feedback);
-- Histori panjang: sudah ada (session_id, id DESC)

-- ═══ Tes Minat & Bakat ═══
-- computeResult & admin: jawaban per attempt
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tmb_test_answers_attempt
  ON tmb_test_answers (attempt_id);
-- status/lanjutan tes per user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tmb_test_attempts_user
  ON tmb_test_attempts (user_id, test_code, status);

-- ═══ Program (dashboard student/mentor/admin) ═══
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_program_application_user
  ON program_application (user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_program_batch_mentor_user
  ON program_batch_mentor (user_id, assigned_at DESC);

-- Refresh statistik planner
ANALYZE;