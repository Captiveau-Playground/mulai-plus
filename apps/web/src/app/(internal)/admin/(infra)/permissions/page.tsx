"use client";

import { PermissionTable } from "@/components/admin/permission-table";
import { PageState } from "@/components/ui/page-state";
import { useAuthorizePage } from "@/lib/auth-client";

export default function PermissionsPage() {
  const { isAuthorized, isLoading } = useAuthorizePage({
    admin_dashboard: ["access"],
  });

  return (
    <PageState isLoading={isLoading} isAuthorized={isAuthorized}>
      <div className="min-h-screen flex-1 rounded-xl bg-muted/50 p-4 md:min-h-min">
        <h2 className="mb-4 font-bold text-2xl tracking-tight">Permission Management</h2>
        <PermissionTable />
      </div>
    </PageState>
  );
}
