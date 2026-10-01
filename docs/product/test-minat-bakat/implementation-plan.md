# Implementation Plan — Assessment Engine (Discover™ Minat & Talent™ Bakat)

> Source of Truth awal: `docs/product/test-minat-bakat/product-v2.md`
> **TL;DR**: satu *Assessment CMS Engine* generik yang melayani 2 produk — **Discover™ (Tes Minat, RIASEC)** & **Talent™ (Tes Bakat, Thurstone multi-format)**. Existing `tmb_*` jadi **versi v1 legacy** yang di-snapshot, lalu hidup di atas engine baru.

---

## 0. Ringkasan Rencana (roadmap)

| Fase | Judul | Durasi | Output utama |
|---|---|---|---|
| **0** | Fondasi Engine + Lifecycle/Versioning | 2–3 sprint | Model generik, assessment_versions immutable, answer scale, scoring config, migrasi data minat → Discover v1 |

> **STATUS Fase 0 (2026-10-01): SELESAI — teruji di staging, tanpa dampak ke tmb_***
> - L1 skema generik + migration 0020/0021 (staging Neon)
> - L2 seeder DISCOVER v1 (10 soal pair → 20 opsi, 6 dims, scale pair, config SUM/top-3, LIVE)
> - L3 router `discover`/`discoverAdmin` + scoring + gatekeeper (lib terpisah utk testability)
> - L4 admin editor `/admin/assessment/editor` + sidebar
> - **Testing (staging)**: student E2E config→start→submit×10→finish=`E-I-A` (DB: session completed, results/answers/scores); admin: gate DISCOVER v1 DITOLAK 6 error (`min 3 soal/dim`), draft compliant → publish→LIVE + archived + publishedAt ✓ (TEST sekali pakai di-cleanup)
> - **Menjalankan**: `bun run db:push` → `DATABASE_URL=… bun scripts/seed-assessment.ts [--force]` (packages/db) → `bun scripts/admin-publish-test.mts` (packages/api); UI `/admin/assessment/editor`
| **1** | Discover™ complete (minat) | 1–2 sprint | Intro sections, dimension instructions, preview-as-student, gatekeeper validasi, pause/resume |
| **2** | Talent™ multi-format (bakat) | 3–4 sprint | LaTeX/KaTeX, gambar+caption+posisi, TEXT_INPUT + evaluasi, timer server-side, tie-breaker 3-tingkat, WEIGHTED scoring |
| **3** | Enrichment (opsional) | 2+ sprint | CAT adaptive, WYSIWYG math, localization, interactive canvas |

**Dependensi**: Fase 0 → 1 (Discover Go-Live); Fase 2 independen sebagian (butuh Fase 0; bisa paralel dengan Fase 1 setelah model generik stabil).

---

## 1. Target Arsitektur (satu engine)

```
┌─────────────────────────── BACK OFFICE (Admin) ───────────────────────────┐
│ Assessment Config · Intro Sections · Dimensions · Instructions ·          │
│ Question Bank (multi-format) · Answer Scales · Scoring Config ·           │
│ Presentation Modes · Publish (Gatekeeper 24+ aturan) · Preview as Student │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │ (RPC admin.*)
                    ┌──────────▼──────────┐
                    │  ASSESSMENT ENGINE  │  discover.* / talent.*
                    │  (packages/api)     │
                    │  - version resolver │
                    │  - scoring (SUM/    │
                    │    AVG/WEIGHTED)    │
                    │  - timer server     │
                    │  - tie-breaker      │
                    │  - validator        │
                    └──────────┬──────────┘
                   ┌───────────┴────────────┐
        ┌──────────▼────┐          ┌────────▼────────┐   ┌─────────────────────┐
        │ STUDENT UI    │          │ MASTER DATA     │   │ DICTIONARY          │
        │ (renderer murni│          │ majors/careers/ │   │ (already exist)     │
        │  KaTeX, media,│          │ dimension maps  │   │ tmb_major_patterns  │
        │  timer, resume)│         └─────────────────┘   │ tmb_career_mappings │
        └──────────┬────┘                                └─────────────────────┘
                   └─▶ hasil → laporan PDF/AI summary (existing, dipertahankan)
```

Prinsip kunci (dari PRD): **content ≠ logic ≠ presentation**; frontend = renderer murni; **version immutable**; skoring di backend.

---

## 2. Model Data — Fase 0 (drizzle, Postgres/Neon)

Entitas netral (bukan `riasec_*`), siap untuk asesmen lain (MBTI/Big Five):

