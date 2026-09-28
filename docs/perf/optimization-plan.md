# Plan Optimasi & Performansi — MULAI+

> Status: **aktif** (sesuai audit 2026-09). Dokumen ini adalah sumber kebenaran untuk pekerjaan
> performa/DB. Setiap item punya: prioritas, dampak, usaha, risiko, dan pemicu kapan dikerjakan.

## 1. Ringkasan kondisi saat ini

### Sudah selesai (kode + DB live di staging)

| Area | Yang dikerjakan | Bukti |
|---|---|---|
| Hot path pencarian explore | `pg_trgm` + GIN/btree di `universities` & `study_programs` | optimize-io.sql |
| Detail universitas | N+1 → 5 query batch (`getUniversity`) | pddikti.ts |
| Sidebar chat Mul.ai | correlated COUNT buang (pakai `message_count`), history limit 500 | chat-store.ts |
| Admin analytics AI | index `created_at`, `(role,feedback)`; interval tsb dipakai semua chart | optimize-io.sql |
| TMB computeResult | cache daftar prodi 24 jam (18k baris) | tmb.ts |
| TMB admin sekolah | muat-semua-ke-JS → `GROUP BY` DB | tmb.ts |
| Feedback | limit 500 + index `(to_user,created)` & `(campaign,created)` | feedback.ts |
| Picker testimonial | `listStudents` wajib limit 200 + search server-side | user.ts |
| Program/LMS list | limits + index komposit (application/session/participant/attendance/course) | programs.ts, lms.ts |
| Audit log | insert fire-and-forget (login tak nunggu I/O) + `AUDIT_LOG_DISABLED` utk dev | audit-plugin.ts |
| Index builder | per-statement + `CONCURRENTLY` + `statement_timeout=0` (anti-macet saat Supabase throttle) | optimize-io.ts |

### Pelajaran operasional (penting)
- **Supabase Disk I/O Budget** bisa throttle seluruh DB (insert 10 menit!) — bukan bug kode.
  Monitor dashboard Supabase; jangan bangun index/query berat saat budget habis atau peak.
- Index dibangun dgn `CREATE INDEX CONCURRENTLY` → tidak memblokir write.
- `wrangler secret bulk` utk semua secret (yang `put` satu-per-satu bisa menghapus secret lain).

## 2. Roadmap (dari nilai/risiko tertinggi)

### Fase A — Segera (quick wins, risiko rendah)

| # | Item | Dampak | Usaha | Cara |
|---|---|---|---|---|
| A1 | **Cache KV utk list publik explore** (`publicListUniversities`, passing grade populer) | Tinggi (halaman paling sering dibuka) | S | Cache di `KV_CACHE` worker api (TTL 5–15 mnt), invalidasi saat import |
| A2 | **ISR/revalidate halaman explore** (web) | Tinggi | S | `revalidate=300` + `generateStaticParams` utk detail populer |
| A3 | **Prune terjadwal** `audit_log` (retensi 180→90 hari) & `snbt_applicant_provinces` legacy | Sedang (I/O budget) | S | cron server (sudah ada `cron.ts`) + `prune:io`; nonblok frá audit sudah aman |
| A4 | **`pg_stat_statements`** aktif + snapshot 1×/hari (query lambat 10 besar) | Sedang (visibilitas) | S | Supabase: cek ekstensi; cron kirim ke Sentry/Discord |
| A5 | **Cache `getUniversity` detail** di KV (TTL 1 jam, purge saat admin edit) | Sedang | S | kv-cache.ts sudah ada pola rpc |

### Fase B — Setelah data tumbuh (threshold-driven)

