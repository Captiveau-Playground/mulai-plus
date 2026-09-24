/**
 * Agent source: KNOWLEDGE (RAG) — placeholder modular.
 *
 * Status: BELUM AKTIF (tidak didaftarkan ke registry). Desain kontrak sudah
 * siap supaya implementasi RAG (Vectorize + embeddings + chunking) tinggal
 * menempel tanpa mengubah responder:
 *
 *   registerSource({ name: "search_knowledge", ... execute: ragSearch })
 *
 * Langkah aktivasi (nanti):
 *  1. Vectorize index + pipeline chunking (artikel CMS, FAQ, program).
 *  2. embed query (Workers AI bge-m3) → top-k → prompt.
 *  3. Catat event `tool_called {tool:"search_knowledge"}`.
 */
import type { AgentContext, AgentSource } from "../registry";

export const RAG_SOURCE: AgentSource = {
  name: "search_knowledge",
  description: "Cari dokumen pengetahuan MULAI+ (artikel, FAQ, info program) — BELUM AKTIF.",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Pertanyaan atau kata kunci" },
      topK: { type: "number", description: "Jumlah hasil (default 5)" },
    },
    additionalProperties: false,
  },
  async execute(_ctx: AgentContext, args: Record<string, unknown>) {
    return `[RAG tidak aktif] Tidak ada hasil untuk '${String(args.query ?? "")}'. Gunakan tools SQL.`;
  },
};

/** Dipanggil sekali saat startup bila RAG sudah siap (saat ini no-op). */
export function initRag(_ctx: unknown): void {
  /* TODO: registerSource(RAG_SOURCE) setelah Vectorize + embeddings aktif. */
}
