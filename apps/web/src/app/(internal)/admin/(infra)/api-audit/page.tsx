"use client";

import { ApiAuditTable } from "@/components/admin/api-audit-table";
import { ApiCharts } from "@/components/admin/api-charts";
import { PageState } from "@/components/ui/page-state";
import { useAuthorizePage } from "@/lib/auth-client";

export default function ApiAuditPage() {
  const { isAuthorized, isLoading } = useAuthorizePage({
    admin_dashboard: ["access"],
  });

  return (
    <PageState isLoading={isLoading} isAuthorized={isAuthorized}>
      <div className="min-h-screen flex-1 rounded-xl bg-muted/50 p-4 md:min-h-min">
        <div className="mb-6">
          <h2 className="font-bold text-2xl tracking-tight">API Call Statistics</h2>
          <p className="text-muted-foreground text-sm">Monitor API usage, frequency, and trends over time.</p>
        </div>

        <ApiCharts />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-xl tracking-tight">Endpoint Details</h3>
          </div>
          <ApiAuditTable />
        </div>
      </div>
    </PageState>
  );
}
