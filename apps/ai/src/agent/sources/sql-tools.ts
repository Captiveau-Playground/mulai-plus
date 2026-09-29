/**
 * Agent source: SQL tools — pasang builder ke registry (dipakai responder).
 */
import type { AppContext } from "../../config";
import { query } from "../../db/db";
import { buildSearchPrograms, buildSearchUniversities, findPrograms, passingGradeSql } from "../../tools/execute";
import { type AgentSource, registerSource } from "../registry";

const MAX_RESULTS = 8;

function formatUniversities(rows: Record<string, any>[]): string {
  if (!rows.length) return "Tidak ditemukan universitas dengan kriteria tersebut.";
  const lines = [`Ditemukan ${rows.length} universitas:`];
  for (const r of rows) {
    const acc = r.accreditation ? ` • Akreditasi: ${r.accreditation}` : "";
    const prog = r.total_programs ? ` • ${r.total_programs} prodi` : "";
    const badge = r.is_ptnbh ? " 🏛️PTN-BH" : "";
    lines.push(`\n🏛️ **${r.name}** (${r.type})${badge}${acc}${prog}`);
    lines.push(`   📍 ${r.regency || "-"}, ${r.province || "-"}`);
    if (r.tuition_range) lines.push(`   💰 Biaya: ${r.tuition_range}`);
    if (r.ptn_category) lines.push(`   🏷️ ${r.ptn_category}`);
  }
  return lines.join("\n");
}

function formatPrograms(rows: Record<string, any>[]): string {
  if (!rows.length) return "Tidak ditemukan program studi dengan kriteria tersebut.";
  const lines = [`Ditemukan ${rows.length} program studi:`];
  for (const r of rows) {
    const acc = r.accreditation ? ` • Akreditasi: ${r.accreditation}` : "";
    const stats: string[] = [];
    if (r.total_students) stats.push(`${r.total_students} mahasiswa`);
    if (r.total_lecturers) stats.push(`${r.total_lecturers} dosen`);
    const statStr = stats.length ? ` • ${stats.join(" • ")}` : "";
    lines.push(`\n📚 **${r.name}** (${r.level})${acc}${statStr}`);
    lines.push(`   🏛️ ${r.university_name} — ${r.province || "-"}`);
  }
  return lines.join("\n");
}

async function formatPassingGrade(
  c: AppContext,
  programName: string,
  universityName: string | undefined,
): Promise<string> {
  const fp = findPrograms(programName, universityName);
  const found = await query(c, fp.sql, fp.params);
  if (!found.length) return `Tidak ditemukan data passing grade untuk program '${programName}'.`;
  const results: string[] = [];
  for (const row of found) {
    const pgRows = await query(c, passingGradeSql(), [row.snpmb_program_id, null]);
    if (pgRows.length) {
      results.push(`\n📊 **${row.snpmb_program_name}** (${row.level || ""}) — ${row.university_name}`);
      for (const pg of pgRows) {
        const pgStr = pg.passing_grade != null ? `${Number(pg.passing_grade).toFixed(1)}%` : "-";
        results.push(`   ${pg.jalur} ${pg.year}: ${pgStr} (daya tampung: ${pg.capacity}, peminat: ${pg.applicants})`);
      }
    }
  }
  return results.length ? results.join("\n") : `Data passing grade untuk '${programName}' belum tersedia.`;
}

const SOURCES: AgentSource[] = [
  {
    name: "search_universities",
    description:
      "Cari perguruan tinggi berdasarkan nama, kota/kabupaten, provinsi, jenis (Negeri/Swasta/Agama/Kedinasan), akreditasi, kategori PTN, atau status PTN-BH.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Nama universitas atau kata kunci" },
        city: { type: "string", description: "Kota/kabupaten (misal: Bandung, Depok)" },
        province: { type: "string", description: "Provinsi (misal: Jawa Timur)" },
        type: { type: "string", enum: ["Negeri", "Swasta", "Agama", "Kedinasan"] },
        accreditation: { type: "string", enum: ["Unggul", "Baik Sekali", "Baik"] },
        ptn_category: { type: "string", enum: ["PTN Akademik", "PTN Vokasi", "PTKIN"] },
        is_ptnbh: { type: "boolean" },
      },
      additionalProperties: false,
    },
    async execute({ c }, args) {
      const { sql, params } = buildSearchUniversities(args);
      const rows = await query(c, sql, params);
      return formatUniversities(rows);
    },
  },
  {
    name: "search_programs",
    description: "Cari program studi berdasarkan nama, jenjang, universitas, akreditasi prodi, atau provinsi kampus.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Nama prodi/kata kunci (misal: kedokteran, teknik informatika)" },
        level: { type: "string", enum: ["S1", "D3", "D4", "S2", "S3", "Profesi"] },
        university: { type: "string" },
        accreditation: { type: "string", enum: ["Unggul", "Baik Sekali", "Baik"] },
        province: { type: "string" },
      },
      additionalProperties: false,
    },
    async execute({ c }, args) {
      const { sql, params } = buildSearchPrograms(args);
      const rows = await query(c, sql, params);
      return formatPrograms(rows);
    },
  },
  {
    name: "get_passing_grade",
    description:
      "Ambil data passing grade SNBP/SNBT untuk program studi tertentu (tahun, daya tampung, peminat, diterima, %).",
    parameters: {
      type: "object",
      properties: {
        program_name: { type: "string", description: "Nama prodi (misal: Kedokteran)" },
        university_name: { type: "string", description: "Nama universitas (opsional)" },
        year: { type: "integer", description: "Tahun (opsional)" },
      },
      additionalProperties: false,
    },
    async execute({ c }, args) {
      return formatPassingGrade(
        c,
        String(args.program_name ?? ""),
        args.university_name ? String(args.university_name) : undefined,
      );
    },
  },
];

export function registerSqlSources(): void {
  for (const s of SOURCES) registerSource(s);
}

export { MAX_RESULTS };
