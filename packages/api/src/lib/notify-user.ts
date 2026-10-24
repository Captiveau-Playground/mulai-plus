// (M5.1) Notifikasi pengguna: in-app (tabel `notification`) + email opsional (Resend).
// Dipakai modul assessment (hasil selesai, kelas selesai, pengingat) dan admin.
import { randomUUID } from "node:crypto";
import { db, eq } from "@mulai-plus/db/db";
import { user } from "@mulai-plus/db/schema/auth";
import { notification } from "@mulai-plus/db/schema/notification";
import { resend } from "./resend";

export type NotifyType = "info" | "success" | "warning" | "error";

export interface NotifyUserInput {
  userId: string;
  title: string;
  message: string;
  type?: NotifyType;
  link?: string | null;
  /**
   * Kunci unik notifikasi otomatis. Bila sudah ada notifikasi dengan kunci ini,
   * insert dilewati (anti-dobel untuk pemicu berulang / cron).
   */
  dedupeKey?: string | null;
  /** Email opsional — dimatikan bila tidak diisi atau Resend belum dikonfigurasi. */
  email?: { subject?: string; html?: string } | null;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Kirim email best-effort: kegagalan tidak boleh menggagalkan alur utama. */
async function maybeSendEmail(to: string | null | undefined, subject: string, html: string) {
  if (!to || !process.env.RESEND_API_KEY) return;
  try {
    await resend.emails.send({ to, subject, html });
  } catch (e: any) {
    console.error("[notify][email] gagal:", e?.message ?? e);
  }
}

/**
 * Tulis notifikasi in-app untuk satu pengguna (+ email bila diminta).
 * Mengembalikan `created: false` bila dilewati karena `dedupeKey` sudah ada.
 */
export async function notifyUser(input: NotifyUserInput): Promise<{ created: boolean }> {
  // Akun harus benar-benar ada (id siswa preview/e2e sintetis tidak punya baris user).
  const [target] = await db.select({ email: user.email }).from(user).where(eq(user.id, input.userId));
  if (!target) return { created: false };

  const row = await db
    .insert(notification)
    .values({
      id: randomUUID(),
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type ?? "info",
      link: input.link ?? null,
      dedupeKey: input.dedupeKey ?? null,
    })
    .onConflictDoNothing()
    .returning({ id: notification.id });

  const created = row.length > 0;
  if (created && input.email) {
    const subject = input.email.subject ?? input.title;
    const html =
      input.email.html ??
      `<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5">
         <h2 style="margin:0 0 8px">${escapeHtml(input.title)}</h2>
         <p style="margin:0 0 12px;color:#374151">${escapeHtml(input.message)}</p>
         ${
           input.link
             ? `<p><a href="${input.link}" style="background:#0f766e;color:#fff;padding:8px 14px;border-radius:8px;text-decoration:none">Buka di MULAI+</a></p>`
             : ""
}
         <p style="color:#9ca3af;font-size:12px">Email otomatis dari MULAI+. Tidak perlu dibalas.</p>
       </div>`;
    await maybeSendEmail(target.email, subject, html);
  }
  return { created };
}

/** Notifikasi yang sama ke banyak pengguna (mis. semua admin sekolah). */
export async function notifyUsers(
  userIds: string[],
  base: Omit<NotifyUserInput, "userId" | "dedupeKey"> & { dedupeKeyBase?: string | null },
): Promise<number> {
  let created = 0;
  for (const userId of [...new Set(userIds.filter(Boolean))]) {
    const { dedupeKeyBase, ...rest } = base;
    const r = await notifyUser({
      ...rest,
      userId,
      dedupeKey: dedupeKeyBase ? `${dedupeKeyBase}:${userId}` : null,
    });
    if (r.created) created++;
  }
  return created;
}

/** Tanggal (YYYY-MM-DD, zona Asia/Jakarta) untuk kunci dedupe harian. */
export function todayKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
