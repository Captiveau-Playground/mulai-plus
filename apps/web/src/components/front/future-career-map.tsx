"use client";

import { Loader2 } from "lucide-react";
import type { MindElixirData } from "mind-elixir";
import { MindMap } from "@/components/ui/mindmap";

/**
 * Mind map readonly hasil "Karir Impian" — dirender dengan Mind Elixir,
 * gaya brand MULAI+ (branch color navy/teal/orange dari node data).
 */
export function FutureCareerMap({ data }: { data: MindElixirData }) {
  return (
    <div className="h-[420px] w-full overflow-hidden rounded-2xl border border-gray-100 bg-white md:h-[480px]">
      <MindMap
        data={data}
        readonly
        direction={1}
        compact
        contextMenu={false}
        keypress={false}
        theme="light"
        fit
        loader={
          <div className="absolute inset-0 flex items-center justify-center bg-white">
            <Loader2 className="h-6 w-6 animate-spin text-brand-navy" />
          </div>
        }
      />
    </div>
  );
}
