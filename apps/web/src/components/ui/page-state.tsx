"use client";

import { ArrowLeft, Loader2, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import type * as React from "react";
import { Button } from "@/components/ui/button";

interface PageStateProps {
  isLoading?: boolean;
  isAuthorized?: boolean | null;
  children?: React.ReactNode;
  /** Mode layout (bungkus SidebarProvider): render tengah viewport, bukan h-full dari parent */
  fillViewport?: boolean;
}

export function PageState({ isLoading = false, isAuthorized = true, children, fillViewport = false }: PageStateProps) {
  const router = useRouter();
  // fillViewport = render standalone (layout mode) → tinggi viewport agar centering bekerja.
  // Selain itu = di dalam area konten (page mode) → h-full dari scroll area.
  const heightClass = fillViewport ? "min-h-svh" : "h-full";

  if (isLoading) {
    return (
      <div className={`mx-auto flex ${heightClass} w-full flex-col items-center justify-center gap-5 p-12`}>
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-navy to-mentor-teal shadow-brand-navy/20 shadow-lg">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
        <div className="space-y-2 text-center">
          <div className="mx-auto h-3 w-40 animate-pulse rounded-full bg-gray-200" />
          <div className="mx-auto h-2.5 w-28 animate-pulse rounded-full bg-gray-100" />
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div
        className={`fade-in zoom-in flex ${heightClass} w-full animate-in flex-col items-center justify-center gap-6 px-4 duration-300`}
      >
        {/* Icon dekoratif — konsisten dengan halaman error lain (not-found) */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-32 w-32 rounded-full bg-destructive/10 blur-3xl" />
          </div>
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
        </div>

        <div className="space-y-2 text-center">
          <h3 className="font-bold font-bricolage text-2xl text-text-main sm:text-3xl">Unauthorized Access</h3>
          <p className="mx-auto max-w-md font-manrope text-sm text-text-muted-custom">
            You do not have permission to view this page. Please contact your administrator if you believe this is a
            mistake.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={() => router.back()}
            className="gap-2 rounded-full bg-brand-navy px-8 py-4 text-sm text-white shadow-md transition-all hover:translate-y-[-1px] hover:bg-brand-navy/90 hover:shadow-lg"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/")}
            className="gap-2 rounded-full border-gray-200 px-8 py-4 text-sm text-text-main transition-all hover:border-brand-navy/30 hover:bg-brand-navy/5"
          >
            Home
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
