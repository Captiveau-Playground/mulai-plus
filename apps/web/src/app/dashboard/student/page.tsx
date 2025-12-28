"use client";

import { Loader2, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthorizePage } from "@/lib/auth-client";

export default function StudentPage() {
  const { isAuthorized, isLoading, user } = useAuthorizePage({
    student_dashboard: ["access"],
  });

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <ShieldCheck className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="font-bold text-2xl">Access Denied</h1>
        <p className="text-muted-foreground">
          You need permission '<span className="font-bold font-mono text-foreground">access:student_dashboard</span>' to
          view this page.
        </p>
        <div className="text-center text-muted-foreground text-sm">
          <p>
            Your Role: <span className="font-semibold text-foreground">{user?.role || "none"}</span>
          </p>
          <p className="mt-1">Your Permissions:</p>
          <div className="mt-1 flex flex-wrap justify-center gap-1">
            {((user as any)?.permissions as string[])?.length > 0 ? (
              ((user as any)?.permissions as string[]).map((p) => (
                <span key={p} className="rounded-md bg-muted px-2 py-0.5 font-medium text-xs">
                  {p}
                </span>
              ))
            ) : (
              <span className="text-xs italic">No permissions assigned</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Student Dashboard</CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
