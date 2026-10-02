"use client";

import { Suspense } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { EngineRun } from "@/components/assessment/engine-run";

/** Tes engine dalam UI student (dashboard wizard). code = kode tes engine (DISCOVER/TALENT), preview = versi. */
export default function TakeEnginePage() {
  const params = useParams();
  const code = String(params.code ?? "TALENT");

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/student/assessment"
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 font-manrope text-xs font-semibold text-gray-600 hover:bg-gray-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Pilih Test
        </Link>
        <span className="font-manrope text-xs text-muted-foreground">Tes {code === "DISCOVER" ? "Minat" : "Bakat"} — jawaban tersimpan otomatis</span>
      </div>
      <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-brand-navy" /></div>}>
        <EngineRun code={code} />
      </Suspense>
    </div>
  );
}
