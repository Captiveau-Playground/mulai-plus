"use client";

import { Award, BookOpen, Calendar, GraduationCap, LayoutDashboard, Settings, ShoppingCart } from "lucide-react";
import type * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";

// This is sample data.
const data = {
  user: {
    name: "Student",
    email: "student@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Student Portal",
      logo: GraduationCap,
      plan: "Student",
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard/student",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "My Programs",
      url: "/dashboard/student/programs",
      icon: GraduationCap,
    },
    {
      title: "My Courses",
      url: "/dashboard/student/courses",
      icon: BookOpen,
    },
    {
      title: "Schedule",
      url: "/dashboard/student/schedule",
      icon: Calendar,
    },
    {
      title: "My Orders",
      url: "/dashboard/student/orders",
      icon: ShoppingCart,
    },
    {
      title: "Certificates",
      url: "/dashboard/student/certificates",
      icon: Award,
    },
    {
      title: "Settings",
      url: "/dashboard/student/settings",
      icon: Settings,
    },
  ],
};

export function StudentSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = authClient.useSession();

  const user = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
        avatar: session.user.image || "",
      }
    : data.user;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
