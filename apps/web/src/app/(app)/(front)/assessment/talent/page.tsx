"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { EngineRun } from "@/components/assessment/engine-run";

/** Tengah engine — parameter query dibaca di dalam Suspense (utk preview/admin). */
export default function Page() {
  return (
    <Suspense fallback={<div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-brand-navy" /></div>}>
      <TalentParams />
    </Suspense>
  );
}

function TalentParams() {
  const search = useSearchParams();
  const code = search?.get("code") ?? "TALENT";
  const v = search?.get("v") ?? null;
  return <EngineRun code={code} defaultVersionId={v} />;
}
