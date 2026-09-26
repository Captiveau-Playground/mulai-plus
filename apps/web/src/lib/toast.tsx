"use client";

import type { GooeyToastOptions } from "goey-toast";
/**
 * Helper toast "MULAI+" — gooey morphing + emoji + seluruh opsi goy-toast
 * (description, action, promise, showProgress, preset, callbacks, …).
 */
import { gooeyToast } from "goey-toast";
import type { ReactNode } from "react";
import { useState } from "react";

const MAX_TITLE = 130;

/** Tombol salin untuk pesan panjang (dalam description toast). */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        void navigator.clipboard
          ?.writeText(text)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          })
          .catch(() => undefined);
      }}
      className="mt-1.5 shrink-0 self-start rounded-md border border-brand-navy/20 bg-brand-navy/5 px-2 py-1 font-manrope font-medium text-[11px] text-brand-navy hover:bg-brand-navy/10"
    >
      {copied ? "✓ Disalin" : "📋 Copy"}
    </button>
  );
}

/**
 * Pesan panjang → title dipangkas  + deskripsi scrollable (max 9rem = muat layar)
 * + tombol copy. Pesan pendek → polos.
 */
function longMessage(msg: string, max = MAX_TITLE): { title: string; description?: ReactNode } {
  const clean = msg.trim();
  if (clean.length <= max) return { title: clean };
  return {
    title: `${clean.slice(0, max)}…`,
    description: (
      // biome-ignore lint/a11y/noStaticElementInteractions: wrapper — mencegah klik di dalam deskripsi menutup toast
      <div
        role="presentation"
        className="flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div
          className="overflow-y-auto whitespace-pre-wrap rounded-md bg-black/5 p-2 font-mono text-[11px] leading-relaxed"
          style={{ maxHeight: "9rem" }}
        >
          {clean}
        </div>
        <CopyButton text={clean} />
      </div>
    ),
  };
}

export type NotifyRealOpts = Partial<
  Pick<
    GooeyToastOptions,
    | "description"
    | "action"
    | "duration"
    | "id"
    | "preset"
    | "showProgress"
    | "showTimestamp"
    | "onDismiss"
    | "onAutoClose"
    | "spring"
    | "bounce"
    | "fillColor"
    | "borderColor"
    | "borderWidth"
  >
>;

/** Extra shim yang nyaman: actionLabel/onAction diterjemahkan → action. */
export type NotifyOpts = NotifyRealOpts & { actionLabel?: string; onAction?: () => void };

function withAction(opts?: NotifyOpts): NotifyOpts | undefined {
  if (!opts) return opts;
  const { actionLabel, onAction, ...rest } = opts;
  if (actionLabel && onAction) {
    return { ...rest, action: { label: actionLabel, onClick: onAction } };
  }
  return rest as NotifyOpts;
}

export const notify = {
  success(title: string, opts?: NotifyOpts) {
    gooeyToast.success(`🎉 ${title}`, { ...withAction({ showProgress: true, ...opts }) });
  },
  /**
   * Error — dipastikan SELALU muat di layar:
   * - pesan pendek → title biasa (durasi 8s + optional action).
   * - pesan panjang → title dipotong + deskripsi scrollable (max 9rem) + tombol 📋 Copy.
   */
  error(title: string, opts?: NotifyOpts) {
    const { title: shortTitle, description } = longMessage(title);
    const merged = withAction({ duration: 8000, ...opts });
    gooeyToast.error(`🙈 ${shortTitle}`, { ...merged, description: description ?? merged?.description });
  },
  info(title: string, opts?: NotifyOpts) {
    gooeyToast.info(`🤖 ${title}`, { ...withAction(opts) });
  },
  warn(title: string, opts?: NotifyOpts) {
    const { title: shortTitle, description } = longMessage(title, 200);
    const merged = withAction({ duration: 7000, ...opts });
    gooeyToast.warning(`⚠️ ${shortTitle}`, { ...merged, description: description ?? merged?.description });
  },
  toast(title: string, opts?: NotifyOpts) {
    gooeyToast(title, withAction(opts));
  },
  /** Promise wrapper — loading ✨ → sukses 🎉 / gagal 🙈 + morph */
  promise<T>(p: Promise<T>, msgs: { loading: string; success: string; error: string }) {
    return gooeyToast.promise(p, {
      loading: `✨ ${msgs.loading}`,
      success: `🎉 ${msgs.success}`,
      error: `🙈 ${msgs.error}`,
    });
  },
  update(id: string | number, opts: Parameters<typeof gooeyToast.update>[1]) {
    gooeyToast.update(id, opts);
  },
  dismiss(idOrFilter?: Parameters<typeof gooeyToast.dismiss>[0]) {
    gooeyToast.dismiss(idOrFilter);
  },

  /**
   * Konteks per kebutuhan — jangan dipukul rata:
   *  create     → berhasil "membuat": durasi 4s + progress (jelas "selesai").
   *  updateDone → ringan: subtle, durasi 2.5s, opsional action "Muat ulang".
   *  error      → perhatian: durasi 7s, opsional action "Coba lagi" (retry).
   *  async      → progress morph: loading ✨ → success/error pill + action mengikuti.
   *  callbacks  → onDismiss/onAutoClose tersedia di semua (contoh: refresh list saat auto-close sukses).
   */
  create(title: string, opts?: NotifyOpts) {
    gooeyToast.success(`🎉 ${title}`, { ...withAction({ showProgress: true, duration: 4000, ...opts }) });
  },
  updateDone(title: string, opts?: NotifyOpts) {
    gooeyToast.success(`✦ ${title}`, { ...withAction({ preset: "subtle", duration: 2500, ...opts }) });
  },
  async<T>(
    p: Promise<T>,
    msgs: { loading: string; success: string; error: string },
    opts?: {
      successAction?: { label: string; onClick: () => void };
      errorAction?: { label: string; onClick: () => void };
    },
  ) {
    const data: Record<string, unknown> = {
      loading: `✨ ${msgs.loading}`,
      success: `🎉 ${msgs.success}`,
      error: `🙈 ${msgs.error}`,
    };
    if (opts?.successAction) data.action = { success: opts.successAction };
    if (opts?.errorAction) data.action = { ...(data.action as object), error: opts.errorAction };
    return gooeyToast.promise(p, data as unknown as Parameters<typeof gooeyToast.promise>[1]);
  },
};

/** Kompatibilitas API sonner (67 file lama) — tetap melalui gooeyToast. */
export { gooeyToast };
