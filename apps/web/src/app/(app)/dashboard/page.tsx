"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import Loader from "@/components/loader";
import { authClient } from "@/lib/auth-client";
import { homeForRole } from "@/lib/role-home";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (isPending) return;

    if (!session) {
      const params = new URLSearchParams(searchParams.toString());
      router.push(`/login?${params.toString()}`);
      return;
    }

    // Beranda per role (satu sumber kebenaran: lib/role-home)
    router.push(homeForRole(session.user.role) as Parameters<typeof router.push>[0]);
  }, [session, isPending, router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