| Tabel | Kunci kolom | Catatan |
|---|---|---|
| `assessments` | id, code (UNIQUE), name, description, default_config_json | kode `DISCOVER`, `TALENT` (dll nanti) |
| `assessment_versions` | id, assessment_id FK, version_number, status (enum: draft/preview/validate/live/archived), config_json { total_dim, result_dim_count, min_q_per_dim, randomize_q, randomize_a, timer_enabled, timer_scope, allow_pause }, published_at | **immutable saat LIVE** |
| `assessment_sections` | id, version_id FK, title, content_type (description/bullet_list/cards), content_json, display_order, visibility | intro dinamis |
| `assessment_dimensions` | id, version_id FK, code, name, short_name, description, icon_url, duration_seconds, display_order, is_active | 6 utk Discover · 7 utk Talent |
| `dimension_instructions` | id, dimension_id FK, header, content_type, content_json | sebelum soal tiap dimensi |
| `answer_scales` | id, name, description | global-reusable |
| `answer_scale_options` | id, scale_id FK, value, score, label, icon/emoji, image_url, display_order | value ≠ score |
| `questions` | id, version_id FK, dimension_id FK, scale_id FK, question_code, question_text (HTML/LaTeX), has_math_notation, media_url, media_type, media_caption, media_position (above/below/side), alt_text, question_type (multiple_choice/text_input), presentation_mode (standard/icon/image/emoji/visual_comparison), display_order, is_active | multi-format siap dari Fase 0 (kolom diisi mulai Fase 2) |
| `question_options` | id, question_id FK, option_value, label (HTML/LaTeX), has_math_notation, image_url, image_caption, score, display_order | |
| `text_input_configs` | id, question_id FK, evaluation_type (exact/numeric_tolerance/keyword/pattern), answer_key, numeric_tolerance | mulai Fase 2 |
| `assessment_sessions` | id, student_id, version_id FK, status (in_progress/paused/completed/timeout), current_dimension_id, started_at, completed_at | timer anchor: `expected_end_time` |
| `assessment_answers` | id, session_id FK, question_id FK, selected_option_id, text_answer, score_earned, answered_at | jawaban mentah |
| `assessment_dimension_scores` | id, session_id FK, dimension_id FK, total_score, rank, completion_time_seconds | anchor tie-breaker |
| `assessment_results` | id, session_id FK, profile_code, top_dimensions_json, generated_at | |

Relasi: assessments 1:N versions; version 1:N sections/dimensions/questions; dimension 1:1 instruction; question N:1 dimension & scale; scale 1:N options; session → version; answers/scores → session.

**Migrasi legacy**: data `tmb_question_bank` (minat) → `questions` + `question_options` + `answer_scale(minat)` di bawah **assessment_versions v1 milik DISCOVER**; bakat lama → DISCOVER? *tidak* — bakat lama tetap berjalan (`tmb_*` bakat) sampai Talent Fase 2 menggesernya. `tmb_assessment_results`/`tmb_test_attempts` dibiarkan sebagai **historis** (baca-only, tetap tampil di history/report).

---

## 3. Fase Detail

### Fase 0 — Fondasi Engine + Versioning (2–3 sprint)

**Scope**
- DDL perusahaan generik + drizzle migrations; seeded master: assessment `DISCOVER` + versi v1 (snapshot soal minat existing), `TALENT` kosong (draft).
- Admin Back Office baru `admin/assessment/editor` (replacement bertahap utk `questions` lama):
  - Assessment CRUD + config (nama/kode/total_dim/result_dim_count/min_q/randomize/scoring method).
  - Publish → `assessment_versions` baru + **gatekeeper v1** (aturan inti: name/code unik, min soal per dimensi, opsi ≥2, result_dim_count valid) + error actionable.
  - UI Version list (v1 LIVE, v2 DRAFT…), no-edit-LIVE.
- Scoring config: enum SUM/AVG/WEIGHTED (WEIGHTED efektif mulai Fase 2).
- API: `discover.config()`, `discover.start()`, `discover.submitOption()`, `discover.score()`, resolver versi by session.
- Student: `/assessment/minat` membaca dari engine (renderer tetap sama; data driven).

**Deliverables**: model + migrasi + editor admin v1 + gatekeeper v1 + scoring engine SUM + API + smoke.
**Definition of Done**: publish Discover v1 dari admin → siswa baru mengerjakan → hasil == hasil lama (regresi report/rekomendasi OK).

**Risiko**: migrasi data salah → mitigasi: snapshot & UAT compare per user; rollback = aktifkan kode lama (flag).

### Fase 1 — Discover™ Complete + UX lanjutan (1–2 sprint)
- Intro sections admin (reorder/hide/preview) + render dynamic landing.
- Dimension instructions per dimensi + flow Instruction → Questions.
- **Preview as Student** (admin): jalankan dengan flag `preview=1`, data terisolasi (tidak tulis results/analytics).
- Gatekeeper penuh (alah 24 aturan utk konten teks: conflict display_order, mapping intact, dsb).
- Pause/Resume (tanpa timer): status `PAUSED`, snapshot posisi, lock dimensi selesai, resume → instruction dimensi berikutnya.
- Gamification config: `presentation_mode` per soal dicoba di 1–2 tipe.

**DoD**: admin bisa build asesmen minat baru dari nol & publish tanpa kode; siswa bisa pause-resume (desktop+mobile); preview tidak mencemari data.

