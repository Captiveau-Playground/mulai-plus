"use client";

/**
 * Helper toast "MULAI+" — lucu & keren, ikut desain system.
 * Semua API dari sonner, ditambah emoji & deskripsi opsional + action.
 */
import { toast } from "sonner";

type NotifyOpts = {
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

function withOpts(opts: NotifyOpts = {}): Record<string, unknown> {
  const base: Record<string, unknown> = {};
  if (opts.description) base.description = opts.description;
  if (opts.actionLabel && opts.onAction) {
    base.action = { label: opts.actionLabel, onClick: opts.onAction };
  }
  return base;
}

export const notify = {
  success(title: string, opts?: NotifyOpts) {
    toast.success(`🎉 ${title}`, withOpts(opts));
  },
  error(title: string, opts?: NotifyOpts) {
    toast.error(`🙈 ${title}`, withOpts(opts));
  },
  info(title: string, opts?: NotifyOpts) {
    toast.info(`🤖 ${title}`, withOpts(opts));
  },
  warn(title: string, opts?: NotifyOpts) {
    toast.warning(`⚠️ ${title}`, withOpts(opts));
  },
  /** Promise wrapper — loading dengan ✨ → sukses 🎉 / gagal 🙈 */
  promise<T>(p: Promise<T>, msgs: { loading: string; success: string; error: string }) {
    return toast.promise(p, {
      loading: `✨ ${msgs.loading}`,
      success: `🎉 ${msgs.success}`,
      error: `🙈 ${msgs.error}`,
    });
  },
};
