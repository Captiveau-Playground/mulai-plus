"use client";

import {
  BookOpen,
  Computer,
  ExternalLink,
  Key,
  LayoutDashboard,
  Link as LinkIcon,
  Settings2,
  Shield,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type * as React from "react";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";

export function CvgLogo(props: Omit<React.ComponentProps<typeof Image>, "src" | "alt" | "width" | "height">) {
  return <Image src="/main-icon-logo.svg" alt="Logo" width={32} height={32} {...props} />;
}

// This is sample data.
const data = {
  user: {
    name: "Admin",
    email: "admin@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "MulaiPlus",
      logo: CvgLogo,
      plan: "Enterprise",
    },
  ],
  navGeneral: [
    {
      title: "Dashboard",
      url: "/admin",
      icon: LayoutDashboard,
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
          title: "Overview",
          url: "/admin/lms/dashboard",
        },
        {
          title: "Categories",
          url: "/admin/lms/categories",
        },
        {
          title: "Courses",
          url: "/admin/lms/courses",
        },
        {
          title: "Orders",
          url: "/admin/lms/orders",
        },
        {
          title: "Enrollments",
          url: "/admin/lms/enrollments",
        },
      ],
    },
  ],
  navMentoring: [
    {
      title: "Mentoring",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Programs",
          url: "/admin/programs",
        },
        {
          title: "Mentors",
          url: "/admin/programs/mentors",
        },
        {
          title: "Analytics",
          url: "/admin/programs/analytics",
        },
        {
          title: "Testimonials",
          url: "/admin/programs/testimonials",
        },
      ],
    },
  ],
  navSystem: [
    {
      title: "Audit",
      url: "#",
      icon: Computer,
      items: [
        {
          title: "Logs",
          url: "/admin/audit",
        },
        {
          title: "API",
          url: "/admin/api-audit",
        },
      ],
    },

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
        {
          title: "Email",
          url: "/admin/email",
        },
      ],
    },
    {
      title: "Short Links",
      url: "#",
      icon: LinkIcon,
      items: [
        {
          title: "Manage",
          url: "/admin/links",
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
        <NavMain label="Programs" items={data.navMentoring} />
        <NavMain label="Authentication" items={data.navAuth} />
        <NavMain label="System" items={data.navSystem} />

        {/* Back to Site */}
        <div className="mt-auto px-3 pb-1">
          <div className="mb-2 border-sidebar-border/50 border-t" />
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2 font-manrope font-medium text-sm text-white/40 transition-all hover:bg-white/10 hover:text-white"
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            <span>Back to Site</span>
          </Link>
        </div>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
