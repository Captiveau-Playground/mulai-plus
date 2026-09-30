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

-- ═══ CMS (blog/list article) ═══
-- Pencarian judul/ekserp di admin & filter status publik
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cms_article_title_trgm
  ON cms_article USING gin (title gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cms_article_status_pub
  ON cms_article (status, published_at DESC);

-- ═══ Feedback (mentee→mentor & admin list) ═══
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feedback_response_to_user
  ON feedback_response (to_user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feedback_response_campaign
  ON feedback_response (campaign_id, created_at DESC);

-- ═══ Program (dashboard student/mentor/admin — pertumbuhan utama) ═══
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_program_application_batch_status
  ON program_application (batch_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_program_session_batch
  ON program_session (batch_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_program_session_mentor_status
  ON program_session (mentor_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_program_participant_user
  ON program_participant (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_program_participant_batch
  ON program_participant (batch_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_program_attendance_user
  ON program_attendance (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_program_attendance_batch
  ON program_attendance (batch_id);

-- ═══ TMB (admin sekolah/batch/student) ═══
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tmb_batches_school
  ON tmb_batches (school_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tmb_batch_students_user
  ON tmb_batch_students (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tmb_batch_students_status
  ON tmb_batch_students (status);

-- ═══ Notifikasi & user ═══
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_user_read
  ON notification (user_id, read);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_role_name
  ON "user" (role, name);

-- ═══ CMS (list admin sort updated_at) ═══
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cms_article_status_updated
  ON cms_article (status, updated_at DESC);

-- ═══ E-Sign ═══
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_esign_document
  ON esign_signature (document_id);

-- ═══ LMS (list kursus publik & admin) ═══
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_published_created
  ON course (published, created_at DESC);

-- Slow query snapshot (pg_stat_statements) — aktif di Supabase (shared_preload).
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Explore: GROUP BY name + ILIKE (query 24-38s di Supabase panel)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_study_programs_name_lower
  ON study_programs (lower(name), status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_universities_name_lower
  ON universities (lower(name)) WHERE status = 'Aktif';
-- Session token lookup (better-auth 304x/hari)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_token
  ON session (token);

-- Refresh statistik planner
ANALYZE;