/**
 * Tool definitions — port dari apps/ai-python/src/tools.py.
 * TODO: manifest lengkap (search_universities, search_programs, passing grade,
 * beasiswa) + executor yang query DB via Hyperdrive.
 * Di sini baru manifest minimal supaya pipeline tools sudah terbentuk.
 */
import type { ToolDef } from "../llm/client";

export const TOOL_DEFINITIONS: ToolDef[] = [
  {
    type: "function",
    function: {
      name: "search_universities",
      description:
        "Cari perguruan tinggi berdasarkan nama, kota/kabupaten, provinsi, jenis (Negeri/Swasta/Agama/Kedinasan), akreditasi, kategori PTN (Akademik/Vokasi/PTKIN), atau status PTN-BH.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Nama universitas atau kata kunci" },
          city: { type: "string", description: "Filter kota/kabupaten (misal: Surabaya, Depok)" },
          province: { type: "string", description: "Filter provinsi (misal: Jawa Timur)" },
          type: { type: "string", enum: ["Negeri", "Swasta", "Agama", "Kedinasan"] },
          accreditation: { type: "string", enum: ["Unggul", "Baik Sekali", "Baik"] },
        },
        additionalProperties: false,
      },
    },
  },
];

/** TODO: executor — panggil prosedur @mulai-plus/api atau query via Hyperdrive. */
export function executeTool(name: string, _args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "search_universities":
      return Promise.resolve("TODO: executor belum di-port (query DB via Hyperdrive).");
    default:
      return Promise.resolve("Tool tidak dikenal.");
  }
}
