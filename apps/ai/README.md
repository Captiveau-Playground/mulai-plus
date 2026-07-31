# 🤖 MULAI+ AI Service — Chatbot Engine

FastAPI service untuk chatbot MULAI+. Menangani LLM chat, tool calling (universitas, prodi, passing grade), answer caching, session management, dan feedback.

## Arsitektur

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                                │
│  chatbot-widget.tsx                                                      │
│  ├── fetch(API_ENDPOINT) → POST /ai/chat  (SSE streaming)              │
│  ├── fetch(/ai/quota)    → GET /ai/quota   (sisa chat)                  │
│  ├── fetch(/ai/history)  → GET /ai/history (riwayat chat)               │
│  ├── fetch(/ai/feedback) → POST feedback (thumbs up/down)              │
│  └── fetch(/ai/track/...) → POST tracking                               │
└──────────────────────────┬───────────────────────────────────────────────┘
                           │ POST /ai/chat (x-session-id)
                           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   SERVER PROXY (Hono)                                    │
│  apps/server/src/index.ts                                               │
│  ├── CORS middleware                                                     │
│  ├── requireAdmin middleware (/ai/admin/*)                              │
│  ├── Public proxy (/ai/*) → forward ke AI service                       │
│  └── Forward: x-user-id, x-session-id, Authorization: Bearer            │
└──────────────────────────┬───────────────────────────────────────────────┘
                           │ http://ai:8000/api/chat
                           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    AI SERVICE (FastAPI / Python)                         │
│                                                                          │
│  routes.py                         cache.py                             │
│  ┌──────────────────────┐          ┌──────────────────┐                │
│  │ POST /api/chat       │          │ Exact match      │                │
│  │  ├─ Check cache  ────┼─ HIT ──▶│ (SHA256 hash)    │                │
│  │  ├─ (if miss) quota │  │        ├──────────────────┤                │
│  │  ├─ Call LLM       │  │        │ Fuzzy match      │                │
│  │  ├─ Save messages  │  │        │ (token overlap + │                │
│  │  └─ SSE response   │  │        │  SequenceMatcher,│                │
│  │                     │  │        │  threshold 0.82) │                │
│  │ GET  /api/quota     │  │        ├──────────────────┤                │
│  │ GET  /api/history   │  │        │ LFU/LRU eviction │                │
│  │ POST /api/feedback  │  │        │ (max 1000 entry) │                │
│  │ POST /api/lead      │  │        └──────────────────┘                │
│  └──────────────────────┘                                              │
│                                                                          │
│  engine/responder.py                                                     │
│  ┌─────────────────────────────────────────────────────┐               │
│  │ 1. Build messages (system prompt + history + user)  │               │
│  │ 2. Call LLM (AsyncOpenAI with tool calling)          │               │
│  │ 3. Process tool calls (search_universities, etc.)   │               │
│  │ 4. Call LLM again with tool results                  │               │
│  │ 5. Extract follow-up topics from response            │               │
│  │ 6. Return (reply, follow_ups, token_usage)          │               │
│  └─────────────────────────────────────────────────────┘               │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Struktur File

```
apps/ai/
├── src/
│   ├── main.py           # FastAPI app, CORS, auth middleware, startup
│   ├── routes.py         # API endpoints: chat, quota, history, admin sessions
│   ├── config.py         # Settings (env vars)
│   ├── schemas.py        # Pydantic models (request/response validation)
│   ├── db.py             # DB pool + read-only query helper (tools)
│   ├── chatbot_db.py     # Session, message, feedback, admin DB operations
│   ├── cache.py          # Answer cache: exact + fuzzy match, LFU/LRU
│   ├── tools.py          # LLM tool definitions & handlers (search DB)
│   └── engine/
│       └── responder.py  # LLM wrapper (AsyncOpenAI, tool calling, cost)
├── tests/
│   ├── test_cache.py     # 13 tests (normalize, similarity)
│   ├── test_responder.py # 13 tests (topics, cost, fallback)
│   └── test_schemas.py   # 17 tests (Pydantic validation)
├── requirements.txt
└── README.md             # ← ini
```

---

## Flow Chat — Skenario

### 🟢 Skenario 1: Chat Pertama (Guest, cache miss)

```
User: "Cari universitas negeri di Jakarta"
       ↓
Widget: generate session_id → localStorage
       ↓
Widget: POST /ai/chat (header: x-session-id)
       ↓
Server: forward ke AI Service (Authorization: Bearer + x-session-id)
       ↓
AI Service:
  1. get_or_create_session → session baru (message_count=0)
  2. cache.get_cached_answer → MISS (pertanyaan pertama)
  3. _check_session_allowed → GUEST_LIMIT=1, 0 < 1 → OK
  4. get_history → []
  5. get_response() → LLM call + tool calling
     ├─ SYSTEM_PROMPT + user message
     ├─ LLM decides: perlu data real-time?
     │   YES → call search_universities("Jakarta")
     │   │    → DB query → format hasil
     │   │    → LLM response with results
     │   NO  → langsung jawab dari pengetahuan
     ├─ content = "Berikut universitas negeri di Jakarta: UI, UNJ..."
     └─ follow_ups = ["Info passing grade UI", "Jurusan favorit", ...]
  6. cache.set_cached_answer() → simpan
  7. save_message (user + assistant)
  8. increment_message_count → 1/1
  9. return SSE stream
       ↓
Widget: terima SSE → streaming typewriter → tampilkan
        sisa quota = 0
```

**Hasil:** ✅ Chat sukses, jawaban tampil. Cache terisi, quota guest habis.

---

### 🟢 Skenario 2: Chat Kedua (Guest, cache HIT — pertanyaan mirip)

```
User: "Universitas negeri Jakarta"
       ↓
AI Service:
  1. cache.get_cached_answer → HIT (fuzzy match 0.85 ≥ 0.82)
     └─ langsung return SSE tanpa LLM, tanpa quota check
         (jawaban dari chat pertama)
       ↓
Widget: tampilkan jawaban instan (< 50ms)
```

**Hasil:** ✅ Langsung balas dari cache. Gak kena quota, gak kena LLM cost.

---

### 🟡 Skenario 3: Quota Guest Habis (pertanyaan beda)

```
User: "Info beasiswa LPDP"
       ↓
AI Service:
  1. cache.get_cached_answer → MISS
  2. quota check: message_count(1) >= GUEST_LIMIT(1) → HABIS
  3. return JSON {"reply": "Kamu sudah menggunakan chat gratis!...", "requires_auth": true}
       ↓
Widget: lihat contentType = application/json
        tampilkan AUTH_GATE → button "Login / Daftar Gratis"
        klik → redirect ke /login?callbackUrl=...
```

**Hasil:** ✅ User diarahkan login. Data click tercatat (`/ai/track/login-click`).

---

### 🟡 Skenario 4: Auth user dengan quota override

```
User: "Program mentoring" (login, quota 5 habis)
       ↓
AI Service:
  1. x-user-id terdeteksi → is_auth = True
  2. get_active_limit → cek credit_limit di session
     ├─ admin set credit_limit = 10 → pakai 10
     └─ admin set -1 → unlimited
```

**Hasil:** ✅ Admin override limit via `PUT /api/admin/sessions/{id}/credit`.

---

### 🔴 Skenario 5: User kena ban

```
User: "Halo"
       ↓
AI Service:
  1. is_banned → TRUE
  2. return {"reply": "Akun kamu telah dibatasi..."}
```

**Hasil:** ✅ User diblokir. Admin unban via Portainer.

---

### 🔴 Skenario 6: LLM error / timeout

```
User: "Cari prodi teknik"
       ↓
get_response → AsyncOpenAI timeout (30s) → Exception
       ↓
catch → random.choice(FALLBACK_REPLIES)
  └─ "Maaf, layanan sedang sibuk..." + 3 suggestions
```

**Hasil:** ✅ Graceful fallback.

---

### 🔴 Skenario 7: Invalid input

```
User: "" (empty)
       ↓
FastAPI: Pydantic ValidationError → 422
       ↓
Widget: catch → tampilkan "Maaf, terjadi kesalahan"
```

**Hasil:** ❌ Request ditolak. Widget tampilkan error.

---

### 🔴 Skenario 8: Cache / DB down

```
User: "Info UI"
       ↓
cache.get_cached_answer error (DB timeout)
       ↓
Exception → skip cache, langsung call LLM
```

**Hasil:** ✅ Graceful degradation. Cache offline → fallback ke LLM.

---

## State Machine Widget

```
                    ┌──────────────────────────┐
                    │         IDLE             │
                    │  (menunggu input)         │
                    └─────┬────────────────────┘
                          │ user mengirim chat
                          ▼
                    ┌──────────────────────────┐
                    │        LOADING           │
                    │  (spinner + "Mengetik...")│
                    └─────┬────────────────────┘
                          │
              ┌───────────┼───────────┐
              │           │           │
              ▼           ▼           ▼
    ┌──────────────┐ ┌──────────┐ ┌──────────┐
    │  SSE STREAM  │ │ JSON 200 │ │ ERROR    │
    │ (text/event- │ │(quota    │ │(fetch    │
    │  stream)     │ │ habis)   │ │ gagal)   │
    └──────┬───────┘ └────┬─────┘ └────┬─────┘
           │              │            │
           ▼              ▼            ▼
    ┌──────────────┐ ┌──────────┐ ┌──────────┐
    │ TAMPILKAN    │ │ AUTH     │ │ TAMPILKAN│
    │ + typewriter │ │ GATE     │ │ ERROR    │
    │ + follow-up  │ │ (login)  │ │ MESSAGE  │
    └──────┬───────┘ └──────────┘ └──────────┘
           │
           ▼
    ┌──────────────┐
    │    IDLE      │
    └──────────────┘
```

---

## Kunci Performa

| Aspek | Strategi |
|-------|----------|
| **Cache** | Exact match (SHA256) + fuzzy (token overlap + SequenceMatcher, threshold 0.82) |
| **Eviction** | LFU (hit_count ASC) + LRU (last_accessed_at ASC). Max 1000 entries |
| **Quota** | Cache HIT tidak kena quota. Guest limit 1, auth limit 5 (admin override) |
| **LLM** | `AsyncOpenAI` timeout 30s, max_retries 1. Follow-up dari response, bukan LLM call baru |
| **Error** | 3 fallback random. Graceful degradation tiap layer |

---

## Setup & Test

```bash
# Setup
cd apps/ai
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# Run (development)
AI_API_KEY=test-key .venv/bin/uvicorn src.main:app --host 0.0.0.0 --port 8000

# Test
.venv/bin/python3 -m pytest tests/ -v
# 43 tests: cache (13), responder (13), schemas (17)
```

### Environment Variables

| Variable | Default | Keterangan |
|----------|---------|------------|
| `AI_API_KEY` | `""` | Shared secret. Wajib diset, kalo kosong semua request 503 |
| `AI_HOST` | `0.0.0.0` | Bind address |
| `AI_PORT` | `8000` | Port |
| `DATABASE_URL` | – | PostgreSQL connection string |
| `OPENAI_API_KEY` | – | API key LLM provider |
| `OPENAI_BASE_URL` | `https://opencode.ai/zen/go/v1` | LLM endpoint |
| `OPENAI_MODEL` | `deepseek-v4-flash` | Model name |
| `CORS_ORIGIN` | `http://localhost:3001` | Frontend URL untuk CORS |

### Docker

```bash
# Build
docker build -t mulai-ai:local .

# Run
docker run -p 8000:8000 --env-file .env mulai-ai:local
```
