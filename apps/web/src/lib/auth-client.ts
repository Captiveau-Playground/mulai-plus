"use client";

import { env } from "@better-auth-admin/env/web";
import { adminClient, usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ac, admin, mentor, student } from "./permissions";

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_SERVER_URL,
  plugins: [
    adminClient({
      ac,
      roles: {
        admin,
        student,
        mentor,
      },
    }),
    usernameClient(),
  ],
});

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
    const userPermissions = (session.user as any).permissions as string[] | undefined;

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
    if (session?.user && (session.user as any).permissions?.includes(permission)) {
      return true;
    }

    // 2. Fallback to server check (Native Better Auth)
    // @ts-expect-error
    const { data, error } = await authClient.admin.hasPermission({
      permission: {
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

/**
 * Hook to protect a page based on permissions.
 * It handles loading state, redirects to login if unauthenticated,
 * and verifies permissions with the server.
 */
export const useAuthorizePage = (permission: Record<string, string[]>) => {
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const router = useRouter();

  // Memoize permission string to prevent infinite loops if object reference changes
  const _permissionKey = JSON.stringify(permission);

  useEffect(() => {
    if (isSessionPending) return;

    if (!session) {
      router.push("/login");
      return;
    }

    const checkPermission = async () => {
      // 0. Super Admin Bypass
      if (session.user.role === "admin") {
        setIsAuthorized(true);
        return;
      }

      // 1. Check using the server-side verification
      const { data, error } = await authClient.admin.hasPermission({
        permission,
      });

      if (error || !data?.success) {
        setIsAuthorized(false);
      } else {
        setIsAuthorized(true);
      }
    };

    checkPermission();
  }, [session, isSessionPending, router, permission]);

  return {
    isAuthorized,
    isLoading: isSessionPending || isAuthorized === null,
    user: session?.user,
  };
};
