"use client";

import type { GooeyToastOptions } from "goey-toast";
/**
 * Helper toast "MULAI+" — gooey morphing + emoji + seluruh opsi goy-toast
 * (description, action, promise, showProgress, preset, callbacks, …).
 */
import { gooeyToast } from "goey-toast";

const BRAND_COLORS = {
  success: { fillColor: "#0D9488", borderColor: "#0F766E" },
  error: { fillColor: "#F93447", borderColor: "#E11D48" },
  warning: { fillColor: "#FE9114", borderColor: "#EA580C" },
  info: { fillColor: "#1A1F6D", borderColor: "#312E81" },
} as const;

export type NotifyOpts = Partial<
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

export const notify = {
  success(title: string, opts?: NotifyOpts) {
    gooeyToast.success(`🎉 ${title}`, { ...BRAND_COLORS.success, showProgress: true, ...opts });
  },
  error(title: string, opts?: NotifyOpts) {
    gooeyToast.error(`🙈 ${title}`, { ...BRAND_COLORS.error, duration: 6000, preset: "bouncy", ...opts });
  },
  info(title: string, opts?: NotifyOpts) {
    gooeyToast.info(`🤖 ${title}`, { ...BRAND_COLORS.info, preset: "subtle", ...opts });
  },
  warn(title: string, opts?: NotifyOpts) {
    gooeyToast.warning(`⚠️ ${title}`, { ...BRAND_COLORS.warning, preset: "subtle", ...opts });
  },
  toast(title: string, opts?: NotifyOpts) {
    gooeyToast(title, opts);
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
};

/** Kompatibilitas API sonner (67 file lama) — tetap melalui gooeyToast. */
export { gooeyToast };
