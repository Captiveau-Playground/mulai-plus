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
