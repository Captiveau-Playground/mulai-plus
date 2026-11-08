"use client";

// Rute lama /assessment/talent — sekarang hanya mengarahkan ke halaman tes kanonik
// (`/dashboard/student/assessment/take/<CODE>`) supaya TIDAK ada dua UI tes yang berbeda.
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-brand-navy" />
        </div>
      }
    >
      <RedirectToCanonicalTest />
    </Suspense>
  );
}

function RedirectToCanonicalTest() {
  const params = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    const code = params?.get("code") ?? "TALENT";
    const v = params?.get("v");
    router.replace(`/dashboard/student/assessment/take/${code}${v ? `?v=${v}` : ""}`);
  }, [params, router]);
  return (
    <div className="flex justify-center py-24">
      <Loader2 className="h-6 w-6 animate-spin text-brand-navy" />
    </div>
  );
}
