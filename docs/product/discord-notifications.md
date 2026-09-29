# Discord Notifications (event penting)

Notifikasi event penting MULAI+ dikirim ke channel Discord via **webhook**.

## Event yang dikirim

| Event | Sumber | Throttle | Warna |
|---|---|---|---|
| `user.registered` — user baru daftar (email sign-up) | apps/server (`/api/auth/*`) | 0 (selalu) | oranye |
| `assessment.result_ready` — Tes Minat & Bakat selesai (kedua test) | packages/api (tmb `finish`) | 0 (selalu) | oranye |
| `mulai_ai.feedback_negative` — rating 👎 jawaban Mul.ai | apps/ai (chat `/feedback`) | 5 menit | merah |
| `mulai_ai.quota_exhausted` — kuota harian habis | apps/ai (route + stream) | 10 menit | kuning |

## Konfigurasi

1. Buat webhook di Discord: **Server Settings → Integrations → Webhooks → New Webhook**.
2. Set `DISCORD_WEBHOOK_URL` sebagai **secret** di api & ai worker (staging + prod).
   GOTCHA: `wrangler secret put` satu-per-satu bisa menghapus secret lain → selalu pakai
   `wrangler secret bulk` dan set **bersamaan** dengan secret yang sudah ada:

```bash
# dari apps/ai (menimpa semua secret — harus sertakan yang sudah ada!)
cd apps/ai
wrangler secret bulk --env staging - <<'JSON'
{"DISCORD_WEBHOOK_URL":"https://discord.com/api/webhooks/xxx","AI_API_KEY":"...","OPENAI_API_KEY":"..."}
JSON
```

```bash
# dari apps/server
cd apps/server
wrangler secret bulk --env staging - <<'JSON'
{"DISCORD_WEBHOOK_URL":"https://discord.com/api/webhooks/xxx"}
JSON
```

3. Lokal/`bun dev`: isi `DISCORD_WEBHOOK_URL` di `.dev.vars` (ai) / `.env` (server).

## Mekanik

- `packages/notify` (workspace `@mulai-plus/notify/discord`) — fire-and-forget,
  tidak pernah membuat request utama gagal; `ctx.waitUntil` saat tersedia.
- No-op otomatis jika webhook kosong / bukan URL Discord.
- Throttle per event disimpan in-memory (per isolate) — cukup untuk antispam,
  bukan anti-drop di multi-instance.

## Cara tes cepat

1. Register user baru via web (staging) → cek channel Discord.
2. Selesaikan Tes Minat & Bakat → embed "📊 Hasil Tes Minat & Bakat siap".
3. Klik 👎 di jawaban Mul.ai → embed "👎 Feedback negatif".