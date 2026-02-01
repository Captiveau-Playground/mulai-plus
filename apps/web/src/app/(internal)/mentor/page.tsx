"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Calendar, CheckCircle, Clock, Loader2, Users } from "lucide-react";
import { SiteHeader } from "@/components/admin/site-header";
import { MentorSidebar } from "@/components/mentor/mentor-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthorizePage } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export default function MentorDashboardPage() {
  const { isAuthorized, isLoading: isAuthLoading } = useAuthorizePage({
    mentor_dashboard: ["access"],
  });

  const {
    data: stats,
    isLoading,
    isError,
  } = useQuery(
    orpc.programActivities.mentor.getStats.queryOptions({
      enabled: !!isAuthorized,
    }),
  );

  if (isAuthLoading) {
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

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
      <MentorSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-4">
          <div className="grid auto-rows-min gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="font-medium text-sm">Total Sessions</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">
                  {isLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : isError ? (
                    <span className="flex items-center gap-2 text-destructive text-sm">
                      <AlertCircle className="h-4 w-4" /> Error
                    </span>
                  ) : (
                    (stats?.totalSessions ?? 0)
                  )}
                </div>
                <p className="text-muted-foreground text-xs">All assigned sessions</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="font-medium text-sm">Upcoming Sessions</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">
                  {isLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : isError ? (
                    <span className="flex items-center gap-2 text-destructive text-sm">
                      <AlertCircle className="h-4 w-4" /> Error
                    </span>
                  ) : (
                    (stats?.upcomingSessions ?? 0)
                  )}
                </div>
                <p className="text-muted-foreground text-xs">Scheduled for future</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="font-medium text-sm">Completed Sessions</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">
                  {isLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : isError ? (
                    <span className="flex items-center gap-2 text-destructive text-sm">
                      <AlertCircle className="h-4 w-4" /> Error
                    </span>
                  ) : (
                    (stats?.completedSessions ?? 0)
                  )}
                </div>
                <p className="text-muted-foreground text-xs">Successfully finished</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="font-medium text-sm">Assigned Batches</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">
                  {isLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : isError ? (
                    <span className="flex items-center gap-2 text-destructive text-sm">
                      <AlertCircle className="h-4 w-4" /> Error
                    </span>
                  ) : (
                    (stats?.assignedBatches ?? 0)
                  )}
                </div>
                <p className="text-muted-foreground text-xs">Active batches</p>
              </CardContent>
            </Card>
          </div>
          <div className="flex min-h-[50vh] flex-1 items-center justify-center rounded-xl bg-muted/50 p-8 text-muted-foreground">
            Select a batch or session from the sidebar to manage your activities.
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
