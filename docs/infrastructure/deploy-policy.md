# Kebijakan Deploy — WAJIB CI/CD

> Berlaku mulai 2026-09-28. Melanggar = incident.
> Alasan: deploy manual pernah membuat prod down (R2 secret dihapus sebelum kode
> pendukung di-deploy → worker boot crash, error 1105/503).

## Aturan emas
1. **Tidak ada deploy manual.** `wrangler deploy`, `wrangler secret bulk/put/delete`,
   `wrangler rollback`, publish pages/dll → **TIDAK dijalankan oleh agent/manual**.
2. Semua perubahan (kode, config, wrangler.toml/jsonc, secrets) masuk branch → **merge** →
   CI yang membaca workflow (`.github/workflows/staging.yml`, `production.yml`).
3. Urutan di CI selalu: **staging → smoke → prod → smoke prod** (api lebih dulu, baru smoke AI/web).
4. Deploy produksi hanya terjadi dari **merge ke master/main**, bukan dari branch kerja.

## Yang boleh dilakukan agent
- Eksekusi perintah **read-only** & **dry-run** (`wrangler deploy --dry-run`,
  `wrangler deployments list`, `secret list`, `r2 object get/--remote` utk verifikasi).
- Test HTTP ke staging/prod (GET, POST public) — **tanpa menulis data produksi**.
- Mengubah file konfigurasi di repo (wrangler.toml/jsonc, env example, docs) → masuk commit/PR.

## Checklist untuk aksi yang "terlihat seperti deploy"
| Aksi | Via CI? | Catatan |
|---|---|---|
| Deploy web/api/ai (staging) | ✅ otomatis saat merge branch → workflow staging | |
| Deploy web/api/ai (prod) | ✅ otomatis saat merge ke master | CI urut API→smoke |
| Set/ubah secret worker | ❌ WAJIB lewat workflow secret-bulk di CI (atomik, tidak hapus secret lain) | Jangan `secret put` manual 1-per-1 |
| Hapus secret lama | ❌ hanya jika kode yang memakainya sudah ter-deploy duluan di CI | Contoh kesalahan: R2 secret dihapus sebelum binding kode live |
| Rollback worker | ❌ hanya via task/konfirmasi user + dokumentasi | |

## Alur pengamatan error (jangan langsung "memperbaiki" dengan deploy)
1. Identifikasi: `deployments list`, `secret list`, body respons (1105 = boot crash).
2. Cek apakah penyebabnya konfigurasi repo (commit ✓?) atau environment.
3. Kalau harus rollback/pulihkan runtime: **konfirmasi ke user dulu**, catat ID versi, lalu lakukan SEGERA & laporkan — dan segera buat fix yang benar lewat CI.

## Catatan kondisi saat ini (2026-09-28)
- Prod: kode lama (belum binding R2). Secrets R2 prod dipulihkan — **jangan dihapus manual** sampai
  prod ter-deploy dengan kode binding (merge+CI). Setelah itu boleh dihapus **via CI task**.
- Staging: kode terbaru (binding R2) sudah pernah di-deploy manual sebelum kebijakan; ke depan staging
  ikut alur CI saja.