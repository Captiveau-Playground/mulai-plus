"use client";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { SiteHeader } from "@/components/admin/site-header";
import { PageState } from "@/components/ui/page-state";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useAuthorizePage } from "@/lib/auth-client";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthorized, isLoading } = useAuthorizePage({
    admin_dashboard: ["access"],
  });

  return (
    <PageState fillViewport isLoading={isLoading} isAuthorized={isAuthorized}>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "16rem",
          } as React.CSSProperties
        }
      >
        <AdminSidebar variant="inset" />
        <SidebarInset className="flex h-svh flex-col bg-bg-light!">
          <SiteHeader />
          <div className="h-0 min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </PageState>
  );
}
