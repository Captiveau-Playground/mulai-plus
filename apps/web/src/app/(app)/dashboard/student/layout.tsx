"use client";

import { StudentSidebar } from "@/components/student-sidebar";
import { PageState } from "@/components/ui/page-state";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useAuthorizePage } from "@/lib/auth-client";

export default function StudentDashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthorized, isLoading } = useAuthorizePage({
    student_dashboard: ["access"],
  });

  return (
    <PageState isLoading={isLoading} isAuthorized={isAuthorized}>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "280px",
          } as React.CSSProperties
        }
      >
        <StudentSidebar />
        <SidebarInset>
          <div className="min-h-screen bg-bg-light">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </PageState>
  );
}
