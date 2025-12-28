"use client";

import { BookOpen, GalleryVerticalEnd, Key, LayoutDashboard, Settings2, Shield, Users } from "lucide-react";
import type * as React from "react";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";

// This is sample data.
const data = {
  user: {
    name: "Admin",
    email: "admin@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
  ],
  navGeneral: [
    {
      title: "Dashboard",
      url: "/admin",
      icon: LayoutDashboard,
      isActive: true,
    },
  ],
  navAuth: [
    {
      title: "Users",
      url: "/admin/users",
      icon: Users,
      items: [
        {
          title: "All Users",
          url: "/admin/users",
        },
        {
          title: "Banned Users",
          url: "#",
        },
      ],
    },
    {
      title: "Roles",
      url: "/admin/roles",
      icon: Shield,
      items: [
        {
          title: "All Roles",
          url: "/admin/roles",
        },
      ],
    },
    {
      title: "Permissions",
      url: "/admin/permissions",
      icon: Key,
      items: [
        {
          title: "All Permissions",
          url: "/admin/permissions",
        },
      ],
    },
  ],
  navLms: [
    {
      title: "Learning",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Categories",
          url: "/admin/lms/categories",
        },
        {
          title: "Courses",
          url: "/admin/lms/courses",
        },
      ],
    },
  ],
  navSystem: [
    {
      title: "Role Testing",
      url: "#",
      icon: Shield,
      items: [
        {
          title: "Student Page",
          url: "/dashboard/student",
        },
        {
          title: "Mentor Page",
          url: "/dashboard/mentor",
        },
        {
          title: "Admin Only",
          url: "/dashboard/admin-only",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "/admin/settings",
        },
        {
          title: "Security",
          url: "#",
        },
      ],
    },
  ],
};

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
        <NavMain items={data.navGeneral} />
        <NavMain label="LMS" items={data.navLms} />
        <NavMain label="Authentication" items={data.navAuth} />
        <NavMain label="System" items={data.navSystem} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