### Fase 2 — Talent™ Multi-Format (3–4 sprint)
- **Content rich**: KaTeX renderer (frontend) + live preview validator LaTeX (back-office), validator media URL (HEAD 200 + alt_text + caption wajib).
- Media: upload ke **R2** (binding `MEDIA_BUCKET` existing) + `media_position`.
- **TEXT_INPUT** + evaluator (EXACT/NUMERIC_TOLERANCE/KEYWORD/PATTERN regex) + normalization pecahan↔desimal.
- **Timer server-side**: `expected_end_time` per scope; heartbeat; TIMEOUT auto-submit; visual warning (blu→orange→merah%).
- **Tie-breaker 3 tingkat**: Time (completion_time_seconds) → Accuracy (is_correct ratio) → Code abjad; total deterministik.
- Scoring WEIGHTED + question weight field.
- Session `pause/resume` dgn timer berjalan riil; crash-recovery TIMEOUT.
- Bakat lama → migrasi soal MC existing ke Talent v1 (5→7 dimensi final, kekuatan data dari assessment team).
- Student: `/assessment/bakat` full new renderer (multi-format) + result profile baru; laporan tetap kompatibel (ability scores).

**DoD**: soal LaTeX & gambar+caption render crisp ≤50ms/halaman (KaTeX), timer anti-tamper (ubah time browser tidak menipu), TEXT_INPUT dinilai 4 mode, tie-breaker deterministik unit-tested.

**Risiko**: kompleksitas renderer & timer → spike 1 sprint utk KaTeX+R2 prototype dulu; regression bakat lama → dual-run flag.

### Fase 3 — Enrichment (opsional, 2+ sprint)
CAT adaptive (chunk soal + ability estimation), WYSIWYG math editor (MathLive) admin, localization (translation tables), interactive canvas (rotasi 3D), Result mieux (karir simulasi) — masing-masing independent backlog item.

---

## 4. Back Office screen list (total)

`admin/assessment/` →
1. `editor` (assessment config + version)
2. `editor/intro` (sections)
3. `editor/dimensions` (+ instructions)
4. `editor/scales` (answer scales/options)
5. `editor/questions` (multi-format builder + LaTeX/math/media preview)
6. `editor/preview` (preview as student)
7. `versions` (list/compare/publish history)
8. existing `batches/schools/b2c/students/careers/patterns` (tetap)

---

## 5. Non-functional & infrastruktur
- **Perf**: API config payload < 200ms (Neon/Hyperdrive sudah live ✅); KaTeX < 50ms/halaman; media di CDN/R2 + lazy.
- **Keamanan**: timer server-side; TLS 1.3; validasi server semua input; tidak ada skoring client.
- **Uptime/ops**: Observability worker existing; CI guard maintenance; deploy OpenNext.
- **Auto-save**: `assessment_answers` per submit (sudah pola dari tmb_test_answers, dipertahankan).

---

## 6. Keputusan terbuka → rekomendasi default
| Pertanyaan | Rekomendasi |
|---|---|
| Tie-breaker | Adopsi 3-tingkat (time→accuracy→code). Data siap: `completion_time_seconds`, `is_correct` ✅ |
| Mid-question timer habis | Simpan jawaban terisi; kosong = 0; tanpa penalti ekstra |
| Fraction normalization | Normalisasi pecahan→desimal otomatis + NUMERIC_TOLERANCE 0.005 |
| WYSIWYG math di MVP | Tidak; LaTeX + live preview (P1) |
| Resume di Discover (tanpa timer) | Ya — PRD Fase 1 |

---

## 7. Urutan kerja & paralelisasi rekomendasi
```
Sprint 1–2 (F0): schema+migrasi+editor v1+gatekeeper v1+scoring SUM+API
Sprint 3   (F0/F1): Discover config→student end-to-end (regresi)
Sprint 4–5 (F1): intro/instruction/preview/pause-resume/gamification
Sprint 4–6 (F2 spike→core): KaTeX+R2 prototype → soal multi-format → TEXT_INPUT → timer → tie-breaker
Sprint 7   : Talent Go-Live + migrasi bakat
Sprint 8+  : F3 enrichment (backlog)
```
Tim minimal: 1 BE (engine+scoring), 1 FE (renderer/KaTeX/timer), 1 QA/PM-paruh (gatekeeper & AC). Total estimasi **±7 sprint** utk Talent penuh; Discover Go-Live bisa di **sprint 3–5**.

---

## 8. Catatan khusus
- **SSOT tunggal**: PRD sudah memisahkan Discover/Talent — implementasi wajib satu model generik (bagian 2). Jangan ikuti dua "skema rekomendasi" di PRD secara harfiah terpisah.
- **Legacy `tmb_*`**: read-only untuk historis; write path pindah ke engine (session/answers baru). Jangan hapus tabel lama — dipakai report/history lama.
- **Integration dengan fitur live**: daily quota, profile gate, report PDF/e-sign/AI summary, future-career, streak/XP — semua **menyambung ke `assessment_results`** (reuse key), bukan dibongkar.
