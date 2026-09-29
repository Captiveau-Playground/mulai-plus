/**
 * Guardrail lapisan input — filter sebelum request masuk pipeline LLM.
 *
 * Layer:
 *  1. Shape & panjang pesan
 *  2. Karakter kendali / obfuscation abuse
 *  3. Pola injeksi prompt langsung (pola sederhana, non-blocking keras → di-side-channel)
 *  4. (via route) banned session/user — di sini cek per-session ban
 *
 * Catatan PM: guardrail bukan firewall SEMPURNA; tujuannya menyeragamkan
 * batas & mencatat sinyal (event `guardrail_blocked`) untuk admin.
 */
const MAX_MESSAGE_LEN = 4000;

export type GuardResult = { ok: boolean; reason?: string };

/** Pemeriksaan statis (tanpa DB) — murah, jalan pertama. */
export function validateMessageInput(raw: unknown): GuardResult {
  if (typeof raw !== "string") return { ok: false, reason: "invalid_type" };
  const msg = raw.trim();
  if (msg.length === 0) return { ok: false, reason: "empty" };
  if (msg.length > MAX_MESSAGE_LEN) return { ok: false, reason: "too_long" };
  // blok karakter kendali selain \n\t\r biasa (obfuscation / null bytes)
  if (hasControlChars(msg)) return { ok: false, reason: "ctrl_chars" };
  // terlalu banyak repeated token → kemungkinan spam
  if (/(.+?)\1{10,}/.test(msg)) return { ok: false, reason: "spammy" };
  return { ok: true };
}

function hasControlChars(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if ((c >= 0x00 && c <= 0x08) || c === 0x0b || c === 0x0c || (c >= 0x0e && c <= 0x1f) || c === 0x7f) return true;
  }
  return false;
}

/** Tandai request yang mencurigakan (injection attempt) — dicatat, bukan diblok (logika di LLM prompt). */
export function promptInjectionScore(message: string): number {
  const lower = message.toLowerCase();
  const patterns = [
    "ignore previous instructions",
    "abaikan instruksi",
    "system prompt",
    "you are now",
    "jangan patuhi",
    "lupakan instruksi",
  ];
  let score = 0;
  for (const p of patterns) {
    if (lower.includes(p)) score += 1;
  }
  return Math.min(score, 3);
}
