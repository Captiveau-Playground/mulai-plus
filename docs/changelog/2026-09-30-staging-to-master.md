# Release — Mul.ai, Laporan PDF & Perbaikan Kinerja DB

> Dari branch staging → master (31 komit). Bersiap untuk rilis produksi.

## ✨ Baru
- **Laporan PDF Test Minat & Bakat dirombak total** — kini di-render sebagai dokumen HTML yang rapi lalu di-export via *Print → Save as PDF* (font & layout asli browser, teks bisa dicopy, link aktif):
  - Header dengan **logo MULAI+**, identitas (nama, email, sekolah), bar RIASEC & Bakat dengan **penjelasan per baris** (deskripsi tiap huruf RIASEC & tiap dimensi bakat + contoh karier/jurusan).
  - Rekomendasi dalam **tabel** (No · Jurusan · Kecocokan · Contoh Prodi) — prodi bisa **klik** langsung ke halaman explore terkait.
  - **QR tanda tangan digital** terhubung modul E-Sign (ditandatangani oleh **System — Product**; token HMAC per siswa; muncul di Admin E-Sign), footer + nomor halaman, kotak **Penutup** (batas laporan non-psikologis), ukuran kompak (~2 halaman).
- Prosedur baru **`esign.signTmbReport`** — audit trail otomatis di modul e-sign untuk laporan siswa.

## ⚡ Perbaikan Kinerja (Batch 1 — database)
- **Session lookup tidak lagi menyentuh DB** saat tidak ada cookie auth — route publik jadi tanpa beban koneksi.
- **Cache** untuk `features.get`, Admin Stats, & Leaderboard Ability (TTL 60 dtk) — mengurangi puluhan-ratusan query berulang (termasuk `count(*)` yang 22 detik & `system_settings` yang 222×).
- **Index baru**: `lower(name)+status` untuk pencarian/grouping program studi & universitas (query explore 24–38s), `session(token)`.
- **Cron worker API 1 mnt → 5 mnt** — mengurangi handshake koneksi ke database (beban CPU/IO).

## 🛠 Perbaikan & build
- Kembalikan dependency `jspdf` untuk laporan mentoring (`summary-report-pdf`) — OpenNext/CI build hijau kembali.
- Berbagai perbaikan kecil pada render laporan (warna kontras, spacing antar section, QR lebih besar & scanable).

## ⚠️ Catatan produksi
- Sebelum/bersamaan rilis: pastikan **index baru di-apply ke DB** (CI menjalankan `optimize:io`) dan pertimbangkan **upgrade plan database** mengingat CPU/IO 100% di instance saat ini.
