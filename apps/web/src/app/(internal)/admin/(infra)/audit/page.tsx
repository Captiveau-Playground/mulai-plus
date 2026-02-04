"use client";

import { AuditTable } from "@/components/admin/audit-table";
import { PageState } from "@/components/ui/page-state";
import { useAuthorizePage } from "@/lib/auth-client";

export default function AuditPage() {
  const { isAuthorized, isLoading } = useAuthorizePage({
    admin_dashboard: ["access"],
  });

  return (
    <PageState isLoading={isLoading} isAuthorized={isAuthorized}>
      <div className="min-h-screen flex-1 rounded-xl bg-muted/50 p-4 md:min-h-min">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-2xl tracking-tight">Audit Logs</h2>
        </div>
        <AuditTable />
      </div>
    </PageState>
  );
}
