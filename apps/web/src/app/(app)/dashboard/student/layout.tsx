"use client";

import { usePathname } from "next/navigation";
import DashboardFooter from "@/components/dashboard-footer";
import DashboardHeader from "@/components/dashboard-header";
import { FeedbackProvider } from "@/components/feedback-provider";
import { StudentOnboardingTour } from "@/components/student/onboarding-tour";
import { StudentSidebar } from "@/components/student-sidebar";
import { PageState } from "@/components/ui/page-state";
import { SidebarInset, SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { useAuthorizePage } from "@/lib/auth-client";

function StudentDashboardContent({ children }: { children: React.ReactNode }) {
  const { setOpenMobile } = useSidebar();
  const pathname = usePathname();
  // Asisten: area chat mengisi sisa tinggi viewport (scroll di dalam chat),
  // tapi header/footer dashboard & tombol toggle sidebar TETAP ada (konsisten dgn page lain).
  const fullVh = pathname.startsWith("/dashboard/student/assistant");

  const handleNavigate = () => {
    setOpenMobile(false);
  };

  return (
    <>
      <StudentSidebar onNavigate={handleNavigate} />
      <SidebarInset className="!bg-bg-light">
        <div className={`flex flex-col ${fullVh ? "h-dvh overflow-hidden" : "min-h-screen"}`}>
          <DashboardHeader />
          <div className={fullVh ? "min-h-0 flex-1 overflow-y-auto" : "flex-1"}>{children}</div>
          <DashboardFooter />
        </div>
      </SidebarInset>
    </>
  );
}

export default function StudentDashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthorized, isLoading } = useAuthorizePage({
    student_dashboard: ["access"],
  });

  return (
    <PageState fillViewport isLoading={isLoading} isAuthorized={isAuthorized}>
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
      <FeedbackProvider />
    </PageState>
  );
}
