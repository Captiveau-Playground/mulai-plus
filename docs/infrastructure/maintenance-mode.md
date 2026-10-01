# Maintenance Mode (Runbook)

Sistem MULAI+ berjalan **Cloudflare Workers first** (web OpenNext, api, ai — semua via
custom domain di `mulaiplus.id`), plus VPS sebagai rollback. Maintenance saat update
major dilakukan **tanpa redeploy** di 3 lapis berikut.

## Ringkasan 3 lapis

| Lapis | Tujuan | Cara toggle | Waktu |
|---|---|---|---|
| **A. Halaman maintenance (web)** | `mulaiplus.id` menampilkan 503 branded | Swap **Custom Domain** ke worker `maintenance-mode` (Dashboard) | ~1–3 menit |
| **B. Gate API & AI** | `api.*`/`ai.*` balas 503 JSON | `wrangler secret put MAINTENANCE 1` — **hot, tanpa deploy** | <1 menit |
| **C. Banner lunak (opsional)** | Halaman tetap jalan, tapi fitur berat dinonaktifkan | Feature-flag | sesuai implementasi |

> Prinsip: **jangan pernah deploy fitur setengah-setengah**. Gunakan A+B untuk downtime
> total singkat, atau C kalau update tidak wajib mematikan semua.

---

## A. Web → halaman maintenance (route swap)

Worker `apps/maintenance` (sudah ada di repo):

```bash
cd apps/maintenance
bunx wrangler deploy        # nama: maintenance-mode, preview aktif
```

Lalu di **Cloudflare Dashboard** (atau `wrangler` untuk custom domains — saat ini
paling cepat lewat dashboard):

1. Workers & Pages → `maintenance-mode` → **Triggers → Custom Domains** → set `mulaiplus.id`.
2. Workers & Pages → `mulai-plus-web` → Triggers → Custom Domains → **hapus** `mulaiplus.id`.

**Buka maintenance** (undo): lakukan langkah 1 & 2 terbalik.

Catatan:
- Custom domain = DNS record yang menunjuk ke worker → perpindahan propagasi ±1–5 menit.
- Worker maintenance otomatis: HTML brand (logo MULAI+, badge, tombol status page),
  `<meta robots=noindex>`, header `Retry-After: 1800` & `Cache-Control: no-store`.
- Untuk `api.mulaiplus.id`: attach host itu ke worker yang sama — ia terdeteksi `host.includes("api.")` → balas **JSON 503** (klien & smoke test tetap bisa parse).

---

## B. Gate API & AI (secret hot-toggle)

Secret Workers bisa diubah **tanpa redeploy** dan langsung berlaku di request berikutnya.

1. Tambahkan gate di `apps/server/src/worker.ts` (awal handler):
   ```ts
   const env = c.env as Record<string, string | undefined>;
   if (env.MAINTENANCE === "1") {
     return c.json({ error: "maintenance", message: "Layanan sedang pemeliharaan." }, 503);
   }
   ```
   (sama untuk `apps/ai/src/index.ts` pada fetch ai worker).
2. Nyalakan:
   ```bash
   wrangler secret put MAINTENANCE --env staging   # isi: 1
   wrangler secret put MAINTENANCE --env production # isi: 1
   ```
3. Matikan: `wrangler secret delete MAINTENANCE --env …`.

⚠️ Mengingat insiden "secret put 1-secret menghapus yang lain": jika worker
sudah punya secret lain, **jangan pakai `secret put`** untuk worker yang sensitif —
gunakan `wrangler secret bulk` dengan seluruh daftar secret (seperti CI).
Untuk maintenance pakai selalu **secret bulk** agar aman.

---

## C. Banner lunak (soft maintenance, opsional)

Kalau update besar tapi tidak perlu downtime total:
- Tambah KV binding di web + env secret `SOFT_MAINTENANCE=1`.
- Web render **banner top** (mode from…) + nonaktifkan submit assessment/AI chat
  lewat flag yang sama; `api` tetap 200 untuk GET publik, 503/`feature_disabled` untuk mutasi.
- Ini mencegah "partial broken" selama rollout.

---

## Checklist saat maintenance

1. [ ] Info ke tim & update **status.mulaiplus.id** (status = "Maintenance").
2. [ ] Aktifkan gate API+AI (secret bulk) — **sebelum** lepas custom domain web.
3. [ ] Swap custom domain web → maintenance worker.
4. [ ] Smoke test: `curl -i https://mulaiplus.id` → 503 + HTML brand; `curl api.mulaiplus.id` → JSON 503; `curl https://status.mulaiplus.id` OK.
5. [ ] Lakukan deploy/update.
6. [ ] Undo: balikin custom domain web → `mulai-plus-web`; hapus/`delete` secret MAINTENANCE (bulk).
7. [ ] Smoke test lengkap (home, login, tes, AI, admin) + cek uptime monitor kembali hijau.

## Proteksi tambahan
- **CI guard**: workflow menolak deploy jika secret `MAINTENANCE=1` masih aktif (step check).
- **Rollback cepat**: 
  - Web/api/ai: re-deploy versi tag sebelumnya (`wrangler deploy --env production` pada commit terdahulu) — cache OpenNext bisa di-purge via `wrangler r2 object ...`/dashboard.
  - VPS: `docker compose -f docker-compose.staging.yml up -d --build` (fallback arsitektur lama).
- Worker maintenance punya `observability.enabled` — terlihat di dashboard CF.

---

## Referensi
- `apps/maintenance/` — worker halaman 503 (HTML + JSON otomatis).
- Status page: `status.mulaiplus.id` (badge dipakai di footer).
- Env guard pattern: `apps/server/src/worker.ts`, `apps/ai/src/index.ts`.