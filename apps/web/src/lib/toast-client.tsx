"use client";

import { gooeyToast } from "goey-toast";

type T = typeof gooeyToast;

/** gooey-toast tidak punya `.loading` — buat shim via default toast + spinner. */
function loading(title: string, options?: Parameters<T>[1]) {
  return gooeyToast(title, { ...options, icon: <Loader className="size-4 animate-spin" /> });
}

/** Kompatibilitas API sonner+— semua pemanggilan `import { toast } dari ...` memakai ini. */
export const toast = Object.assign(gooeyToast, { loading }) as T & { loading: typeof loading };
export { gooeyToast };
