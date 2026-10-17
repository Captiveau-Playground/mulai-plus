"use client";

import { cn } from "@/lib/utils";

/** Flame streak + dots minggu — hand-built sesuai design system (navy/orange). */
export function StreakFlame({
  days = 0,
  showDots = true,
  showLabel = true,
  className,
}: {
  days?: number;
  showDots?: boolean;
  showLabel?: boolean;
  className?: string;
}) {
  const capped = Math.min(7, days);
  const filled = Array.from({ length: 7 }).map((_, i) => i >= 7 - capped);

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 font-manrope text-[11px] font-bold text-orange-600">
        🔥 {days}
        {showLabel && <span className="font-medium text-orange-400">hari</span>}
      </span>
      {showDots && (
        <span aria-hidden className="flex items-center gap-[3px]">
          {filled.map((f, i) => (
            <span key={i} className={cn("h-1.5 w-1.5 rounded-full transition-colors", f ? "bg-orange-500" : "bg-gray-200")} />
          ))}
        </span>
      )}
    </div>
  );
}