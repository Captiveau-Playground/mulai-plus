/**
 * Inisialisasi tabel ringan chatbot (events + rate_limits) — lazy, sekali per isolate.
 */
import type { AppContext } from "../config";
import { unsafe } from "./db";

let ensured = false;

export async function ensureAiTables(c: AppContext): Promise<void> {
  if (ensured) return;
  await unsafe(
    c,
    `CREATE TABLE IF NOT EXISTS chatbot_rate_limits (
       key TEXT PRIMARY KEY,
       bucket INTEGER NOT NULL,
       count INTEGER NOT NULL DEFAULT 0,
       updated_at TIMESTAMPTZ DEFAULT NOW()
     );
     CREATE TABLE IF NOT EXISTS chatbot_events (
       id SERIAL PRIMARY KEY,
       session_id TEXT,
       user_id TEXT,
       event TEXT NOT NULL,
       payload JSONB,
       created_at TIMESTAMPTZ DEFAULT NOW()
     );
     CREATE INDEX IF NOT EXISTS idx_chatbot_events_created ON chatbot_events(created_at);
     CREATE INDEX IF NOT EXISTS idx_chatbot_events_event ON chatbot_events(event);
     CREATE TABLE IF NOT EXISTS chatbot_cache (
       id SERIAL PRIMARY KEY,
       question_hash TEXT NOT NULL UNIQUE,
       question TEXT NOT NULL,
       question_normalized TEXT NOT NULL,
       answer TEXT NOT NULL,
       follow_ups JSONB,
       token_usage JSONB,
       hit_count INTEGER DEFAULT 1,
       last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
       created_at TIMESTAMPTZ DEFAULT NOW()
     );
     CREATE INDEX IF NOT EXISTS idx_chatbot_cache_hash ON chatbot_cache(question_hash);
     CREATE INDEX IF NOT EXISTS idx_chatbot_cache_hit ON chatbot_cache(hit_count DESC);
    ALTER TABLE chatbot_cache ADD COLUMN IF NOT EXISTS expires_at timestamptz;
    -- Versioning jawaban (branch / regenerate)
    ALTER TABLE chatbot_sessions ADD COLUMN IF NOT EXISTS title text;
    CREATE TABLE IF NOT EXISTS student_reco_profile (
      user_id text NOT NULL PRIMARY KEY,
      riasec_primary text,
      riasec_vector jsonb,
      ability jsonb,
      goals jsonb,
      prefs jsonb,
      interests_signals jsonb,
      last_active timestamptz,
      created_at timestamptz DEFAULT now() NOT NULL,
      updated_at timestamptz DEFAULT now() NOT NULL
    );
    ALTER TABLE chatbot_messages ADD COLUMN IF NOT EXISTS branch_group text;
    ALTER TABLE chatbot_messages ADD COLUMN IF NOT EXISTS superseded boolean NOT NULL DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_chatbot_messages_branch ON chatbot_messages(session_id, branch_group, superseded);`,
  ).catch((e) => console.error("[db] ensureAiTables:", (e as Error).message));
  ensured = true;
}
