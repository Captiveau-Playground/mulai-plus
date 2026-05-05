"use client";

import { UserPlus } from "lucide-react";
import { useState } from "react";
import { CreateUserDialog } from "@/components/admin/user-actions-dialogs";
import { UserTable } from "@/components/admin/user-table";
import { Button } from "@/components/ui/button";
import { PageState } from "@/components/ui/page-state";
import { useAuthorizePage } from "@/lib/auth-client";

export default function UsersPage() {
  const { isAuthorized, isLoading } = useAuthorizePage({
    admin_dashboard: ["access"],
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <PageState isLoading={isLoading} isAuthorized={isAuthorized}>
      <div className="mentor-page-bg min-h-screen flex-1 rounded-xl bg-bg-light p-4 md:min-h-min">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-bold font-bricolage text-2xl text-brand-navy tracking-tight">User Management</h2>
            <p className="font-manrope text-sm text-text-muted-custom">Manage users, roles, and permissions</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="btn-mentor rounded-full">
            <UserPlus className="mr-2 h-4 w-4" />
            Create User
          </Button>
        </div>
        <UserTable key={refreshKey} />
        <CreateUserDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSuccess={() => setRefreshKey((k) => k + 1)}
        />
      </div>
    </PageState>
  );
}
