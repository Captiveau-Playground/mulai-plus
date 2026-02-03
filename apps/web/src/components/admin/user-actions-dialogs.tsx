"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Globe, Laptop, Loader2, Smartphone, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

interface EditUserRoleDialogProps {
  user: {
    id: string;
    name: string;
    role?: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditUserRoleDialog({ user, open, onOpenChange, onSuccess }: EditUserRoleDialogProps) {
  const [selectedRole, setSelectedRole] = React.useState(user?.role || "student");
  const [isPending, setIsPending] = React.useState(false);

  const { data: roles } = useQuery(orpc.role.list.queryOptions());

  React.useEffect(() => {
    if (user?.role) {
      setSelectedRole(user.role);
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setIsPending(true);
    try {
      const { error } = await authClient.admin.setRole({
        userId: user.id,
        role: selectedRole as "user" | "admin",
      });

      if (error) {
        toast.error(`Failed to update role: ${error.message}`);
      } else {
        toast.success("Role updated successfully");
        onSuccess?.();
        onOpenChange(false);
      }
    } catch (_e) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-7xl">
        <DialogHeader>
          <DialogTitle>Edit User Role</DialogTitle>
          <DialogDescription>Change the role for user {user?.name}.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-right font-medium text-sm">Role</span>
            <Select value={selectedRole} onValueChange={(val) => val && setSelectedRole(val)}>
              <SelectTrigger className="col-span-3">
                <SelectValue title="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles?.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface UserSessionsDialogProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
  token?: string;
}

export function UserSessionsDialog({ userId, open, onOpenChange }: UserSessionsDialogProps) {
  const [sessions, setSessions] = React.useState<Session[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isRevoking, setIsRevoking] = React.useState<string | null>(null);
  const [isRevokingAll, setIsRevokingAll] = React.useState(false);

  const fetchSessions = React.useCallback(async () => {
    if (!userId || !open) return;
    setIsLoading(true);
    try {
      const { data, error } = await authClient.admin.listUserSessions({
        userId,
      });
      if (data) {
        console.log("Sessions data:", data.sessions);
        setSessions(
          data.sessions.map((s) => ({
            ...s,
            expiresAt: new Date(s.expiresAt),
            createdAt: new Date(s.createdAt),
          })),
        );
      } else if (error) {
        console.error("Fetch sessions error:", error);
        toast.error(`Failed to fetch sessions: ${error.message}`);
      }
    } catch (e) {
      console.error("Fetch sessions exception:", e);
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [userId, open]);

  React.useEffect(() => {
    if (open && userId) {
      fetchSessions();
    }
  }, [open, userId, fetchSessions]);

  const handleRevokeSession = async (token: string, sessionId: string) => {
    setIsRevoking(sessionId);
    try {
      // Use revokeSession from admin or general client?
      // Admin usually has power to revoke any session.
      // Assuming authClient.admin.revokeSession exists, or we use the session token if available.
      // If listUserSessions returns tokens, we can use that.
      // If not, we might need to use sessionId if the API supports it.
      // Let's assume revokeSession takes { sessionToken: token }

      // Note: Better Auth admin plugin usually exposes revokeUserSession?
      // Let's try to use authClient.admin.revokeSession({ sessionToken: token })
      // If token is not returned by listUserSessions (security), maybe we pass sessionId?
      // Checking docs/types via error is best.

      // For now, let's assume standard revoke logic.
      const { error } = await authClient.admin.revokeUserSession({
        sessionToken: token,
      });

      if (error) {
        console.error("Revoke session error:", error);
        toast.error(error.message || "Failed to revoke session");
      } else {
        toast.success("Session revoked successfully");
        fetchSessions();
      }
    } catch (e) {
      console.error("Revoke session exception:", e);
      toast.error("Failed to revoke session");
    } finally {
      setIsRevoking(null);
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!userId) return;
    setIsRevokingAll(true);
    try {
      // Assuming removeUserSessions or similar exists for admin
      // Or we iterate? Iterating is safer if method unknown, but revokeUserSessions is likely.
      // Let's try authClient.admin.revokeUserSessions
      const { error } = await authClient.admin.revokeUserSessions({
        userId,
      });

      if (error) {
        console.error("Revoke all sessions error:", error);
        toast.error(`Failed to revoke all sessions: ${error.message}`);
      } else {
        toast.success("All sessions revoked successfully");
        fetchSessions();
      }
    } catch (e) {
      console.error("Revoke all sessions exception:", e);
      toast.error("Failed to revoke all sessions");
    } finally {
      setIsRevokingAll(false);
    }
  };

  const getDeviceIcon = (userAgent?: string | null) => {
    if (!userAgent) return <Globe className="h-4 w-4" />;
    if (/mobile/i.test(userAgent)) return <Smartphone className="h-4 w-4" />;
    return <Laptop className="h-4 w-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>User Sessions</DialogTitle>
          <DialogDescription>Manage active sessions for this user.</DialogDescription>
        </DialogHeader>

        <div className="mb-2 flex justify-end">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleRevokeAllSessions}
            disabled={isRevokingAll || sessions.length === 0}
          >
            {isRevokingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Revoke All Sessions
          </Button>
        </div>

        <ScrollArea className="h-[300px] w-full rounded-md border p-4">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              No active sessions found.
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                      {getDeviceIcon(session.userAgent)}
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-sm">{session.ipAddress || "Unknown IP"}</span>
                      <span
                        className="max-w-[200px] truncate text-muted-foreground text-xs"
                        title={session.userAgent || ""}
                      >
                        {session.userAgent || "Unknown Device"}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        Expires: {session.expiresAt.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => session.token && handleRevokeSession(session.token, session.id)}
                    disabled={isRevoking === session.id || !session.token}
                  >
                    {isRevoking === session.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Revoke"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteUserDialogProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteUserDialog({ userId, open, onOpenChange, onSuccess }: DeleteUserDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    if (!userId) return;
    setIsDeleting(true);
    try {
      const { error } = await authClient.admin.removeUser({
        userId,
      });

      if (error) {
        toast.error(`Failed to delete user: ${error.message}`);
      } else {
        toast.success("User deleted successfully");
        onSuccess();
        onOpenChange(false);
      }
    } catch {
      toast.error("Failed to delete user");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-7xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> Delete User
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this user? This action cannot be undone. This will permanently remove the
            user and all associated data.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
