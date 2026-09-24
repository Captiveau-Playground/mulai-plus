/**
 * Agent source — unit modular tempat chatbot mengambil konteks.
 *
 * Sekarang: SQL tools (universitas/prodi/passing grade).
 * Kedepan: RAG (Vectorize), web search, dokumen program, dll — tinggal
 * mendaftarkan `AgentSource` baru ke registry (lihat sources/rag.ts yang masih stub).
 *
 * LLM melihat ini sebagai tool calling (`tools`), eksekusi lewat execute().
 */
import type { AppContext } from "../config";

export interface AgentContext {
  c: AppContext;
  sessionId: string;
  userId: string | null;
}

export interface AgentSource {
  /** Nama tool yang tampak ke LLM (pakai snake_case). */
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  /** Eksekusi source → string hasil yang diembalikan ke LLM. */
  execute(ctx: AgentContext, args: Record<string, unknown>): Promise<string>;
}

/** Registry — sources aktif yang boleh dipanggil model. */
const registry = new Map<string, AgentSource>();

export function registerSource(source: AgentSource): void {
  registry.set(source.name, source);
}

export function getSources(): AgentSource[] {
  return [...registry.values()];
}

export function toolDefinitions(): {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}[] {
  return getSources().map((s) => ({
    type: "function",
    function: { name: s.name, description: s.description, parameters: s.parameters },
  }));
}

export async function dispatchTool(ctx: AgentContext, name: string, args: Record<string, unknown>): Promise<string> {
  const source = registry.get(name);
  if (!source) return `Error: tool '${name}' tidak dikenal.`;
  try {
    return await source.execute(ctx, args);
  } catch (e) {
    console.error(`[agent] ${name} error:`, (e as Error).message);
    return `Maaf, terjadi kesalahan saat mengambil data: ${(e as Error).message.slice(0, 200)}`;
  }
}
