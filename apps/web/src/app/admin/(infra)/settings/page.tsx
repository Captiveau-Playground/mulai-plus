"use client";

import { env } from "@better-auth-admin/env/web";
import { Loader2, Power, RefreshCw, Settings } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { SiteHeader } from "@/components/admin/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useAuthorizePage } from "@/lib/auth-client";

export default function AdminSettingsPage() {
  const { isAuthorized, isLoading } = useAuthorizePage({
    admin_dashboard: ["access"],
  });

  const [isRestarting, setIsRestarting] = useState(false);

  const handleRestart = async () => {
    if (!confirm("Are you sure you want to restart the server? This will temporarily disrupt service.")) {
      return;
    }

    setIsRestarting(true);
    try {
      const response = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/system/restart`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (response.ok) {
        toast.success("Server restart initiated. Please wait a moment for changes to take effect.");
        // Optional: Refresh page after delay
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to restart server");
        setIsRestarting(false);
      }
    } catch (error) {
      console.error("Restart failed:", error);
      toast.error("Failed to connect to server");
      setIsRestarting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
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
          <div className="mb-2 flex items-center gap-2">
            <Settings className="h-6 w-6 text-foreground" />
            <h1 className="font-bold text-2xl">Admin Settings</h1>
          </div>

          <Card className="max-w-2xl border-destructive/20 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Power className="h-6 w-6" />
                System Control
              </CardTitle>
              <CardDescription>Manage core system operations. Use with caution.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <p className="text-muted-foreground text-sm">
                  Changing permission configurations (roles/access control) in the database may require a server restart
                  to take effect if they are cached on startup.
                </p>
                <Button variant="destructive" onClick={handleRestart} disabled={isRestarting} className="w-fit">
                  {isRestarting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Restarting...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Restart Server
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
