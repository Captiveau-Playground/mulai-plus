/**
 * Export template soal (CSV + Excel) untuk DISCOVER & TALENT.
 *
 *   cd apps/web && bun scripts/export-assessment-templates.mts
 *
 * Hasil di packages/db/templates/assessment/:
 *   discover-items.csv · discover-items.xlsx · discover-konfigurasi.csv
 *   talent-items.csv   · talent-items.xlsx   · talent-konfigurasi.csv
 *
 * CSV/XLSX sheet "Soal" bisa langsung dipakai fitur "Import Soal" di
 * Admin → Assessment → Editor Soal & Versi.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";
import {
  DISCOVER_CONFIG,
  DISCOVER_DIMS,
  DISCOVER_ITEMS,
  type ConfigRow,
  rowToCells,
  TALENT_CONFIG,
  TALENT_DIMS,
  TALENT_ITEMS,
  TEMPLATE_COLUMNS,
  type TemplateRow,
} from "../../../packages/db/scripts/assessment-banks";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "../../../packages/db/templates/assessment");
mkdirSync(OUT, { recursive: true });

const TIPE_LABEL: Record<string, string> = { pilihan: "pilihan ganda", isian: "isian (mengetik)", skala: "skala (likert)" };

function petunjukSheet(name: string, rows: TemplateRow[], config: ConfigRow[], dims: string[]) {
  const perTipe = rows.reduce<Record<string, number>>((a, r) => ({ ...a, [r.tipe]: (a[r.tipe] ?? 0) + 1 }), {});
  const perDim = rows.reduce<Record<string, number>>((a, r) => ({ ...a, [r.dimensi]: (a[r.dimensi] ?? 0) + 1 }), {});
  return [
    ["PETUNJUK — Template Soal " + name],
    [],
    ["Cara pakai"],
    ["1", "Buka Admin → Assessment → Editor Soal & Versi, pilih tes (atau buat baru), pastikan versinya DRAF."],
    ["2", "Klik 'Import Soal', pilih file CSV atau XLSX ini (sheet 'Soal' yang dibaca)."],
    ["3", "Periksa pratinjau (baris merah = perlu diperbaiki), lalu klik 'Impor'."],
    ["4", "Dimensi yang belum ada akan dibuat otomatis. Setelah itu setel nilai di panel 'Aturan tes' (lihat sheet Konfigurasi)."],
    [],
    ["Kolom", "Arti"],
    ["Teks", "Teks soal/pernyataan."],
    ["Dimensi", "Kode atau nama dimensi (lihat daftar di bawah)."],
    ["Tipe", "pilihan = pilihan ganda · isian = mengetik jawaban · skala = skala Likert/emoji."],
    ["Opsi A–F", "Isi pilihan untuk 'pilihan'. Untuk 'skala' isi label tiap tingkat (dipakai sebagai caption)."],
    ["Kunci", "Huruf opsi yang benar untuk 'pilihan' (A–F)."],
    ["Bobot", "Bobot soal (dipakai bila metode penilaian = Bobot soal)."],
    ["Kunci Isian", "Kunci untuk tipe 'isian' (angka, kata, atau regex sesuai 'Cara nilai')."],
    ["Cara nilai", "persis (exact) · angka (numeric + toleransi) · kata (keyword, pisah dengan |) · pola (regex)."],
    ["Toleransi", "Selisih yang diterima untuk 'Cara nilai = angka' (mis. 0.01)."],
    ["Tampilan", "standar · emoji (ikon per opsi) · gambar (gambar per opsi) · banding (kartu banding besar)."],
    [],
    ["Ringkasan isi"],
    ["Total soal", rows.length],
    ...Object.entries(perTipe).map(([t, n]) => [`Tipe: ${TIPE_LABEL[t] ?? t}`, n]),
    [],
    ["Dimensi", "Jumlah soal"],
    ...dims.map((d) => [d, perDim[d] ?? perDim[d.toLowerCase()] ?? 0]),
    [],
    ["Catatan penting"],
    ["Skala", "Soal 'skala' memakai tangga emoji 😡🙁😐🙂😍 dengan poin 1–5 (emoji diisi otomatis, label dari kolom Opsi A–E)."],
    ["Acak opsi", "JANGAN aktifkan 'Acak urutan pilihan' bila ada soal skala — urutan opsinya bermakna (server memang tidak mengacaknya)."],
    ["Acak soal", "JANGAN aktifkan 'Acak urutan soal' bersamaan dengan 'Pembagian bagian = Per dimensi'."],
    ["Mode gambar", "Tampilan 'gambar' butuh aset dari Galeri gambar (upload lewat editor), tidak disertakan di template ini."],
  ];
}

function configSheet(config: ConfigRow[]) {
  return [["key", "value", "catatan"], ...config.map((c) => [c.key, c.value, c.catatan])];
}

function exportOne(slug: string, name: string, rows: TemplateRow[], config: ConfigRow[], dims: string[]) {
  const aoa = [Array.from(TEMPLATE_COLUMNS), ...rows.map(rowToCells)];

  // CSV (hanya baris soal — siap impor)
  const csv = XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(aoa));
  writeFileSync(resolve(OUT, `${slug}-items.csv`), `${csv}\n`);

  // CSV konfigurasi (key,value,catatan)
  writeFileSync(resolve(OUT, `${slug}-konfigurasi.csv`), `${XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(configSheet(config)))}\n`);

  // XLSX: Soal + Konfigurasi + Petunjuk
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "Soal");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(configSheet(config)), "Konfigurasi");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(petunjukSheet(name, rows, config, dims)), "Petunjuk");
  XLSX.writeFile(wb, resolve(OUT, `${slug}-items.xlsx`));

  console.log(`✓ ${slug}: ${rows.length} soal → ${slug}-items.csv, ${slug}-items.xlsx, ${slug}-konfigurasi.csv`);
}

exportOne("discover", "DISCOVER (Tes Minat)", DISCOVER_ITEMS, DISCOVER_CONFIG, DISCOVER_DIMS);
exportOne("talent", "TALENT (Tes Bakat)", TALENT_ITEMS, TALENT_CONFIG, TALENT_DIMS);
console.log(`\nFolder: ${OUT}`);
