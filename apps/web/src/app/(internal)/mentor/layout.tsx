"use client";

import DashboardFooter from "@/components/dashboard-footer";
import DashboardHeader from "@/components/dashboard-header";
import { MentorSidebar } from "@/components/mentor/mentor-sidebar";
import { PageState } from "@/components/ui/page-state";
import { SidebarInset, SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { useAuthorizePage } from "@/lib/auth-client";

function MentorDashboardContent({ children }: { children: React.ReactNode }) {
  const { setOpenMobile, toggleSidebar } = useSidebar();

  const handleNavigate = () => {
    setOpenMobile(false);
  };

  return (
    <>
      <MentorSidebar onNavigate={handleNavigate} />
      <SidebarInset className="mentor-page-bg">
        <div className="flex min-h-screen flex-col">
          <DashboardHeader onMenuClick={toggleSidebar} />
          <div className="flex-1">{children}</div>
          <DashboardFooter />
        </div>
      </SidebarInset>
    </>
  );
}

export default function MentorLayout({ children }: { children: React.ReactNode }) {
  const { isAuthorized, isLoading } = useAuthorizePage({
    mentor_dashboard: ["access"],
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
        <MentorDashboardContent>{children}</MentorDashboardContent>
      </SidebarProvider>
    </PageState>
  );
}
