"use client";

import {
  Award,
  Brain,
  Calendar,
  ChevronDown,
  ExternalLink,
  FileText,
  GraduationCap,
  History,
  LayoutDashboard,
  Loader2,
  LogOut,
  Settings,
  Sparkles,
} from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type * as React from "react";
import { useEffect, useState } from "react";
import { CONTACT_CHANNELS } from "@/components/contact-support";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";
import { trackEvent } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";

type NavItem = { title: string; url: string; icon: React.ComponentType<{ className?: string }> };
type NavGroupDef = { title: string; icon: React.ComponentType<{ className?: string }>; items: NavItem[] };

function NavLink({ item, isActive, onNavigate }: { item: NavItem; isActive: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.url as Route}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2 font-manrope font-medium text-sm transition-all duration-200",
        isActive
          ? "bg-brand-orange text-white shadow-sm"
          : "text-white/70 hover:translate-x-0.5 hover:bg-white/15 hover:text-white",
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
      <span className="whitespace-nowrap">{item.title}</span>
    </Link>
  );
}

function NavGroup({ group, onNavigate }: { group: NavGroupDef; onNavigate?: () => void }) {
  const pathname = usePathname();
  // Item aktif = SATU saja: URL terpanjang yang cocok (exact dulu, lalu prefix)
  const activeItem = group.items
    .filter((i) => i.url === pathname || pathname.startsWith(`${i.url}/`))
    .sort((a, b) => b.url.length - a.url.length)[0];
  const isActive = !!activeItem;
  const [open, setOpen] = useState(isActive);

  // Buka otomatis kalau ada item aktif (mis. direct load halaman hasil)
  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  const GroupIcon = group.icon;

  return (
    <div className="mb-0.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between rounded-xl px-3 py-2 transition-colors",
          isActive ? "text-white" : "text-white/40 hover:text-white/70",
        )}
      >
        <span className="flex items-center gap-3 font-bold font-manrope text-xs uppercase tracking-wide">
          <GroupIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {group.title}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 transition-transform duration-200", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="mt-0.5 mb-1 ml-[19px] space-y-0.5 border-white/10 border-l pl-2">
          {group.items.map((item) => (
            <NavLink key={item.title} item={item} isActive={activeItem?.url === item.url} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

// Item datar (setara Dashboard) — tidak dibungkus grup
const topItems: NavItem[] = [
  { title: "Dashboard", url: "/dashboard/student", icon: LayoutDashboard },
  { title: "Asisten AI", url: "/dashboard/student/assistant", icon: Sparkles },
  { title: "Settings", url: "/dashboard/student/settings", icon: Settings },
];

const navGroups: NavGroupDef[] = [
  {
    title: "Program",
    icon: GraduationCap,
    items: [
      { title: "My Programs", url: "/dashboard/student/programs", icon: GraduationCap },
      { title: "Schedule", url: "/dashboard/student/schedule", icon: Calendar },
      { title: "Summary Report", url: "/dashboard/student/summary-report", icon: Award },
    ],
  },
  {
    title: "Assessment",
    icon: Brain,
    items: [
      { title: "Test Minat Bakat", url: "/dashboard/student/assessment", icon: Brain },
      { title: "Hasil", url: "/dashboard/student/assessment/result", icon: FileText },
      { title: "History", url: "/dashboard/student/assessment/history", icon: History },
    ],
  },
];

export function StudentSidebar({
  onNavigate,
  ...props
}: React.ComponentProps<typeof Sidebar> & { onNavigate?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const user = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
        avatar: session.user.image || "",
      }
    : { name: "Student", email: "student@example.com", avatar: "" };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authClient.signOut();
      await router.push("/login");
      window.location.reload();
    } catch (error) {
      setIsLoggingOut(false);
      notify.error("Failed to logout");
      console.error(error);
    }
  };

  return (
    <Sidebar
      id="tour-sidebar"
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
        <Link href="/dashboard/student" onClick={onNavigate} className="flex items-center gap-3">
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
            <span className="truncate font-bold font-bricolage text-lg text-white">Student</span>
            <span className="truncate font-manrope text-white/60 text-xs">Learning Portal</span>
          </div>
        </Link>
      </SidebarHeader>

      <Separator className="my-4 bg-white/10" />

      <SidebarContent className="px-2 sm:px-3">
        <nav className="space-y-1" aria-label="Student navigation">
          {topItems.map((item) => {
            const active =
              item.url === "/dashboard/student"
                ? pathname === "/dashboard/student"
                : pathname === item.url || pathname.startsWith(`${item.url}/`);
            return <NavLink key={item.title} item={item} isActive={active} onNavigate={onNavigate} />;
          })}
          {navGroups.map((group) => (
            <NavGroup key={group.title} group={group} onNavigate={onNavigate} />
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

        {/* Bantuan — collapsible, paling bawah di atas profil */}
        <div className="mt-1 border-white/10 border-t pt-2">
          <button
            type="button"
            onClick={() => setHelpOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl px-3 py-1.5 font-manrope text-[10px] text-white/40 uppercase tracking-wider transition-colors hover:bg-white/10 hover:text-white/70"
          >
            <span>Bantuan</span>
            <ChevronDown className={`size-3.5 transition-transform ${helpOpen ? "rotate-180" : ""}`} />
          </button>
          {helpOpen && (
            <div className="mt-0.5 space-y-0.5">
              {CONTACT_CHANNELS.map((channel) => {
                const Icon = channel.icon;
                return (
                  <a
                    key={channel.id}
                    href={channel.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackEvent("contact_support", { channel: channel.id, label: channel.label })}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate font-manrope text-xs">
                      {channel.label} <span className="text-white/50">· {channel.description}</span>
                    </span>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </SidebarContent>

      <SidebarFooter className="border-white/10 border-t px-3 py-4">
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "hidden w-full cursor-pointer rounded-xl bg-white/10 p-2.5 text-left transition-all hover:translate-y-[-1px] hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 active:translate-y-0 sm:p-3 md:flex",
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
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-orange ring-2 ring-white/20 sm:h-10 sm:w-10">
                  <span className="font-semibold text-white">{user.name?.charAt(0) || "S"}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-manrope font-medium text-sm text-white">{user.name}</p>
                  <p className="truncate font-manrope text-white/60 text-xs">{user.email}</p>
                </div>
              </>
            )}
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
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-orange ring-2 ring-white/20">
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
