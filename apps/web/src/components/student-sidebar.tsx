"use client";

import { Award, BookOpen, Calendar, GraduationCap, LayoutDashboard, Settings, ShoppingCart } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import type * as React from "react";
import { Separator } from "@/components/ui/separator";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

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
  const { data: session } = authClient.useSession();

  const user = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
        avatar: session.user.image || "",
      }
    : { name: "Student", email: "student@example.com", avatar: "" };

  return (
    <Sidebar collapsible="icon" className="border-r-0 bg-brand-navy pt-4" {...props}>
      <SidebarHeader className="px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
            <span className="font-bold font-bricolage text-brand-navy text-xl">M+</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold font-bricolage text-lg text-white">Student</span>
            <span className="font-manrope text-white/60 text-xs">Learning Portal</span>
          </div>
        </div>
      </SidebarHeader>

      <Separator className="my-4 bg-white/10" />

      <SidebarContent className="px-3">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.title}
              href={item.url as Route}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 font-manrope font-medium text-sm text-white/80 transition-all hover:bg-white/10 hover:text-white",
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span>{item.title}</span>
            </Link>
          ))}
        </nav>
      </SidebarContent>

      <SidebarFooter className="border-white/10 border-t px-4 py-4">
        {user.avatar ? (
          <div className="flex items-center gap-3 rounded-xl bg-white/10 p-3">
            <Image
              src={user.avatar}
              alt={user.name || ""}
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-manrope font-medium text-sm text-white">{user.name}</p>
              <p className="truncate font-manrope text-white/60 text-xs">{user.email}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl bg-white/10 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-orange">
              <span className="font-semibold text-white">{user.name?.charAt(0) || "S"}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-manrope font-medium text-sm text-white">{user.name}</p>
              <p className="truncate font-manrope text-white/60 text-xs">{user.email}</p>
            </div>
          </div>
        )}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
