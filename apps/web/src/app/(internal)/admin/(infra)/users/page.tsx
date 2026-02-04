"use client";

import { UserTable } from "@/components/admin/user-table";
import { PageState } from "@/components/ui/page-state";
import { useAuthorizePage } from "@/lib/auth-client";

export default function UsersPage() {
  const { isAuthorized, isLoading } = useAuthorizePage({
    admin_dashboard: ["access"],
  });

  return (
    <PageState isLoading={isLoading} isAuthorized={isAuthorized}>
      <div className="min-h-screen flex-1 rounded-xl bg-muted/50 p-4 md:min-h-min">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-2xl tracking-tight">User Management</h2>
        </div>
        <UserTable />
      </div>
    </PageState>
  );
}
