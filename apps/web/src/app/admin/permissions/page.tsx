"use client";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { PermissionTable } from "@/components/admin/permission-table";
import { SiteHeader } from "@/components/admin/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function PermissionsPage() {
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
            <h2 className="mb-4 font-bold text-2xl tracking-tight">Permission Management</h2>
            <PermissionTable />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
