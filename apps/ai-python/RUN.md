# MULAI+ AI Service — Cara Run

## 1. Aktifkan Virtual Environment

```bash
cd apps/ai
source .venv/bin/activate
```

## 2. Jalankan Uvicorn

```bash
AI_API_KEY="test-key" python3 -m uvicorn src.main:app --port 8000
```

Atau kalau mau auto-reload (file berubah otomatis restart):

```bash
AI_API_KEY="test-key" python3 -m uvicorn src.main:app --port 8000 --reload
```

## 3. Cek apakah hidup

```bash
curl http://localhost:8000/health
# → {"status":"ok","service":"mulai-plus-ai","version":"0.3.0"}
```

## 4. Matikan

```bash
# Ctrl+C, atau:
lsof -ti:8000 | xargs kill -9
```

---

## Cheatsheet

### Test chat langsung

```bash
curl -s -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-key" \
  -d '{"message":"Cari universitas di Surabaya"}' | python3 -m json.tool
```

### Test lewat Hono proxy (web full stack)

Pastikan `bun run dev` jalan dengan env:

```bash
export AI_SERVICE_URL=http://localhost:8000
export AI_API_KEY=test-key
bun run dev
```

Lalu:

```bash
curl -s -X POST http://localhost:3001/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Halo"}' | python3 -m json.tool
```

### Cek stats admin

```bash
curl http://localhost:8000/api/admin/stats | python3 -m json.tool
```

### Install dependencies baru

```bash
source .venv/bin/activate
pip install <nama-package>
```

Atau update `pyproject.toml` lalu:

```bash
pip install .
```

## Readiness & Resilience (production)

- **Readiness check**: `GET /health/ready` (via proxy: `GET /ai/health/ready`) → `{"status":"ready", ...}`. 
  Dipakai uptime monitor / orchestrator; mengembalikan 503 jika koneksi DB gagal.
- **Liveness**: `GET /health` (tanpa auth).
- **Circuit breaker LLM**: setelah 2 kegagalan beruntun, permintaan chat dilayani pesan "sibuk" instan
  (tanpa menunggu timeout LLM 30s) selama maks 60 detik, lalu auto-coba lagi. Sukses mereset counter.
- **Graceful degradation**: error LLM tidak pernah jadi HTTP 500 — selalu balasan ramah + slot quota konsisten.
- **Timeout proxy (Hono)**: GET `/ai/*` 30s, POST `/ai/*` 60s — client widget punya timeout & retry sendiri.
- **Concurrency**: asyncpg pool max 10; rate limit per-IP di memory; tested 30 user konkuren × 3 pesan → 0 gagal.
- **Semaphore LLM**: maks 4 panggilan provider bersamaan (antrian sisanya) — proteksi provider dari overload.
- **Kapasitas terukur (provider gratis, model minimax-m3)**:
  - Cache hit (pertanyaan berulang): ~0.8s ✅ (mayoritas traffic)
  - 12 panggilan LLM fresh bersamaan: 0 error, latensi ~13–34s (provider pelan — batas di provider, bukan kode)
- **Rekomendasi skala produksi**: pakai provider berbayar/ber-throughput tinggi (ganti `OPENAI_BASE_URL` + `OPENAI_MODEL`)
  untuk memangkas latensi LLM 13–34s → ~2–5s. Cache + intent + circuit breaker + semaphore tetap berlaku apa pun providernya.