| # | Item | Pemicu | Solusi |
|---|---|---|---|
| B1 | Tabel transaksional besar | `chatbot_messages` > 500k baris | **Partisi by bulan** `created_at` (chat, events, answers) |
| B2 | `audit_log` > 500 MB | retensi dirombak | Arsip (R2) + truncate partisi lama; jangan simpan detail JSON berlebihan |
| B3 | `program_*` & `feedback_response` jutaan | query admin lambat | Pastikan hanya list ter-indeks dipakai; dashboard pakai **materialized summary mingguan** |
| B4 | Read-heavy public | puncak > 50 RPS | **Cache edge (KV) penuh utk explore/blog**; pertimbangkan read replica utk admin OLAP |
| B5 | TMB besar | attempt per user tinggi | Partisi `tmb_test_answers` by attempt_id + archive hasil lama |

### Fase C — Skala lanjut (opsional, butuh keputusan infra)

| # | Item | Catatan |
|---|---|---|
| C1 | **Read replica / analytic DB** utk halaman admin (trend, feedback, OLAP AI) | Route query berat ke replica; worker Admin pakai Hyperdrive ke replica |
| C2 | **Partisi + archive R2** untuk `chatbot_events` (analytics AI) | 3 bulan aktif, sisanya ke R2 Parquet (analisis batch) |
| C3 | **Queue utk side-effect tulis** (audit dsb) | Bila throttle I/O berulang: kirim via Queue, worker tulis batch |

## 3. Praktik baku untuk kode baru (kontrak performa)

1. **Setiap `findMany` di tabel yang bisa besar wajib**: `limit` (+ `paginationSchema` kalau produk butuh semua).
2. **N+1 dilarang**: relasi `with:` boleh, tapi jangan query per-row di loop — `inArray` + `Promise.all`.
3. **Filter yang dipakai di hot path wajib punya index** (cek daftar index di optimize-io.sql).
4. **`count(*)` tanpa filter** hanya utk KPI dashboard (toleransi), bukan utk UX.
5. Keluarkan query berat dari request path → cache (KV/in-memory) atau background.
6. Side-effect tulis (audit, logging) **fire-and-forget** + `waitUntil`.
7. Index baru: selalu `CREATE INDEX CONCURRENTLY` + `statement_timeout=0` + idempoten.
8. Perubahan skema besar: sebelum & sesudah **ukur** (lihat metrik di bawah).

## 4. Metrik & monitoring

### Wajib dipantau (SIEM/alert)
| Metrik | Ambang | Aksi |
|---|---|---|
| **Disk I/O Budget Supabase** | >80% / merah | hentikan job berat; kurangi retensi; upgrade |
| **Query > 500 ms** (pg_stat_statements) | > 5 query berbeda per hari | review + index/patch |
| **P99 API latency** (Sentry/CF analytics per route) | > 2 s pada rpc utama | tracing → item roadmap |
| **Errors 5xx worker** | naik >2× baseline | alert Discord (sudah ada webhook) |
| **Chat/Mul.ai P95 stream** | > 8 s | cek model/cache hit-rate |

### Benchmark saat ada perubahan besar
- Script: `packages/db` + worker smoke (eksisting di CI).
- Ukur sebelum/sesudah: `EXPLAIN ANALYZE` pada query yang diubah; catat plan (`Seq Scan`/`Index Scan` + est/cost).
- Simpan hasil di `docs/perf/benchmarks/*.md`.

## 5. Runbook — insiden lambat

1. Cek **pg_stat_activity**: ada query > 60 s? (INSERT audit lama → indikasi throttle budget)
2. Cek **Supabase dashboard → Disk I/O Budget**. Kalau merah: tunggu reset / kurangi beban / upgrade.
3. Cek **slow query** (pg_stat_statements) → patch index/query (pakai CONCURRENTLY).
4. Cek cache-hit `/quota`, `/history` Mul.ai & explore.
5. Result: catat di changelog + benchmark.

## 6. Backlog yang butuh keputusan user

- [ ] A1–A2: utamakan cache explore publik (perlu sampling traffic/konversi).
- [ ] B5/E-Sign: index `document_id` sudah ada — ok.
- [ ] C1: mau investasi read-replica? (butuh biaya Supabase / planning)
- [ ] Retensi `chatbot_events` (analytics AI) — tetapkan 3 bulan? 6?