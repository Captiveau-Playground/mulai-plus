import { Loader2 } from "lucide-react";
import type * as React from "react";

interface PageStateProps {
  isLoading?: boolean;
  isAuthorized?: boolean | null;
  children?: React.ReactNode;
}

export function PageState({ isLoading = false, isAuthorized = true, children }: PageStateProps) {
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <p className="text-muted-foreground">Unauthorized</p>
      </div>
    );
  }

  return <>{children}</>;
}
