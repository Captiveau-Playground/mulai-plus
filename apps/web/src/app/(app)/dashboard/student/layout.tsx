"use client";

import { ContactSupport } from "@/components/contact-support";
import DashboardFooter from "@/components/dashboard-footer";
import DashboardHeader from "@/components/dashboard-header";
import { StudentOnboardingTour } from "@/components/student/onboarding-tour";
import { StudentSidebar } from "@/components/student-sidebar";
import { PageState } from "@/components/ui/page-state";
import { SidebarInset, SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { useAuthorizePage } from "@/lib/auth-client";

function StudentDashboardContent({ children }: { children: React.ReactNode }) {
  const { setOpenMobile } = useSidebar();

  const handleNavigate = () => {
    setOpenMobile(false);
  };

  return (
    <>
      <StudentSidebar onNavigate={handleNavigate} />
      <SidebarInset className="!bg-bg-light">
        <div className="flex min-h-screen flex-col">
          <DashboardHeader />
          <div className="flex-1">{children}</div>
          <DashboardFooter />
        </div>
      </SidebarInset>
      <ContactSupport />
    </>
  );
}

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
        <StudentDashboardContent>{children}</StudentDashboardContent>
      </SidebarProvider>
      <StudentOnboardingTour />
    </PageState>
  );
}
