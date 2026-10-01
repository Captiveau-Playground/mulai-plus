# Migrasi Supabase → Neon (Launch Plan)

> Status: **CUTOVER LIVE (2026-10-01)** — staging & production keduanya di Neon.
> ✅ Dump+restore S→N verified (staging: user 74 · prod: user 189 · prodi 18.881 · audit 36.227; pg_trgm+GIN).
> ✅ Hyperdrive: staging `f98f19a5…` (mulai-plus-neon-staging) · prod `86e18616…` (mulai-plus-neon-production), wired & DEPLOYED api+ai (staging+prod).
> ✅ Smoke: /health 200, /ai/health 200, `/rpc/features/get` = `{"json":{"chatbot_enabled":false}}` — match DB Neon langsung (bukan cache).
> ⏳ MENUNGGU USER: ① CI GH secret `DATABASE_URL` → Neon pooled (staging & prod), ② reset password Neon (URL sempat bocor di chat), ③ smoke E2E lengkap user barisan.
> Tujuan: keluar dari bottleneck Supabase staging (CPU/Disk IO 100%, churn koneksi)
> dan dapat fitur Launch Plan: pooler, branch, autoscaling, read replica.

---

## 1. Arsitektur target

```
Lokal/VPS/CI (bun)  ── DATABASE_URL (pooled -pooler) ─────────────▶ Neon
Workers (api/ai)    ── Hyperdrive binding ─────────────────────────▶ Neon
        └─ Hyperdrive pooling + query caching            └─ pooler / primary
```

Peta koneksi di repo:
| Jalur | File | Nilai sekarang |
|---|---|---|
| Bun (lokal/VPS/CI script) | `DATABASE_URL` env (`.dev.vars`, CI, VPS) | Supabase (`postgresql://…supabase.co`) |
| Worker api | `apps/server/wrangler.toml` → `[[env.*.hyperdrive]] id=` | staging `5d214aea…` / prod `42a918a4…` |
| Worker ai | `apps/ai/wrangler.jsonc` → `hyperdrive.id=` (staging & prod) | id Hyperdrive lama |
| Schema | `drizzle-kit push` (CI `db:push -- --force`) + `optimize:io` | — |

`DATABASE_URL` di worker **tidak dipakai untuk koneksi** (hanya placeholder validasi env) — yang dipakai **Hyperdrive**.
Jadi urutan aman: **(1) flip Hyperdrive → Neon dulu, (2) flip DATABASE_URL untuk bun/CI/VPS.**

---

## 2. Persiapan di Neon (kamu lakukan, perlu UI Neon)

1. Buat project: region setahun terdekat (pilih sesuai audiens; mis. **Singapore** jika tersedia, else `us-east`).
   - Aktifkan **Launch plan**: autoscaling min/max (mis. 0.25–2 vCPU), **Pooled connection** (`-pooler` endpoint).
2. Catat 2 connection string dari dashboard:
   - `NEON_PRIMARY` — unpooled, tanpa `-pooler` (buat Hyperdrive / restore).
   - `NEON_POOLED` — dengan `-pooler` + `sslmode=require` (buat Bun/CI/VPS).
3. (Opsional) buat **branch `staging`** → isi staging worker pakai branch itu (fitur Launch).
4. Serahkan ke gue: `NEON_PRIMARY` & `NEON_POOLED` (redaksi password), region.

> ⚠️ Jangan commit connection string ke repo — pakai `.env.neon.local` / secret.

---

## 3. Dump & restore (data)

Jalankan dari lokal (Bun) — butuh `pg_dump`/`psql` (via `brew install libpq` atau pakai container):

```bash
# 1) Dump Supabase (schema public saja + data; tanpa owner/priv)
pg_dump "$SUPABASE_URL" \
  --schema=public --no-owner --no-privileges \
  --format=custom -f supabase-public.dump

# 2) Restore ke Neon (PRIMARY endpoint — bukan pooler)
createdb "$NEON_PRIMARY" 2>/dev/null || true
pg_restore --dbname "$NEON_PRIMARY" --no-owner \
  --no-privileges --exit-on-error supabase-public.dump

# 3) Sanity check
psql "$NEON_PRIMARY" -c "select count(*) from users;"  # ≈ jumlah user Supabase
psql "$NEON_PRIMARY" -c "select count(*) from chatbot_sessions;"
```

