"use client";

import { SiteHeader } from "@/components/admin/site-header";
import { ProgramManagerSidebar } from "@/components/program-manager/program-manager-sidebar";
import { PageState } from "@/components/ui/page-state";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useAuthorizePage } from "@/lib/auth-client";

export default function ProgramManagerLayout({ children }: { children: React.ReactNode }) {
  const { isAuthorized, isLoading } = useAuthorizePage({
    program_manager_dashboard: ["access"],
  });

  return (
    <PageState isLoading={isLoading} isAuthorized={isAuthorized}>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "16rem",
          } as React.CSSProperties
        }
      >
        <ProgramManagerSidebar variant="inset" />
        <SidebarInset className="!bg-bg-light flex h-screen flex-col">
          <SiteHeader />
          <div className="flex-1 overflow-y-auto p-4">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </PageState>
  );
}
