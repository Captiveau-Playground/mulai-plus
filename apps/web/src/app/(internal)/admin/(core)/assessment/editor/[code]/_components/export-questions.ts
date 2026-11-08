"use client";

/**
 * Unduh soal satu versi sebagai .xlsx (kolom = kontrak "Import Soal" + kolom lanjutan).
 * Data diambil dari query `contentList` yang sudah dimuat editor — tidak ada endpoint baru.
 */

import {
  buildConfigRows,
  buildGuideRows,
  buildQuestionRows,
  EXPORT_COLUMNS,
  type ExportContent,
  type ExportDimension,
  type ExportMeta,
} from "@mulai-plus/api/lib/assessment-export";

export interface ExportPayload {
  content: ExportContent;
  meta: ExportMeta;
  includeInactive?: boolean;
}

const slug = (v: string) =>
  v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "tes";

export function exportFileName(meta: ExportMeta): string {
  return `${slug(meta.code)}-v${meta.versionNumber}-soal.xlsx`;
}

/** Bangun workbook + picu unduhan di browser. Mengembalikan nama file. */
export async function downloadVersionXlsx({ content, meta, includeInactive = false }: ExportPayload): Promise<string> {
  const XLSX: any = await import("xlsx");

  const soal = buildQuestionRows(content, { includeInactive });
  const konfig = buildConfigRows(meta, content.dimensions as ExportDimension[]);
  const petunjuk = buildGuideRows(meta, Math.max(0, soal.length - 1));

  const wb = XLSX.utils.book_new();

  const wsSoal = XLSX.utils.aoa_to_sheet(soal);
  // kolom teks lebar + wrap supaya HTML/LaTeX panjang tetap terbaca
  wsSoal["!cols"] = EXPORT_COLUMNS.map((c) => {
    if (c === "Teks") return { wch: 60 };
    if (c === "Opsi A" || c === "Opsi B" || c === "Opsi C" || c === "Opsi D" || c === "Opsi E" || c === "Opsi F")
      return { wch: 26 };
    if (c === "Kunci Isian" || c === "Toleransi") return { wch: 18 };
    if (c === "Media URL" || c === "Opsi A") return { wch: 28 };
    return { wch: 14 };
  });
  wsSoal["!freeze"] = { xSplit: "0", ySplit: "1" };
  XLSX.utils.book_append_sheet(wb, wsSoal, "Soal");

  const wsKonfig = XLSX.utils.aoa_to_sheet(konfig);
  wsKonfig["!cols"] = [{ wch: 28 }, { wch: 28 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsKonfig, "Konfigurasi");

  const wsGuide = XLSX.utils.aoa_to_sheet(petunjuk);
  wsGuide["!cols"] = [{ wch: 26 }, { wch: 96 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, "Petunjuk");

  const name = exportFileName(meta);
  XLSX.writeFile(wb, name);
  return name;
}
