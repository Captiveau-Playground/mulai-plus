"use client";

import { Loader2 } from "lucide-react";
import { AuditTable } from "@/components/admin/audit-table";
import { useAuthorizePage } from "@/lib/auth-client";

export default function AuditPage() {
  const { isAuthorized, isLoading } = useAuthorizePage({
    admin_dashboard: ["access"],
  });

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-muted-foreground">Unauthorized</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex-1 rounded-xl bg-muted/50 p-4 md:min-h-min">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-bold text-2xl tracking-tight">Audit Logs</h2>
      </div>
      <AuditTable />
    </div>
  );
}
