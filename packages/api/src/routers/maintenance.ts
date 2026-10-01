import { db, eq } from "@mulai-plus/db/db";
import { systemSettings } from "@mulai-plus/db/schema/settings";

import { z } from "zod";
import { adminProcedure } from "../index";
import { unosend } from "../lib/unosend";

/** Flag maintenance — disimpan KV (runtime toggle tanpa deploy); fallback DB utk lokal. */
export const MAINTENANCE_KEY = "maintenance:flag";

export interface MaintenanceFlag {
  active: boolean;
  endsAt?: string | null;
  message?: string | null;
  updatedAt?: string;
}

async function readFlag(ctx: { env?: Record<string, any> }): Promise<MaintenanceFlag | null> {
  const kv = (ctx.env as any)?.KV_CACHE;
  if (kv?.get) {
    try {
      const raw = await kv.get(MAINTENANCE_KEY);
      if (raw) return JSON.parse(raw) as MaintenanceFlag;
    } catch {
      /* lanjut fallback */
    }
  }
  try {
    const row = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.key, MAINTENANCE_KEY),
    });
    return (row?.value as MaintenanceFlag) ?? null;
  } catch {
    return null;
  }
}

async function writeFlag(ctx: { env?: Record<string, any> }, flag: MaintenanceFlag) {
  const kv = (ctx.env as any)?.KV_CACHE;
  if (kv?.put) {
    await kv.put(MAINTENANCE_KEY, JSON.stringify(flag));
    return;
  }
  // Dev lokal tanpa KV → simpan di system_settings
  const existing = await db.query.systemSettings.findFirst({
    where: eq(systemSettings.key, MAINTENANCE_KEY),
  });
  if (existing) {
    await db.update(systemSettings).set({ value: flag }).where(eq(systemSettings.key, MAINTENANCE_KEY));
  } else {
    await db.insert(systemSettings).values({ key: MAINTENANCE_KEY, value: flag });
  }
}

/** HTML notifikasi maintenance utk email blast (gaya konsisten dgn template broadcast). */
function maintenanceEmailHtml(opts: { endsAt?: string | null; message?: string | null }): string {
  const eta =
    opts.endsAt && !Number.isNaN(new Date(opts.endsAt).getTime())
      ? new Date(opts.endsAt).toLocaleString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "beberapa jam ke depan";
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;"><tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,.06);">
<tr><td align="center" style="padding:40px 40px 16px;">
  <div style="font-size:30px;font-weight:800;color:#1a1f6d;">MULAI<b style="color:#fe9114;">+</b></div>
</td></tr>
<tr><td align="center" style="padding:0 40px 8px;"><span style="display:inline-block;padding:5px 14px;border-radius:999px;background:#fef1e6;color:#c2540b;font-size:12px;font-weight:700;">🔧 PEMELIHARAAN TERJADWAL</span></td></tr>
<tr><td align="center" style="padding:0 40px 16px;"><h1 style="margin:0;font-size:22px;color:#1a1f6d;">Kami sedang melakukan pembaruan sistem</h1></td></tr>
<tr><td style="padding:0 40px 8px;"><p style="margin:0;font-size:14px;color:#666;line-height:1.7;text-align:center;">${opts.message ? opts.message.replace(/</g, "&lt;").replace(/>/g, "&gt;") : "Sebentar lagi akan kembali normal — semua aksi di dashboard (tes minat &amp; bakat, AI Assistant Mul.ai, dan laporan PDF) untuk sementara dinonaktifkan."}</p></td></tr>
<tr><td align="center" style="padding:8px 40px 12px;"><p style="margin:0;font-size:14px;color:#444;line-height:1.7;">⏱️ Estimasi selesai: <b style="color:#1a1f6d;">${eta}</b></p></td></tr>
<tr><td align="center" style="padding:0 40px 8px;"><p style="margin:0;font-size:12px;color:#8a8a92;">Data kamu aman dan tidak berubah.</p></td></tr>
<tr><td style="padding:20px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td style="height:1px;background:#e5e7eb;"></td></tr></table></td></tr>
<tr><td align="center" style="padding:16px 40px 8px;"><p style="margin:0;font-size:12px;color:#999;line-height:1.7;">Butuh bantuan saat maintenance? Hubungi kami:<br/><a href="mailto:support@mulaiplus.id" style="color:#3b82f6;text-decoration:none;">support@mulaiplus.id</a> · <a href="https://instagram.com/mulaiplus.id" style="color:#3b82f6;text-decoration:none;">Instagram</a> · <a href="https://threads.net/@mulaiplus.id" style="color:#3b82f6;text-decoration:none;">Threads</a> · <a href="https://mulaiplus.id" style="color:#3b82f6;text-decoration:none;">mulaiplus.id</a></p></td></tr>
<tr><td align="center" style="padding:4px 40px 32px;"><p style="margin:0;font-size:11px;color:#aaa;">© MULAI+ · semua hak dilindungi.</p></td></tr>
</table></td></tr></table>
</body></html>`;
}

/** Kirim notifikasi email ke seluruh user (fire-and-forget via waitUntil). */
async function notifyAllUsers(opts: { endsAt?: string | null; message?: string | null; executionCtx?: any }) {
  try {
    const all = (await (db.query.user as any).findMany({
      columns: { email: true },
    }).catch(() => [])) as { email: string | null }[];
    const emails = [...new Set(all.map((u) => u.email).filter((e): e is string => !!e))];
    if (emails.length === 0) return;

    const subject = "🔧 MULAI+ sedang maintenance — estimasi selesai segera";
    const html = maintenanceEmailHtml(opts);

    // chunk per 200 untuk keamanan payload
    for (let i = 0; i < emails.length; i += 200) {
      await unosend.send({
        to: emails.slice(i, i + 200),
        subject,
        html,
      });
    }
  } catch {
    /* email blast gagal → jangan gagalkan toggle */
  }
}

export const maintenanceRouter = {
  /** Status maintenance saat ini (admin). */
  get: adminProcedure.handler(async ({ context }) => {
    const flag = await readFlag(context);
    const secretOn = (context.env as any)?.MAINTENANCE === "1" || (context.env as any)?.SOFT_MAINTENANCE === "1";
    return {
      active: flag?.active === true || secretOn,
      endsAt: flag?.endsAt ?? null,
      message: flag?.message ?? null,
      updatedAt: flag?.updatedAt ?? null,
      via: flag?.active === true ? "kv" : secretOn ? "secret" : "none",
    };
  }),

  /** On/off mode maintenance (admin). aktif=true → semua dashboard non-admin di-gate + email blast. */
  set: adminProcedure
    .input(
      z.object({
        active: z.boolean(),
        endsAt: z.string().nullable().optional(),
        message: z.string().nullable().optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      const flag: MaintenanceFlag = {
        active: input.active,
        endsAt: input.endsAt ?? null,
        message: input.message ?? null,
        updatedAt: new Date().toISOString(),
      };
      await writeFlag(context, flag);

      // Notifikasi email ke seluruh user (fire-and-forget, respons toggle tetap cepat)
      if (input.active) {
        const executionCtx = (context as any).executionCtx;
        const task = notifyAllUsers({
          endsAt: flag.endsAt,
          message: flag.message,
          executionCtx,
        });
        if (executionCtx?.waitUntil) executionCtx.waitUntil(task);
        else void task.catch(() => {});
      }
      return { ok: true, ...flag };
    }),
};