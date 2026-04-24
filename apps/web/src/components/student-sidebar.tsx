"use client";

import {
  Award,
  BookOpen,
  Calendar,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShoppingCart,
} from "lucide-react";
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
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

function NavLink({ item }: { item: (typeof navItems)[number] }) {
  const pathname = usePathname();
  const isExactMatch = pathname === item.url;
  const isSubPath = pathname.startsWith(`${item.url}/`) && item.url !== "/dashboard/student";
  const isCurrentPage = isExactMatch || isSubPath;
  const Icon = item.icon;

  return (
    <Link
      href={item.url as Route}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 font-manrope font-medium text-sm transition-all duration-200",
        isCurrentPage
          ? "bg-brand-orange text-white shadow-sm"
          : "text-white/70 hover:translate-x-0.5 hover:bg-white/15 hover:text-white",
      )}
      aria-current={isCurrentPage ? "page" : undefined}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span>{item.title}</span>
    </Link>
  );
}

function MobileMenuButton({ onClick, isOpen }: { onClick: () => void; isOpen: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed top-4 left-4 z-50 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-navy text-white shadow-xl transition-all duration-200 hover:scale-105 hover:bg-brand-navy-light hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-white/50 active:scale-95 md:hidden"
      aria-label={isOpen ? "Close menu" : "Open menu"}
      aria-expanded={isOpen}
    >
      {isOpen ? null : <Menu className="h-6 w-6" />}
    </button>
  );
}

const navItems = [
  { title: "Dashboard", url: "/dashboard/student", icon: LayoutDashboard },
  { title: "My Programs", url: "/dashboard/student/programs", icon: GraduationCap },
  { title: "Schedule", url: "/dashboard/student/schedule", icon: Calendar },
  { title: "My Courses", url: "/dashboard/student/courses", icon: BookOpen },
  { title: "My Orders", url: "/dashboard/student/orders", icon: ShoppingCart },
  { title: "Certificates", url: "/dashboard/student/certificates", icon: Award },
  { title: "Settings", url: "/dashboard/student/settings", icon: Settings },
];

export function StudentSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { isMobile, openMobile, setOpenMobile, open, setOpen } = useSidebar();

  const handleMobileToggle = () => {
    setOpenMobile(!openMobile);
  };

  const user = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
        avatar: session.user.image || "",
      }
    : { name: "Student", email: "student@example.com", avatar: "" };

  const handleLogout = async () => {
    try {
      await authClient.signOut();
      toast.success("Logged out successfully");
      router.push("/");
      router.refresh();
    } catch (error) {
      toast.error("Failed to logout");
      console.error(error);
    }
  };

  return (
    <>
      {isMobile && <MobileMenuButton onClick={handleMobileToggle} isOpen={openMobile} />}

      <Sidebar
        collapsible="icon"
        className={cn("!bg-brand-navy border-r-0 pt-3 sm:pt-4")}
        style={
          {
            backgroundColor: "bg-brand-navy",
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
          <div className="flex items-center gap-3">
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
          </div>
        </SidebarHeader>

        <Separator className="my-4 bg-white/10" />

        <SidebarContent className="px-2 sm:px-3">
          <nav className="space-y-1" aria-label="Student navigation">
            {navItems.map((item) => (
              <NavLink key={item.title} item={item} />
            ))}
          </nav>
        </SidebarContent>

        <SidebarFooter className="border-white/10 border-t px-3 py-4">
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl bg-white/10 p-2.5 text-left transition-all hover:translate-y-[-1px] hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 active:translate-y-0 sm:p-3",
                )}
                aria-haspopup="menu"
                aria-expanded={isDropdownOpen}
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
                className="cursor-pointer font-manrope text-red-600 text-sm hover:bg-red-50 focus:bg-red-50 focus:outline-none"
                role="menuitem"
              >
                <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>
    </>
  );
}
