"use client";

import { env } from "@mulai-plus/env/web";
import { adminClient, usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ac, admin, mentor, program_manager, student } from "./permissions";

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_SERVER_URL,
  plugins: [
    adminClient({
      ac,
      roles: {
        admin,
        student,
        mentor,
        program_manager,
      },
    }),
    usernameClient(),
  ],
});

export const isAdmin = (session: { user: { role?: string | null } } | null) => {
  return session?.user?.role === "admin";
};

export const usePermission = () => {
  const { data: session, isPending } = authClient.useSession();

  const hasPermission = (permission: string) => {
    if (!session?.user) return false;

    // 0. Super Admin Bypass
    // Admins have full access by default
    if (session.user.role === "admin") {
      return true;
    }

    // 1. Check session permissions (fastest, avoids network/async issues)
    const maybePerms = (session.user as unknown as { permissions?: unknown }).permissions;
    const userPermissions = Array.isArray(maybePerms) ? (maybePerms as string[]) : undefined;

    if (userPermissions && Array.isArray(userPermissions)) {
      return userPermissions.includes(permission);
    }

    return false;
  };

  const hasPermissionAsync = async (permission: string) => {
    if (!session?.user) return false;

    // 0. Super Admin Bypass
    if (session.user.role === "admin") {
      return true;
    }

    const [action, resource] = permission.split(":");
    if (!action || !resource) return false;

    // 1. Check session permissions first
    if (session?.user) {
      const perms = (session.user as unknown as { permissions?: unknown }).permissions;
      if (Array.isArray(perms) && (perms as string[]).includes(permission)) {
        return true;
      }
    }

    // 2. Fallback to server check (Native Better Auth)
    const { data, error } = await authClient.admin.hasPermission({
      permissions: {
        [resource]: [action],
      },
    });

    if (error) return false;
    return !!data?.success;
  };

  return {
    hasPermission,
    hasPermissionAsync,
    isPending,
    user: session?.user,
  };
};

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

/**
 * Hook to protect a page based on permissions.
 * It handles loading state, redirects to login if unauthenticated,
 * and verifies permissions with the server.
 */
export const useAuthorizePage = (permission: Record<string, string[]>) => {
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const router = useRouter();

  // Use ORPC to get fresh permissions from DB directly
  const { data: userPermissions, isLoading: isPermsLoading } = useQuery(
    orpc.user.myPermissions.queryOptions({
      enabled: !!session?.user,
      retry: false,
    }),
  );

  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (isSessionPending) return;

    if (!session) {
      router.push("/login");
      return;
    }

    // Wait for permissions to load
    if (isPermsLoading && !userPermissions) return;

    // Use fetched permissions if available, fallback to session permissions, then empty
    const permsToCheck =
      userPermissions || ((session.user as { permissions?: string[] }).permissions as string[]) || [];

    let allAuthorized = true;
    for (const [resource, actions] of Object.entries(permission)) {
      for (const action of actions) {
        // Check for action:resource (e.g. access:mentor_dashboard)
        const colonFormat = `${action}:${resource}`;
        // Check for resource.action (e.g. mentor_dashboard.access)
        const dotFormat = `${resource}.${action}`;
        // Check for exact resource match (if simplified)
        const _resourceOnly = resource;

        if (
          !permsToCheck.includes(colonFormat) &&
          !permsToCheck.includes(dotFormat) &&
          // Fallback: if permission is just "access" and resource is "mentor_dashboard", maybe DB stores just "mentor_dashboard"?
          // But based on permissions.ts, it stores "access:mentor_dashboard" or "mentor_dashboard.access".
          // We can also check if the permission ID itself is in the list (if passed as key)
          !permsToCheck.includes(resource)
        ) {
          allAuthorized = false;
          // Console log for debugging
          console.warn(`[Auth] Missing permission: ${colonFormat} or ${dotFormat}`, { permsToCheck });
          break;
        }
      }
      if (!allAuthorized) break;
    }

    setIsAuthorized(allAuthorized);
  }, [session, isSessionPending, userPermissions, isPermsLoading, router, permission]);

  return {
    isAuthorized,
    isLoading: isSessionPending || (!!session?.user && isPermsLoading) || isAuthorized === null,
    user: session?.user,
  };
};
