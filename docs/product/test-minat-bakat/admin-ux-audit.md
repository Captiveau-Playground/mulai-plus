# Admin UX Audit — Modul Assessment (2026-10-01)

Tujuan: pastikan **admin/PM mudah mengelola** asesmen. Fokus: pemisahan **Analitik vs Operasional**, penamaan konsisten, status jelas, resiko legacy vs v2.

## 1. Audit temuan (sebelum)
| # | Temuan | Dampak |
|---|---|---|
| A1 | Navigasi flat & campur: Dashboard (analitik) berdampingan Konten Test (operasional), B2C, Editor | PM bingung mana utk kerja-konten, mana utk lihat-laporan |
| A2 | "Editor (Engine v2)" vs "Konten Test" tanpa penanda legacy | Risiko edit di tempat lama yang sudah diganti |
| A3 | Label campur EN/ID ("B2C — Statistik", "Patterns", "Schools") & tanpa sub-label | Sulit dipetakan ke mental model |
| A4 | Publish flow di Editor ok (gatekeeper+errors actionable), tapi tidak ada status/riwayat aksi jelas di semua halaman | Sulit tahu versi mana yang hidup |
| A5 | Tanpa "mode admin vs mode PM-readonly" | PM takut merusak konten saat baca |

## 2. IA baru — Tanggal terpasang
- **Assessment — Operasional** (kerja konten/setting): Editor Soal (V2) · Konten Test (Legacy) · Pola Jurusan · Mapping Karier · Sekolah & Batch
- **Assessment — Analitik** (laporan): Dashboard · B2C — Statistik · B2C — History

## 3. Prinsip "gampang di-manage" (quick wins + backlog)
1. **Pisahkan yang ditingkatkan** — badge (V2)/(Legacy) sampai legacy di-archive penuh.
2. **Jelas: Lihat vs Ubah** — Mode "Baca (PM)" / "Kelola (Admin)" toggle global (Pro tip: PM tidak bisa publish; hanya review DRAFT & lihat laporan).
3. **Satu alur utk satu pekerjaan** — semua edit konten masuk `Editor (V2)`; Legacy hanya dibaca.
4. **Status visual** — setiap versi: badge DRAFT/PREVIEW/LIVE/ARCHIVED + tanggal; publish hanya dari Editor (gatekeeper errors)
5. **Aktivitas & audit** — tab "Riwayat Aksi" per assessment (siapa/mengubah apa/kapan) utk accountability PM.
6. **Counts inline** (opsional) — item sidebar menampilkan jumlah soal/versi/draft.

## 4. Rekomendasi lanjut (backlog terurut)
- [ ] Mode PM (read-only) toggle + disable publish utk non-admin
- [ ] Rename konsisten: "B2C — Statistik" → "Statistik B2C", dst. (bahasa Indonesia, urutan kata natural)
- [ ] Tab Riwayat Aksi per assessment (audit_log reuse)
- [ ] Empty-state + on-boarding singkat di Editor utk PM baru
- [ ] Archive/hide "Konten Test (Legacy)" setelah konten V2 paritas (Fase 0–2 selesai)

## 5. Catatan keamanan
- Semua perubahan ini **UI navigasi & label** — tidak mengubah data prod; tidak ada deploy prod tanpa izin.
- Diimplementasikan hanya di sidebar `admin-sidebar.tsx` + halaman editor existing.