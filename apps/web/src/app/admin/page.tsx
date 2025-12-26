"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, AlertCircle, Ban, Users } from "lucide-react";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { SiteHeader } from "@/components/admin/site-header";
import { UserTable } from "@/components/admin/user-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/utils/orpc";

export default function AdminPage() {
  const { data: stats, isLoading, isError } = useQuery(orpc.getAdminStats.queryOptions());

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "16rem", // Standard width
        } as React.CSSProperties
      }
    >
      <AdminSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-4">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="font-medium text-sm">Total Users</CardTitle>
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
                    (stats?.totalUsers ?? 0)
                  )}
                </div>
                <p className="text-muted-foreground text-xs">Registered users</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="font-medium text-sm">Active Sessions</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
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
                    (stats?.activeSessions ?? 0)
                  )}
                </div>
                <p className="text-muted-foreground text-xs">Currently active sessions</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="font-medium text-sm">Banned Users</CardTitle>
                <Ban className="h-4 w-4 text-muted-foreground" />
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
                    (stats?.bannedUsers ?? 0)
                  )}
                </div>
                <p className="text-muted-foreground text-xs">Users with restricted access</p>
              </CardContent>
            </Card>
          </div>
          <div className="min-h-screen flex-1 rounded-xl bg-muted/50 p-4 md:min-h-min">
            <h2 className="mb-4 font-bold text-2xl tracking-tight">User Management</h2>
            <UserTable />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
