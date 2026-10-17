# E2E Tests (Playwright)

## Struktur

```
apps/web/e2e/
├── playwright.config.ts
├── setup-admin.mts                 ← siapkan akun admin e2e (opsional; biasanya otomatis)
├── cleanup-assessments.mts         ← sapu sisa assessment uji (prefix E2E)
├── helpers/
│   ├── env.ts                      ← API_URL/WEB_URL, DATABASE_URL, runTag() kode unik
│   ├── db.ts                       ← akses DB (pg): promote admin, cleanup assessment
│   ├── api.ts                      ← rpc() (publik) & adminRpc() (cookie sesi browser)
│   ├── auth.ts                     ← preAcceptCookies, dismissCookie, loginUI, ensureAdmin
│   ├── admin-ui.ts                 ← interaksi panel admin (login, accordion, setRule, tambah soal)
│   └── preview.ts                  ← halaman preview siswa (buka, mulai, jawab)
├── fixtures/
│   └── assessment.ts               ← builder tes uji (dimensi, soal, sections, publish)
└── specs/
    ├── admin/assessment/
    │   ├── menu-smoke.spec.ts               ←  9 · semua menu assessment terbuka
    │   ├── editor-layout.spec.ts            ←  5 · kerangka editor, dimensi, versi read-only
    │   ├── editor-rules.spec.ts             ←  5 · pengisian aturan (timer, penilaian, pengalaman)
    │   ├── editor-questions.spec.ts         ←  7 · semua tipe soal, preset, presentasi, LaTeX
    │   ├── editor-questions-manage.spec.ts  ←  5 · urut, salin, hapus, edit, nomor urut
    │   ├── editor-content.spec.ts           ←  4 · pengantar, instruksi, import CSV
    │   ├── editor-publish.spec.ts           ←  4 · checklist, gate, rilis, draf baru
    │   └── settings-wiring.spec.ts          ← 11 · SETTING → perilaku siswa
    └── student/
        ├── engine-question-types.spec.ts    ←  6 · tipe soal & 4 mode evaluasi isian (API)
        ├── engine-scoring.spec.ts           ←  6 · metode skoring, top-N, likert (API)
        ├── engine-timer-session.spec.ts     ←  7 · timer, section mode, jeda/lanjut (API)
        ├── take-question-types.spec.ts      ←  7 · rendering & jawab semua tipe (UI)
        ├── take-timer-progress.spec.ts      ←  5 · countdown, progres, selesai (UI)
        └── assessment-logic.spec.ts         ←  2 · alur DISCOVER/TALENT (spec lama)
```

Total: **103 test** (termasuk spec publik/auth lama: landing, explore, blog, programs, errors, details, login).

## Menjalankan

Butuh **server :3000** dan **web :3001** (playwright.config menyalakan `bun run dev` di 3001 bila perlu),
plus `DATABASE_URL` yang bisa diakses (dibaca dari `apps/server/.env`).

```bash
cd apps/web

node node_modules/.bin/playwright test --config=e2e/playwright.config.ts --workers=2
node node_modules/.bin/playwright test --config=e2e/playwright.config.ts e2e/specs/admin
node node_modules/.bin/playwright test --config=e2e/playwright.config.ts e2e/specs/student
```

