/**
 * Tool definitions — port dari apps/ai-python/src/tools.py.
 * Hanya tool yang punya handler TS di src/tools/execute.ts.
 */
import type { ToolDef } from "../llm/client";

export const TOOL_DEFINITIONS: ToolDef[] = [
  {
    type: "function",
    function: {
      name: "search_universities",
      description:
        "Cari perguruan tinggi berdasarkan nama, kota/kabupaten, provinsi, jenis (Negeri/Swasta/Agama/Kedinasan), akreditasi, kategori PTN (Akademik/Vokasi/PTKIN), atau status PTN-BH. Hasil: nama, jenis, akreditasi, lokasi, jumlah prodi, rentang biaya kuliah.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Nama universitas atau kata kunci" },
          city: { type: "string", description: "Filter berdasarkan kota/kabupaten (misal: Surabaya, Depok, Bandung)" },
          province: { type: "string", description: "Filter berdasarkan provinsi (misal: Jawa Timur, DKI Jakarta)" },
          type: {
            type: "string",
            enum: ["Negeri", "Swasta", "Agama", "Kedinasan"],
            description: "Filter jenis perguruan tinggi",
          },
          accreditation: {
            type: "string",
            enum: ["Unggul", "Baik Sekali", "Baik"],
            description: "Filter akreditasi institusi",
          },
          ptn_category: {
            type: "string",
            enum: ["PTN Akademik", "PTN Vokasi", "PTKIN"],
            description: "Kategori PTN (hanya untuk perguruan tinggi negeri)",
          },
          is_ptnbh: {
            type: "boolean",
            description: "True = hanya PTN Berbadan Hukum (misal UI, UGM, ITB), False = non-PTNBH",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_programs",
      description:
        "Cari program studi berdasarkan nama, jenjang, nama universitas, akreditasi prodi, atau provinsi kampus. Hasil: nama prodi, jenjang, akreditasi, jumlah mahasiswa & dosen, universitas, lokasi.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Nama program studi atau kata kunci (misal: kedokteran, teknik informatika)",
          },
          level: {
            type: "string",
            enum: ["S1", "D3", "D4", "S2", "S3", "Profesi"],
            description: "Filter jenjang pendidikan",
          },
          university: { type: "string", description: "Nama universitas penyelenggara" },
          accreditation: {
            type: "string",
            enum: ["Unggul", "Baik Sekali", "Baik"],
            description: "Filter akreditasi program studi",
          },
          province: { type: "string", description: "Filter kampus di provinsi tertentu" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_passing_grade",
      description:
        "Ambil data passing grade SNBP/SNBT untuk program studi tertentu. Hasil: tahun, daya tampung, peminat, diterima, passing grade (%).",
      parameters: {
        type: "object",
        properties: {
          program_name: { type: "string", description: "Nama program studi (misal: Kedokteran)" },
          university_name: { type: "string", description: "Nama universitas (opsional)" },
          year: { type: "integer", description: "Tahun (opsional, default semua tahun)" },
        },
        additionalProperties: false,
      },
    },
  },
];
