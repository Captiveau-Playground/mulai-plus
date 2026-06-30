"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

interface AuthGateProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function AuthGate({ children, title = "Akses Data Eksklusif", description }: AuthGateProps) {
  const { data: session, isPending } = authClient.useSession();

  // Still loading session
  if (isPending) {
    return (
      <div className="py-8">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-48 rounded bg-gray-200" />
          <div className="h-4 w-64 rounded bg-gray-100" />
        </div>
      </div>
    );
  }

  // User is logged in — show content
  if (session) {
    return <>{children}</>;
  }

  // Not logged in — show CTA
  const defaultDescription =
    description ??
    "Daftar gratis untuk melihat daya tampung, passing grade SNBP/SNBT, dan analisis keketatan 5 tahun terakhir.";

  return (
    <div className="rounded-2xl border border-brand-navy/20 border-dashed bg-gradient-to-br from-brand-navy/[0.02] to-brand-orange/[0.02] p-8 sm:p-10">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-navy to-brand-navy/80 shadow-lg">
          <Sparkles className="h-7 w-7 text-white" />
        </div>
        <h3 className="font-bold font-bricolage text-brand-navy text-lg sm:text-xl">{title}</h3>
        <p className="mt-2 font-manrope text-sm text-text-muted-custom leading-relaxed">{defaultDescription}</p>
        <div className="mt-6 flex justify-center">
          <Button
            asChild
            className="cursor-pointer rounded-xl bg-brand-navy px-8 py-5 font-manrope font-semibold text-sm text-white shadow-sm transition-all hover:bg-brand-navy/90"
          >
            <Link
              href={`/login?callbackUrl=${typeof window !== "undefined" ? encodeURIComponent(window.location.pathname) : ""}`}
            >
              Daftar Gratis
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