Env opsional: `E2E_API_URL`, `E2E_WEB_URL`, `E2E_DB_URL`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`.

## Isolasi data

- Tes uji dibuat lewat `discoverAdmin.create` dengan kode unik `E2E<AREA><random>` dan dihapus lagi
  di `afterAll` (`deleteAssessmentByCode` — cascade eksplisit, DB tidak memakai `ON DELETE CASCADE`).
- Sisi user diuji lewat **mode preview** `/assessment/talent?preview=1&code=…&v=…` (tanpa login,
  `studentId` = `preview-xxxx`, tidak menulis hasil ke akun siswa).
- **Jangan** menghapus per-prefix di dalam `afterAll`: saat paralel, worker yang selesai lebih dulu
  akan menghapus data milik worker lain. Pakai `cleanup-assessments.mts` untuk sapu manual.

## Setting di panel admin → perilaku siswa

Semua baris di bawah ini diuji oleh `settings-wiring.spec.ts`.

| Setting | Dibaca di | Status |
| --- | --- | --- |
| `result_dim_count` (top-N) | `discover.finish` → `profileCode` | ✅ |
| `total_dim`, `min_q_per_dim` | gate publish (`validatePublish`) | ✅ |
| `timer_enabled`, `timer_scope`, `time_per_question` | `discover.start` → `serverTimer`; `submit` anti-tamper; countdown UI | ✅ |
| durasi per dimensi | `serverTimer.dims[].endISO` | ✅ |
| `section_mode` | `discover.config.runSections` + instruksi/checkpoint | ✅ |
| `scoring_method` (sum/average/weighted) | `discover.finish` | ✅ |
| `lang` | kamus tombol/label `engine-run.tsx` | ✅ |
| `randomize_q` | `discover.start` → acak `orderIds` (disimpan di sesi) | ✅ |
| `randomize_a` | `discover.start` → `optionOrder` per soal (disimpan di sesi) | ✅ |
| `allow_pause` | tombol pause di engine + guard `discover.pause` | ✅ |
| `scoring_mode` + `likert_min/max` | `discover.finish` → poin linier per urutan opsi | ✅ |

## Bug yang ditemukan suite ini (semua sudah diperbaiki)

| # | Prioritas | Bug | Perbaikan | Test |
| --- | --- | --- | --- | --- |
| 1 | **P0** | Soal **tidak berpindah** setelah dijawab. `advance()`/`nextIdx()` membaca snapshot `answers` yang basi, jadi soal yang baru dijawab dipilih lagi. | `answer()`/`submitText()` menyusun snapshot baru lalu `advance(answersNow)` | `take-timer-progress` → "berpindah ke soal berikutnya" |
| 2 | **P0** | Tes **tidak pernah bisa diselesaikan**: `finish` gagal 500 karena `completion_time_seconds` (INTEGER) dikirimi desimal (`1.683`). | durasi dibulatkan di `finish` | `take-timer-progress` → "menyelesaikan seluruh soal" |
| 3 | **P0** | `finishRun()` diblokir guard `pending` saat dipanggil dari `advance()` → soal terakhir menggantung di `N/N`. | `finishRun(true)` (bypass guard untuk pemanggilan internal) | idem |
| 4 | **P1** | Sesi `pause` tak pernah kembali `in_progress`; `start()` hanya melanjutkan `in_progress` dan `submit` menolak `session_closed` → tombol "Berhenti & lanjutkan nanti" mematikan sesi. | `start()` menemukan sesi `paused` + mengembalikan statusnya ke `in_progress` | `engine-timer-session` → "jeda lalu start lagi" |
| 5 | **P1** | Edit soal **isian** menghapus kunci jawaban (form tidak memuat `textEval`). | form memuat `q.tc`; editor juga dapat pilihan "Cara nilai" (4 mode) | `editor-questions-manage` → "edit soal isian" |
| 6 | **P1** | Layar checkpoint antar bagian muncul **di bawah** soal (soal tidak disembunyikan). | blok RUN disembunyikan saat `cp` aktif | `take-timer-progress` → "berpindah ke soal berikutnya" |
| 7 | **P2** | 4 setting tidak dikonsumsi siapa pun: `randomize_q`, `randomize_a`, `allow_pause`, `scoring_mode`/`likert_min`/`likert_max`. | diimplementasikan di `discover.start` & `discover.finish` + engine | `settings-wiring.spec.ts` |
| 8 | **P2** | Soal baru selalu `displayOrder: 0` → >1 soal per dimensi diblokir gate "nomor urut bertabrakan". | server menormalkan nomor urut saat `contentSave`; UI memakai urutan per dimensi | `editor-questions-manage` → "nomor urut unik" |
| 9 | **P2** | Tombol kirim isian memakai literal `"{t.send}"`. | memakai `{t.send}` | `take-question-types` → "label tombol kirim" |
| 10 | **P3** | Opsi A selalu tampak terpilih (`o.optionValue === "A"` → border teal). | highlight dihapus | terlihat di UI |

## Perubahan UI panel admin

Panel "Aturan tes" dipecah menjadi komponen di
`src/app/(internal)/admin/(core)/assessment/editor/[code]/_components/`:

| File | Isi |
| --- | --- |
| `settings-panel.tsx` | komposisi panel: Rilis & Versi + accordion + checklist + aksi |
| `version-list.tsx` | timeline versi (status, tanggal relatif, aksi rilis/preview) |
| `dimensions-card.tsx` | tabel dimensi (kode · nama · jumlah soal · durasi) + peringatan inline |
| `sections-card.tsx` | pengantar & instruksi per dimensi |
| `field-controls.tsx` | `NumberField`, `SwitchField`, `SelectField`, `SegmentedField`, `DebouncedInput` |
| `validation-checklist.tsx` | checklist kelayakan live (dari isi versi) |

Hasil pengukuran panel (TALENT: 6 dimensi, 30 soal):

```
sebelum : 2.272 px (≈2,3× tinggi layar) · 14 input + 10 select + 16 tombol
sesudah :   811 px (≈0,8× tinggi layar) · ringkasan per grup + accordion
```

Semua kontrol punya `data-testid` (`rule-*`, `q-*`, `dim-*`, `section-*`, `version-*`, `group-trigger-*`)
supaya test tidak bergantung pada styling.

## Catatan

- Modal consent cookie muncul ~1,1 dtk setelah halaman dimuat dan menutupi layar —
  `preAcceptCookies()` mengisi `localStorage.mulaiplus_ga_consent = "accepted"` sebelum navigasi.
- Runner memakai **DB staging** secara default. Untuk CI, arahkan `E2E_DB_URL` ke DB test
  (`docker-compose.test.yml`, port 5433).
