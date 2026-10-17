# Template Soal — DISCOVER & TALENT

Template siap impor untuk fitur **Admin → Assessment → Editor Soal & Versi → Import Soal**.
Berisi seluruh item + kunci jawaban + konfigurasi versi.

| File | Isi |
| --- | --- |
| `discover-items.csv` / `.xlsx` | 120 aitem minat (6 dimensi × 20), skala emoji 😡🙁😐🙂😍 |
| `discover-konfigurasi.csv` | Nilai panel "Aturan tes" untuk DISCOVER (xlsx: sheet `Konfigurasi`) |
| `talent-items.csv` / `.xlsx` | 120 soal bakat (5 dimensi × 24), semua tipe & mode jawaban |
| `talent-konfigurasi.csv` | Nilai panel "Aturan tes" untuk TALENT (xlsx: sheet `Konfigurasi`) |

File `.xlsx` punya 3 sheet: **Soal** (yang dibaca importer), **Konfigurasi**, dan **Petunjuk**.

Regenerate:

```bash
cd apps/web && bun scripts/export-assessment-templates.mts
```

Sumber datanya `packages/db/scripts/assessment-banks.ts` — satu sumber yang juga dipakai
seeder (`seed-discover-riasec.ts`, `seed-talent-bank.ts`), jadi template dan data DB tidak
akan berbeda.

## Kontrak kolom

| Kolom | Arti |
| --- | --- |
| `Teks` | Teks soal/pernyataan |
| `Dimensi` | Kode atau nama dimensi (yang belum ada **dibuat otomatis**) |
| `Tipe` | `pilihan` (pilihan ganda) · `isian` (mengetik jawaban) · `skala` (Likert/emoji) |
| `Opsi A`–`Opsi F` | Pilihan untuk `pilihan`; untuk `skala` berisi label tiap tingkat (jadi caption) |
| `Kunci` | Huruf opsi benar untuk `pilihan` (A–F) |
| `Bobot` | Bobot soal (dipakai bila metode penilaian = *Bobot soal*) |
| `Kunci Isian` | Kunci untuk `isian` (angka / kata / regex sesuai `Cara nilai`) |
| `Cara nilai` | `persis` · `angka` (+`Toleransi`) · `kata` (pisah dengan `\|`) · `pola` (regex) |
| `Toleransi` | Selisih yang diterima untuk `Cara nilai = angka` |
| `Tampilan` | `standar` · `emoji` (ikon per opsi) · `gambar` (butuh aset) · `banding` (kartu besar) |

Untuk `skala`, emoji **diisi otomatis** (😡🙁😐🙂😍) dengan poin 1–5; kolom `Opsi A–E` dipakai
sebagai caption di bawah emoji.

## Isi bank item

**DISCOVER** — Holland RIASEC, 6 dimensi × 20 aitem:

| Kode | Dimensi | Soal |
| --- | --- | --- |
| R | Realistic | 20 |
| I | Investigative | 20 |
| A | Artistic | 20 |
| S | Social | 20 |
| E | Enterprising | 20 |
| C | Conventional | 20 |

**TALENT** — kemampuan, 5 dimensi × 24 soal:

| Kode | Dimensi | Pilihan | Skala | Isian | Total |
| --- | --- | ---: | ---: | ---: | ---: |
| verbal | Penalaran Verbal | 12 | 4 | 8 | 24 |
| numerical | Kemampuan Numerik | 12 | 4 | 8 | 24 |
| logical | Penalaran Logis | 12 | 4 | 8 | 24 |
| spatial | Penalaran Spasial | 12 | 4 | 8 | 24 |
| clerical | Kecepatan Perseptual | 12 | 4 | 8 | 24 |
| | **Total** | **60** | **20** | **40** | **120** |

Mode kunci jawaban yang dipakai (semua latihan): `persis` 26 · `angka` + toleransi 2 ·
`kata` 5 · `pola` (regex) 7. Tampilan: `standar`, `emoji`, dan `banding`.

## ⚠️ Jangan diubah tanpa alasan

1. **Kode dimensi TALENT wajib** `verbal`, `numerical`, `logical`, `spatial`, `clerical`.
   Kode ini adalah kontrak dengan halaman **Pola Jurusan** (`abilityWeights`) — kalau diubah,
   rekomendasi jurusan/karier jadi kosong tanpa error. DISCOVER memakai `R I A S E C`.
2. **"Acak urutan pilihan" jangan diaktifkan** kalau ada soal skala — urutan opsinya bermakna.
   Server memang tidak mengacak opsi `skala`, tapi setting-nya jadi menyesatkan.
3. **"Acak urutan soal" jangan digabung** dengan `Pembagian bagian = Per dimensi` — batas bagian
   jadi tidak menentu (panel admin memberi peringatan).

## Catatan

- Tampilan `gambar` tidak bisa disertakan di template karena butuh aset dari Galeri gambar
  (upload di editor). Soal dengan mode ini akan memakai huruf opsi sampai gambarnya dipasang.
- Setelah impor, nilai panel "Aturan tes" **tidak** ikut terisi otomatis — samakan dengan
  file `*-konfigurasi.csv`.
- Soal `skala` bersifat self-report; pada tes bakat murni, bagian ini boleh dihapus dan
  `scoring_method` tetap `sum`.
