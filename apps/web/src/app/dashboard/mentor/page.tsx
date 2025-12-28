"use client";

import { Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePermission } from "@/lib/auth-client";

export default function MentorPage() {
  const router = useRouter();
  const { hasPermission, isPending, user } = usePermission();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (isPending) return;

    if (!user) {
      router.push("/login");
      return;
    }

    // Check permission 'access:mentor_dashboard'
    const hasAccess = hasPermission("access:mentor_dashboard");
    setIsAuthorized(hasAccess);
  }, [user, isPending, router, hasPermission]);

  if (isPending || isAuthorized === null) {
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
          You need permission '<span className="font-bold font-mono text-foreground">access:mentor_dashboard</span>' to
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
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-blue-500" />
            Mentor Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Welcome! You have access to this page because you have the permission{" "}
            <span className="font-bold font-mono text-foreground">access:mentor_dashboard</span>.
          </p>
          <div className="mt-4 rounded-md bg-muted p-4">
            <h3 className="mb-2 font-semibold">Debug Info:</h3>
            <pre className="overflow-auto text-xs">
              {JSON.stringify(
                {
                  userId: user?.id,
                  name: user?.name,
                  email: user?.email,
                  role: user?.role,
                  permissions: (user as any)?.permissions,
                },
                null,
                2,
              )}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
