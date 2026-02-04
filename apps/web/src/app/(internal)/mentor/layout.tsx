"use client";

import { SiteHeader } from "@/components/admin/site-header";
import { MentorSidebar } from "@/components/mentor/mentor-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function MentorLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "16rem",
        } as React.CSSProperties
      }
    >
      <MentorSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
