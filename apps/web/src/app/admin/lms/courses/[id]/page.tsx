"use client";

import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { CourseContent } from "@/components/admin/lms/course-content";
import { CourseSettings } from "@/components/admin/lms/course-settings";
import { SiteHeader } from "@/components/admin/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useAuthorizePage } from "@/lib/auth-client";

export default function AdminCourseContentPage() {
  const params = useParams();
  const courseId = params.id as string;

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
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl bg-muted/50 p-4">
              <CourseSettings courseId={courseId} />
            </div>
            <div className="rounded-xl bg-muted/50 p-4">
              <CourseContent courseId={courseId} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
