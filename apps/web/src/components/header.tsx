"use client";
import { VenetianMask } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const isImpersonating = !!session?.session?.impersonatedBy;

  const handleStopImpersonation = async () => {
    await authClient.admin.stopImpersonating();
    router.refresh();
    router.push("/admin/users");
  };

  if (pathname.startsWith("/admin")) {
    return null;
  }
  const links = [
    { to: "/" as Route, label: "Home" },
    { to: "/categories" as Route, label: "Categories" },
    { to: "/courses" as Route, label: "Courses" },
    { to: "/programs" as Route, label: "Programs" },
  ] as const;

  return (
    <div>
      {isImpersonating && (
        <div className="flex items-center justify-center gap-4 border-yellow-500/20 border-b bg-yellow-500/10 px-4 py-2 text-center text-sm text-yellow-600 dark:text-yellow-400">
          <span className="flex items-center gap-2">
            <VenetianMask className="h-4 w-4" />
            You are impersonating <strong>{session?.user.name}</strong>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleStopImpersonation}
            className="h-7 border-yellow-500/50 text-xs hover:bg-yellow-500/20"
          >
            Stop Impersonating
          </Button>
        </div>
      )}
      <div className="flex flex-row items-center justify-between px-2 py-1">
        <nav className="flex gap-6 text-sm">
          {links.map(({ to, label }) => {
            return (
              <Link key={to} href={to}>
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <Link href={"/dashboard/student" as Route} className="text-sm">
            Dashboard
          </Link>
          {session && <NotificationBell />}
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
      <hr />
    </div>
  );
}
