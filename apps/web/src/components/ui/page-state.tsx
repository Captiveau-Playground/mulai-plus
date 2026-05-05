"use client";

import { ArrowLeft, Loader2, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import type * as React from "react";
import { Button } from "@/components/ui/button";

interface PageStateProps {
  isLoading?: boolean;
  isAuthorized?: boolean | null;
  children?: React.ReactNode;
}

export function PageState({ isLoading = false, isAuthorized = true, children }: PageStateProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="mx-auto flex h-full w-full flex-col items-center justify-center gap-5 p-12">
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
      <div className="fade-in zoom-in flex h-full w-full animate-in flex-col items-center justify-center gap-4 p-8 duration-300">
        <div className="rounded-full bg-muted p-4">
          <ShieldAlert className="h-8 w-8 text-destructive" />
        </div>
        <div className="space-y-2 text-center">
          <h3 className="font-bold text-lg">Unauthorized Access</h3>
          <p className="max-w-[400px] text-muted-foreground text-sm">
            You do not have permission to view this page. Please contact your administrator if you believe this is a
            mistake.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
