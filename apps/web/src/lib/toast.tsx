"use client";

import type { GooeyToastOptions } from "goey-toast";
/**
 * Helper toast "MULAI+" — gooey morphing + emoji + seluruh opsi goy-toast
 * (description, action, promise, showProgress, preset, callbacks, …).
 */
import { gooeyToast } from "goey-toast";

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
  error(title: string, opts?: NotifyOpts) {
    gooeyToast.error(`🙈 ${title}`, { ...withAction({ duration: 6000, ...opts }) });
  },
  info(title: string, opts?: NotifyOpts) {
    gooeyToast.info(`🤖 ${title}`, { ...withAction(opts) });
  },
  warn(title: string, opts?: NotifyOpts) {
    gooeyToast.warning(`⚠️ ${title}`, { ...withAction(opts) });
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
