/**
 * Discord webhook notification — dipakai worker API & AI.
 *
 * - Fire-and-forget: tidak pernah membuat request utama gagal.
 * - `waitUntil` (executionCtx) bila tersedia — aman di Cloudflare Workers.
 * - Throttle per event (optional) supaya tidak spam (mis. quota exhausted).
 * - No-op jika `DISCORD_WEBHOOK_URL` kosong / bukan URL webhook Discord.
 */

export type DiscordField = { name: string; value: string; inline?: boolean };

export type NotifyEventInput = {
  /** Discord webhook URL (dari env/secret). Kosong → no-op. */
  webhookUrl?: string | null;
  /** Nama event — dipakai untuk throttle & label. */
  event: string;
  /** Judul embed. */
  title: string;
  description?: string;
  /** Discord embed color (decimal). Default oranye brand MULAI+ (#F38020). */
  color?: number;
  fields?: DiscordField[];
  waitUntil?: (p: Promise<unknown>) => void;
  /** Berapa ms antar notif untuk event yang sama. 0 = selalu kirim. */
  throttleMs?: number;
};

const DEFAULT_COLOR = 0xf38020;

const sentAt = new Map<string, number>();

export function discordConfigured(webhookUrl?: string | null): boolean {
  return !!webhookUrl && /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//i.test(webhookUrl);
}

export function buildDiscordPayload(input: Omit<NotifyEventInput, "webhookUrl" | "waitUntil" | "throttleMs">): unknown {
  return {
    username: "MULAI+ Bot",
    embeds: [
      {
        title: input.title,
        description: input.description,
        color: input.color ?? DEFAULT_COLOR,
        fields: input.fields?.length ? input.fields : undefined,
        timestamp: new Date().toISOString(),
        footer: { text: input.event },
      },
    ],
  };
}

async function sendDiscord(webhookUrl: string, payload: unknown): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Discord webhook ${res.status}: ${text.slice(0, 150)}`);
  }
}

/**
 * Kirim notifikasi ke Discord (throttled, fire-and-forget).
 * Panggil tanpa `await` — Promise akan dijalankan via `waitUntil` bila ada.
 */
export function notifyDiscord(input: NotifyEventInput): void {
  if (!discordConfigured(input.webhookUrl)) return;

  const throttleMs = input.throttleMs ?? 60_000;
  if (throttleMs > 0) {
    const now = Date.now();
    const key = `":${input.event}`;
    const last = sentAt.get(key) ?? 0;
    if (now - last < throttleMs) return;
    sentAt.set(key, now);
  }

  const payload = buildDiscordPayload({
    event: input.event,
    title: input.title,
    description: input.description,
    color: input.color,
    fields: input.fields,
  });

  const p = sendDiscord(input.webhookUrl as string, payload).catch((e) => {
    console.error(`[discord-notify:${input.event}]`, e);
  });

  if (input.waitUntil) {
    input.waitUntil(p);
  } else {
    void p;
  }
}
