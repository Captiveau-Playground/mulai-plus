"use client";

import { Loader2 } from "lucide-react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { SiteHeader } from "@/components/admin/site-header";
import { UserTable } from "@/components/admin/user-table";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useAuthorizePage } from "@/lib/auth-client";

export default function UsersPage() {
  const { isAuthorized, isLoading } = useAuthorizePage({
    admin_dashboard: ["access"],
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
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-muted-foreground">Unauthorized</p>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "16rem",
        } as React.CSSProperties
      }
    >
      <AdminSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-4">
          <div className="min-h-screen flex-1 rounded-xl bg-muted/50 p-4 md:min-h-min">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-2xl tracking-tight">User Management</h2>
            </div>
            <UserTable />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