> Neon adalah Postgres 16/17 — dump-nya kompatibel naik-version. Jika ada ekstensi
> Supabase khusus (`pg_trgm`, `pgcrypto`, `uuid-ossp`): `CREATE EXTENSION` di Neon
> sebelum restore bila perlu (Neon sudah punya default ext).

## 4. Flip Hyperdrive (Workers) — paling penting & bisa re-roll

Setiap env (staging & prod, api **dan** ai):

1. CF Dashboard → Hyperdrive → **Edit existing** (atau Create):
   - Host: host dari `NEON_PRIMARY` (mis. `ep-xxxx.us-east-1.aws.neon.tech`)
   - DB/user/pass Neon · port 5432 · **SSL: Require** (untuk neon 0.0.3+ Hyperdrive support, service binding name `neon-db`)
   - Max connections ~ 10 (default).
2. Copy **id Hyperdrive baru** → ganti id di:
   - `apps/server/wrangler.toml` (`[[env.staging.hyperdrive]]`, `[[env.production.hyperdrive]]`)
   - `apps/ai/wrangler.jsonc` (staging & production)
3. Deploy ulang api & ai per env (`wrangler deploy --env …`) → smoke:
   ```bash
   curl https://api.staging.mulaiplus.id/rpc/healthCheck   # pakai orpc client apa pun
   curl -s https://api.staging.mulaiplus.id/ai/health
   ```
4. **Rollback**: kembalikan id Hyperdrive lama → deploy lagi. Data di Supabase masih utuh (tidak dihapus).

## 5. Flip DATABASE_URL (Bun: lokal, CI, VPS) — terakhir

- Lokal: `.env.local`/`.dev.vars` → `DATABASE_URL=<NEON_POOLED>`
- CI staging/prod (.github): `secrets.DATABASE_URL` → `<NEON_POOLED>` (via `wrangler secret bulk` / GH actions secret)
- VPS: `.env.staging`/`.env.production` pada container
- Semua script yang pakai bun + `@mulai-plus/db` otomatis ikut.

Lalu jalankan pipeline normal:
```bash
bun run db:push -- --force      # align schema x migrasi (drizzle)
bun run optimize:io             # index trgm/GIN (sudah ada sql)
```

## 6. Smoke & observability (Wajib)

1. API `/health` 200; bikin 1 user baru end-to-end (signup → profile → tes minat → AI chat).
2. `logpush`/observability worker: cek latency query turun; throughput SQLite→Neon pooler 0 hmm — cek **p95 koneksi**.
3. Uptime monitor (status.mulaiplus.id) tetap hijau.
4. Tidak ada `citus` slow-query (audit insert lambat dulu).

## 7. Rollback penuh (jika butuh)

1. `DATABASE_URL` + Hyperdrive id → kembalikan nilai Supabase (bulk secret + wrangler).
2. Deploy ulang api/ai/web.
3. Data Neon ditinggalkan (branch bisa di-freeze di Launch plan).
   > Jangan hapus Supabase project **minimal 14 hari** setelah cutover verified.

---

## 8. Checklist eksekusi (copas ke GitHub issue)

- [ ] Neon project dibuat, string di-serahkan, region dipilih
- [ ] Dump & restore sukses; count users/sessions cocok
- [ ] `CREATE EXTENSION` (bila perlu) & `db:push` OK di Neon
- [ ] Hyperdrive staging dibuat → api-staging & ai-staging deploy → smoke OK
- [ ] Hyperdrive production dibuat → api-prod & ai-prod deploy → smoke OK
- [ ] CI `DATABASE_URL` di-flip (secret bulk) → pipeline staging hijau
- [ ] Lokal `.dev.vars` → Neon POOLED → `bun dev` jalan
- [ ] VPS rollback env di-flip (jika masih hidup)
- [ ] Smoke E2E (signup→tes→AI), observability & uptime hijau
- [ ] Supabase dibiarkan 14 hari → baru bisa di-nonaktifkan

---

## 9. Referensi
- Neon Launch: https://neon.tech/docs/plans (autoscale, pooled conn)
- Hyperdrive + Neon: https://developers.cloudflare.com/hyperdrive/known-limitations/ & neon connect docs
- Runbook lama bottleneck: `docs/perf/optimization-plan.md`, `packages/db/optimize-io.sql`