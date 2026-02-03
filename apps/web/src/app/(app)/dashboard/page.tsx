"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import Loader from "@/components/loader";
import { authClient } from "@/lib/auth-client";

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

    const role = session.user.role;

    if (role === "admin") {
      router.push("/admin");
    } else if (role === "mentor") {
      router.push("/mentor");
    } else {
      router.push("/dashboard/student");
    }
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
