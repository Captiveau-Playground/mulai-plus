"use client";

import { BarChart3, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { clearCompare, getCompareList, removeFromCompare } from "./compare-bar";

export function CompareFloatingBar() {
  const [items, setItems] = useState<{ id: string; name: string }[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setItems(getCompareList());

    const handler = () => setItems(getCompareList());
    window.addEventListener("compare-updated", handler);
    return () => window.removeEventListener("compare-updated", handler);
  }, []);

  if (!mounted || items.length === 0) return null;

  return (
    <div className="fixed right-3 bottom-3 z-[999] sm:right-4 sm:bottom-4">
      <div className="rounded-xl border border-brand-navy/20 bg-white shadow-brand-navy/10 shadow-xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.5">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <BarChart3 className="h-3.5 w-3.5 text-brand-navy sm:h-4 sm:w-4" />
            <span className="font-manrope font-semibold text-[10px] text-brand-navy sm:text-xs">{items.length}</span>
          </div>
          <button
            type="button"
            onClick={clearCompare}
            className="font-manrope text-[9px] text-text-muted-custom underline transition-colors hover:text-red-500 sm:text-[10px]"
          >
            Hapus
          </button>
        </div>

        {/* Items — hidden on mobile, show on sm+ */}
        <div className="hidden max-h-32 space-y-0.5 overflow-y-auto px-4 py-1.5 sm:block">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2">
              <span className="truncate font-manrope text-text-main text-xs">{item.name}</span>
              <button
                type="button"
                onClick={() => removeFromCompare(item.id)}
                className="shrink-0 rounded-full p-0.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className={cn("px-3 pb-2 sm:px-4 sm:pb-3", items.length < 2 && "opacity-50")}>
          <Link
            href={`/explore/compare?type=university&ids=${items.map((i) => i.id).join(",")}`}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-navy py-2 font-manrope font-semibold text-[10px] text-white shadow-sm transition-all hover:bg-brand-navy/90 sm:rounded-xl sm:py-2.5 sm:text-xs"
            onClick={items.length < 2 ? (e) => e.preventDefault() : undefined}
          >
            <BarChart3 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            {items.length}
          </Link>
        </div>
      </div>
    </div>
  );
}
