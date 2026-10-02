"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { EngineRun } from "@/components/assessment/engine-run";

/** Halaman engine (untuk preview/admin) — bungkus komponen dengan params query. */
export default function Page() {
  const search = useSearchParams();
  const code = search?.get("code") ?? "TALENT";
  const v = search?.get("v") ?? null;
  return (
    <Suspense fallback={<div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-brand-navy" /></div>}>
      <EngineRun code={code} defaultVersionId={v} />
    </Suspense>
  );
}