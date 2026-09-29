# 🏛️ PDDikti Public Pages — Strategy & Milestone

> Integrasi data PDDikti & SNPMB (408 PT · 18.881 prodi) ke halaman public MulaiPlus.
> Tujuan: SEO massive, authority building, dan konversi student → bimbingan.

---

## 1. Tujuan Strategis

| Tujuan | Dampak |
|--------|--------|
| **SEO massive** | Potensi ~19.000+ halaman terindeks (408 PT × prodi) |
| **Authority** | Jadi rujukan data pendidikan tinggi Indonesia |
| **Engagement** | Student explore data → waktu tinggal lama |
| **Konversi** | Setiap halaman ada CTA "Butuh bantuan milih jurusan?" |

---

## 2. Data yang Tersedia (18 Tabel)

### PDDIKTI (10 tabel)
| Tabel | Jumlah Record | Untuk Halaman |
|-------|---------------|---------------|
| `universities` | 408 | List PT, detail PT |
| `university_details` | 408 | Detail PT (kontak, alamat) |
| `study_programs` | 18.881 | List prodi, detail prodi |
| `tuition_fees` | 408 | Range biaya |
| `student_stats` | 408 | Rata-rata lulusan/maba |
| `study_durations` | 1.352 | Rata-rata masa studi |
| `lecturer_counts` | 408 | Jumlah dosen |
| `graduation_rates` | 408 | Persentase kelulusan |
| `program_counts` | 408 | Jumlah prodi |
| `name_histories` | 25 | Riwayat ganti nama |

### SNPMB (6 tabel)
| Tabel | Record | Untuk Halaman |
|-------|--------|---------------|
| `snpmb_universities` | 146 | Detail PTN peserta SNPMB |
| `snbp_programs` | 5.142 | Daya tampung SNBP per prodi |
| `snbt_programs` | 5.140 | Daya tampung SNBT per prodi |
| `snbp_capacity_history` | 21.456 | Histori 5 tahun SNBP |
| `snbt_capacity_history` | 21.589 | Histori 5 tahun SNBT |
| `snbt_applicant_provinces` | 261.558 | Peminat per provinsi |

### Mapping (2 tabel)
| Tabel | Record | Fungsi |
|-------|--------|--------|
| `university_mappings` | 146 | Jembatan PDDikti ↔ SNPMB |
| `program_mappings` | 5.051 | Jembatan prodi PDDikti ↔ SNPMB |

---

## 3. Sitemap

```
/
├── /universities                                    [List PT]
│   ├── ?province=jabar&type=negeri&accreditation=unggul
│   ├── ?page=2
│   │
│   ├── /universities/[slug]                         [Detail PT] × 408
│   │   ├── Info umum (tipe, akreditasi, lokasi, status)
│   │   ├── Statistik (mahasiswa, dosen, kelulusan)
│   │   ├── Program studi (tabel + filter jenjang)
│   │   ├── Biaya kuliah (range UKT/SPP)
│   │   ├── Daya tampung SNBP/SNBT + tren 5 tahun
│   │   └── CTA: konsultasi gratis
│   │
│   └── /compare?ids=a,b,c                           [Compare PT]
│
├── /programs                                         [List Prodi] × 18.881
│   ├── ?level=s1&q=informatika&accreditation=unggul
│   ├── ?page=2
│   │
│   └── /programs/[slug]                              [Detail Prodi]
│       ├── Info prodi (jenjang, akreditasi)
│       ├── Universitas penyelenggara (link)
│       ├── Daya tampung & peminat SNBP/SNBT
│       ├── Grafik tren 5 tahun
│       └── CTA: "Cari tahu jurusan ini →"
│
├── /snpmb                                            [Landing SNPMB]
│   ├── /snpmb/snbp                                   [Info SNBP]
│   │   └── /snpmb/snbp/[university-slug]             [Daya tampung SNBP per PT]
│   ├── /snpmb/snbt                                   [Info SNBT]
│   │   └── /snpmb/snbt/[university-slug]             [Daya tampung SNBT per PT]
│   └── /snpmb/trend                                  [Analisis tren peminat]
│
├── /provinces                                        [By Location]
│   └── /provinces/[province-slug]                    × 38 provinsi
│       ├── Daftar PT di provinsi
│       └── Statistik pendidikan provinsi
│
├── /explore                                          [Eksplorasi Interaktif]
│   ├── /explore/by-location
│   ├── /explore/by-major
│   └── /explore/by-opportunity
│
└── /blog
    └── Artikel berbasis data (contoh judul)
        ├── "10 PTN dengan Peminat SNBT Terbanyak 2025"
        ├── "Jurusan S1 dengan Daya Tampung Terbesar"
        ├── "Provinsi dengan Universitas Terbanyak di Indonesia"
        └── "Perbandingan SNBP vs SNBT: Mana Lebih Ketat?"
```

