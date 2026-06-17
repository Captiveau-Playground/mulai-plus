"use client";

import { env } from "@mulai-plus/env/web";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CheckCircle,
  CircleAlert,
  CircleX,
  Info,
  Loader2,
  Mail,
  Power,
  RefreshCw,
  Send,
  Settings,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageState } from "@/components/ui/page-state";
import { Switch } from "@/components/ui/switch";
import { useAuthorizePage } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export default function AdminSettingsPage() {
  const { isAuthorized, isLoading } = useAuthorizePage({
    admin_dashboard: ["access"],
  });

  const queryClient = useQueryClient();
  const [isRestarting, setIsRestarting] = useState(false);

  // Email Settings State
  const [testEmail, setTestEmail] = useState("");
  const testSubject = "Test Email from Admin";
  const testHtml = "<p>This is a test email sent from the admin panel.</p>";

  const { data: emailConfig } = useQuery(orpc.settings.get.queryOptions({ input: { key: "email_config" } }));

  const updateSettings = useMutation(
    orpc.settings.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.settings.get.key({ input: { key: "email_config" } }),
        });
        toast.success("Settings updated");
      },
      onError: (err) => {
        toast.error(`Failed to update settings: ${err.message}`);
      },
    }),
  );

  const sendTestEmail = useMutation(
    orpc.settings.email.sendTest.mutationOptions({
      onSuccess: () => {
        toast.success("Test email sent");
      },
      onError: (err) => {
        toast.error(`Failed to send email: ${err.message}`);
      },
    }),
  );

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

  return (
    <PageState isLoading={isLoading} isAuthorized={isAuthorized}>
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
              Changing permission configurations (roles/access control) in the database may require a server restart to
              take effect if they are cached on startup.
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

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-6 w-6" />
            Email Settings
          </CardTitle>
          <CardDescription>Configure email sending and test templates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="email-enabled" className="flex flex-col space-y-1">
              <span>Enable Email Sending</span>
              <span className="font-normal text-muted-foreground text-xs">
                If disabled, no emails will be sent from the system.
              </span>
            </Label>
            <Switch
              id="email-enabled"
              checked={(emailConfig as any)?.enabled ?? true}
              onCheckedChange={(checked) => {
                updateSettings.mutate({
                  key: "email_config",
                  value: { ...(emailConfig as any), enabled: checked },
                  description: "Email configuration",
                });
              }}
              disabled={updateSettings.isPending}
            />
          </div>

          <div className="space-y-4 border-t pt-4">
            <h3 className="font-medium text-sm">Send Test Email</h3>
            <div className="grid gap-2">
              <Label htmlFor="test-email">Recipient Email</Label>
              <Input
                id="test-email"
                placeholder="admin@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
            <Button
              onClick={() => {
                if (!testEmail) return toast.error("Please enter an email");
                sendTestEmail.mutate({
                  to: testEmail,
                  subject: testSubject,
                  html: testHtml,
                });
              }}
              disabled={sendTestEmail.isPending}
            >
              {sendTestEmail.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send Test Email
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Toast / Sonner Test ── */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Toast / Notification Test
          </CardTitle>
          <CardDescription>
            Trigger different toast variants to preview how they look with the current styling.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {/* Normal Toast */}
            <Button variant="outline" onClick={() => toast("This is a normal toast message")}>
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Normal
            </Button>

            {/* Success */}
            <Button
              className="!border-emerald-200 !bg-emerald-50 !text-emerald-700 hover:!bg-emerald-100"
              onClick={() => toast.success("Data saved successfully!")}
            >
              <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
              Success
            </Button>

            {/* Error */}
            <Button
              className="!border-red-200 !bg-red-50 !text-red-700 hover:!bg-red-100"
              onClick={() => toast.error("Something went wrong. Please try again.")}
            >
              <CircleX className="mr-1.5 h-3.5 w-3.5" />
              Error
            </Button>

            {/* Warning */}
            <Button
              className="!border-orange-200 !bg-orange-50 !text-orange-700 hover:!bg-orange-100"
              onClick={() => toast.warning("Your session will expire soon.")}
            >
              <CircleAlert className="mr-1.5 h-3.5 w-3.5" />
              Warning
            </Button>

            {/* Info */}
            <Button
              className="!border-indigo-200 !bg-indigo-50 !text-indigo-700 hover:!bg-indigo-100"
              onClick={() => toast.info("New update available.")}
            >
              <Info className="mr-1.5 h-3.5 w-3.5" />
              Info
            </Button>

            {/* Loading */}
            <Button
              variant="secondary"
              onClick={() => {
                const id = toast.loading("Processing your request...");
                setTimeout(() => toast.dismiss(id), 3000);
              }}
            >
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Loading
            </Button>

            {/* With Description */}
            <Button
              variant="ghost"
              onClick={() =>
                toast.success("Profile updated", {
                  description: "Your changes have been saved successfully.",
                })
              }
            >
              With Description
            </Button>

            {/* Promise */}
            <Button
              variant="outline"
              onClick={() =>
                toast.promise(new Promise<string>((resolve) => setTimeout(() => resolve("Done!"), 2000)), {
                  loading: "Saving changes...",
                  success: "Changes saved!",
                  error: "Failed to save.",
                })
              }
            >
              Promise (2s)
            </Button>
          </div>

          <p className="text-muted-foreground text-xs">
            These buttons trigger the <code>sonner</code> toast library with various types and options. The styling
            follows the Mulai Plus brand guidelines.
          </p>
        </CardContent>
      </Card>
    </PageState>
  );
}
