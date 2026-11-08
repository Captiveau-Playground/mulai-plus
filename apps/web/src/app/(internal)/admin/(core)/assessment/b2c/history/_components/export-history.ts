"use client";

/**
 * Ekspor hasil assessment (riwayat B2C) → .xlsx.
 * 1 baris = 1 orang + 1 percobaan tes; kolom ke kanan = item soal (Q1..Qn).
 */

import { buildHistorySheets, type ExportData, PREFIX_COLUMNS } from "@mulai-plus/api/lib/assessment-history-export";
import { client } from "@/utils/orpc";

export interface HistoryExportOptions {
  limit?: number;
  offset?: number;
  code?: string;
  from?: string;
  to?: string;
  /** B2B: batasi ke satu kelas */
  batchId?: string;
  /** B2B: batasi ke satu sekolah */
  schoolId?: string;
}

const stamp = (d = new Date()) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
};

/** Ambil data percobaan dari server (admin). */
export async function fetchHistoryExport(opts: HistoryExportOptions = {}): Promise<ExportData> {
  const raw = client as any;
  return (await raw.tmbAdmin.b2c.exportData({
    limit: opts.limit ?? 1000,
    offset: opts.offset ?? 0,
    code: opts.code,
    from: opts.from,
    to: opts.to,
    batchId: opts.batchId,
    schoolId: opts.schoolId,
  })) as ExportData;
}

/** Bangun workbook lalu picu unduhan. Mengembalikan nama file + jumlah baris. */
export async function downloadHistoryXlsx(
  opts: HistoryExportOptions = {},
): Promise<{ file: string; rows: number; total: number }> {
  const data = await fetchHistoryExport(opts);
  if (!data.rows.length) throw new Error("Belum ada percobaan tes untuk diekspor.");

  const XLSX: any = await import("xlsx");
  const wb = XLSX.utils.book_new();

  for (const sheet of buildHistorySheets(data)) {
    const ws = XLSX.utils.aoa_to_sheet(sheet.rows);
    const header = (sheet.rows[0] ?? []) as any[];
    const isSoal = sheet.name === "Soal";
    ws["!cols"] = header.map((h) => {
      const name = String(h ?? "");
      if (isSoal) {
        if (name === "Teks Soal") return { wch: 58 };
        if (name.startsWith("Opsi")) return { wch: 22 };
        return { wch: 14 };
      }
      if (name === "Nama" || name === "Email") return { wch: 24 };
      if (name === "Skor Mentah" || name === "Dimensi Teratas") return { wch: 26 };
      if (name.startsWith("Rekomendasi")) return { wch: 30 };
      if (name.startsWith("Q")) return { wch: 26 };
      if (name === "Sesi") return { wch: 22 };
      if (["Mulai", "Selesai", "Sekolah", "Batch"].includes(name)) return { wch: 20 };
      return { wch: Math.max(12, Math.min(24, name.length + 4)) };
    });
    if (!isSoal) ws["!freeze"] = { xSplit: String(PREFIX_COLUMNS.length), ySplit: "1" };
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }

  const file = `riwayat-assessment-${stamp()}.xlsx`;
  XLSX.writeFile(wb, file);
  return { file, rows: data.rows.length, total: data.total };
}