### Total Estimasi Halaman

| Jenis | Jumlah |
|-------|--------|
| Detail PT | 408 |
| Detail Prodi | ~18.881 |
| Landing Provinsi | 38 |
| List + filter pages | ~50+ |
| **Total estimasi** | **~19.500+ halaman** |

---

## 4. Milestone & Fase

### 🔵 Fase 1 — Foundation (MVP) — **Sekarang**

| Task | Halaman | API Endpoint | Data |
|------|---------|-------------|------|
| 1.1 | `/universities` — List PT | `pddikti.listUniversities` | `universities` |
| 1.2 | `/universities/[slug]` — Detail PT | `pddikti.getUniversity` | `universities` + all relasi |
| 1.3 | `/programs` — List Prodi | `pddikti.listStudyPrograms` | `study_programs` |
| 1.4 | `/programs/[slug]` — Detail Prodi | `study_programs` + mapping | `study_programs` + SNPMB |

**Target SEO:** ~19.000 halaman terindeks.
**CTA di setiap halaman:** Form konsultasi / daftar bimbingan.

### 🟡 Fase 2 — Engagement

| Task | Halaman |
|------|---------|
| 2.1 | `/universities/compare` — Compare tool |
| 2.2 | `/snpmb/snbp/[slug]` — Data SNBP per PT + grafik |
| 2.3 | `/snpmb/snbt/[slug]` — Data SNBT per PT + grafik |
| 2.4 | `/explore/by-location` — Pilih provinsi → lihat PT |
| 2.5 | `/explore/by-major` — Pilih rumpun → lihat prodi |

### 🟢 Fase 3 — Authority

| Task | Halaman |
|------|---------|
| 3.1 | `/provinces/[slug]` — Landing per provinsi (SEO lokal) |
| 3.2 | `/snpmb/trend` — Analisis tren peminat 5 tahun |
| 3.3 | Artikel blog berbasis data (10+ artikel) |

---

## 5. Arsitektur Teknis

### API Endpoints yang Dibutuhkan (public)

Prosedur public (tidak perlu auth) akan ditambahkan di `packages/api/src/routers/pddikti.ts`:

```
publicListUniversities      → list PT tanpa auth
publicGetUniversity         → detail PT tanpa auth
publicListStudyPrograms     → list prodi tanpa auth
publicGetStudyProgram       → detail prodi tanpa auth
```

### Routing di Web App

```
apps/web/src/app/(app)/(front)/
├── universities/
│   ├── page.tsx                    ← List PT
│   └── [slug]/
│       └── page.tsx                ← Detail PT
├── programs/
│   ├── page.tsx                    ← List Prodi
│   └── [slug]/
│       └── page.tsx                ← Detail Prodi
```

### Slug Strategy

`id_sp` dari PDDikti adalah string terenkripsi (contoh: `zGcC8haizO6...`).  
Untuk SEO, kita butuh **human-readable slug**.

**Approach:** Generate slug dari nama PT/prodi + tambahkan ID suffix.

```
Universitas Indonesia → universitas-indonesia-MzgzMjUy
Teknik Informatika S1 → teknik-informatika-s1-abc123
```

Atau simpan slug di tabel (butuh migrasi). Simple approach: **slugify nama + 6 char pertama id_sp**.

---

## 6. Komponen UI yang Diperlukan

| Komponen | Untuk |
|----------|-------|
| UniversityCard | Card di list PT |
| ProgramTable | Tabel prodi (filterable) |
| StatsCard | Statistik (mahasiswa, dosen, dll) |
| AccreditationBadge | Badge akreditasi berwarna |
| CapacityChart | Grafik daya tampung/peminat (Recharts) |
| SnpmbTable | Tabel data SNBP/SNBT |
| CtaBanner | Call-to-action "Konsultasi Gratis" |
| FilterBar | Filter provinsi, tipe, akreditasi |
| SearchInput | Pencarian PT/prodi |
| Breadcrumb | Navigasi |

---

## 7. Success Metrics

| Metrik | Target |
|--------|--------|
| Halaman terindeks Google | 5.000+ dalam 3 bulan |
| Pageview / bulan | 50.000+ organik |
| Bounce rate | < 50% |
| Conversion rate (CTA → daftar) | > 2% |
| Average session duration | > 3 menit di halaman detail |

---

## 8. Next Action

Langkah pertama: **buat halaman public `/universities` dan `/universities/[slug]`**  
→ copy dari komponen admin yang sudah ada, ubah akses dari `adminProcedure` ke `publicProcedure`  
→ tambahkan CTA "Konsultasi Gratis"  
→ deploy dan pantau indexing Google

---

*Dibuat: 2026-06-08*
*Sumber data: PDDikti (pddikti.kemdiktisaintek.go.id) & SNPMB (snpmb.id)*
