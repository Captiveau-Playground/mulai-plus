/** Bersihkan jawaban dari spec tools yang bocor (legacy LLM kadang menulis skema tool ke teks). */
export function stripTools(text: string): string {
  let t = text.replace(/<tools>[\s\S]*?<\/tools>/gi, "");
  t = t.replace(/\{"type"\s*:\s*"function"[\s\S]*?\n\}\}/g, "");
  return t.trim();
}
