"use client";

import { BookOpen, Calendar, ExternalLink, LayoutDashboard, Loader2, LogOut } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type * as React from "react";
import { useState } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

function NavLink({ item, onNavigate }: { item: (typeof navItems)[number]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const isExactMatch = pathname === item.url;
  const isSubPath = pathname.startsWith(`${item.url}/`) && item.url !== "/mentor";
  const isCurrentPage = isExactMatch || isSubPath;
  const Icon = item.icon;

  return (
    <Link
      href={item.url as Route}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 font-manrope font-medium text-sm transition-all duration-200",
        isCurrentPage
          ? "bg-mentor-teal text-white shadow-sm"
          : "text-white/70 hover:translate-x-0.5 hover:bg-white/15 hover:text-white",
      )}
      aria-current={isCurrentPage ? "page" : undefined}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="whitespace-nowrap">{item.title}</span>
    </Link>
  );
}

const navItems = [
  { title: "Dashboard", url: "/mentor", icon: LayoutDashboard },
  { title: "My Sessions", url: "/mentor/sessions", icon: Calendar },
  { title: "My Batches", url: "/mentor/batches", icon: BookOpen },
  // { title: "Settings", url: "/mentor/settings", icon: Settings },
];

export function MentorSidebar({
  onNavigate,
  ...props
}: React.ComponentProps<typeof Sidebar> & { onNavigate?: () => void }) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [_isDropdownOpen] = useState(false);

  const user = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
        avatar: session.user.image || "",
      }
    : { name: "Mentor", email: "mentor@mulaiplus.id", avatar: "" };

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authClient.signOut();
      await router.push("/login");
      window.location.reload();
    } catch (error) {
      setIsLoggingOut(false);
      toast.error("Failed to logout");
      console.error(error);
    }
  };

  return (
    <Sidebar
      collapsible="icon"
      className={cn("border-r-0 bg-brand-navy pt-3 sm:pt-4")}
      style={
        {
          "--sidebar": "#1A1F6D",
          "--sidebar-foreground": "#ffffff",
          "--sidebar-accent": "rgba(255,255,255,0.15)",
          "--sidebar-accent-foreground": "#ffffff",
          "--sidebar-border": "rgba(255,255,255,0.1)",
        } as React.CSSProperties
      }
      {...props}
    >
      <SidebarHeader className="px-3 sm:px-4">
        <Link href="/mentor" onClick={onNavigate} className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white p-1.5">
            <Image
              src="/letter-icon-logo.svg"
              alt="Logo"
              width={32}
              height={32}
              className="h-full w-full object-contain"
            />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-bold font-bricolage text-lg text-white">Mentor</span>
            <span className="truncate font-manrope text-white/60 text-xs">Mitra Program</span>
          </div>
        </Link>
      </SidebarHeader>

      <Separator className="my-4 bg-white/10" />

      <SidebarContent className="px-2 sm:px-3">
        <nav className="space-y-1" aria-label="Mentor navigation">
          {navItems.map((item) => (
            <NavLink key={item.title} item={item} onNavigate={onNavigate} />
          ))}
        </nav>

        {/* Back to Site */}
        <div className="mt-2 border-white/10 border-t pt-3">
          <Link
            href="/"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 font-manrope font-medium text-sm text-white/40 transition-all duration-200 hover:bg-white/10 hover:text-white"
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            <span>Back to Site</span>
          </Link>
        </div>
      </SidebarContent>

      <SidebarFooter className="border-white/10 border-t px-3 py-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="hidden w-full md:flex">
            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-3 rounded-xl bg-white/10 p-2.5 text-left transition-all hover:translate-y-[-1px] hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 active:translate-y-0 sm:p-3",
              )}
            >
              {user.avatar ? (
                <>
                  <Image
                    src={user.avatar}
                    alt={user.name || ""}
                    width={40}
                    height={40}
                    className="h-9 w-9 rounded-full object-cover ring-2 ring-white/20 sm:h-10 sm:w-10"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-manrope font-medium text-sm text-white">{user.name}</p>
                    <p className="truncate font-manrope text-white/60 text-xs">{user.email}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mentor-teal ring-2 ring-white/20 sm:h-10 sm:w-10">
                    <span className="font-semibold text-white">{user.name?.charAt(0) || "M"}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-manrope font-medium text-sm text-white">{user.name}</p>
                    <p className="truncate font-manrope text-white/60 text-xs">{user.email}</p>
                  </div>
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56 rounded-xl border-0 bg-white shadow-lg"
            align="end"
            side="right"
            sideOffset={8}
            role="menu"
          >
            <div className="px-3 py-2" role="none">
              <p className="font-manrope font-medium text-sm text-text-main">{user.name}</p>
              <p className="font-manrope text-text-muted-custom text-xs">{user.email}</p>
            </div>
            <DropdownMenuSeparator className="bg-gray-100" role="separator" />
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="cursor-pointer font-manrope text-red-600 text-sm hover:bg-red-50 focus:bg-red-50 focus:outline-none"
              role="menuitem"
            >
              {isLoggingOut ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              {isLoggingOut ? "Logging out..." : "Logout"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex w-full items-center gap-3 rounded-xl bg-white/10 p-2.5 text-left transition-all hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50 md:hidden"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mentor-teal ring-2 ring-white/20">
            {isLoggingOut ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <LogOut className="h-4 w-4 text-white" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-manrope font-medium text-sm text-white">
              {isLoggingOut ? "Logging out..." : "Logout"}
            </p>
            <p className="truncate font-manrope text-white/60 text-xs">
              {isLoggingOut ? "Please wait..." : "Sign out of your account"}
            </p>
          </div>
        </button>
      </SidebarFooter>

      <SidebarRail className="!bg-brand-navy" />
    </Sidebar>
  );
}
