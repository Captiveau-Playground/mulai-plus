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
      <div className="flex h-full w-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
