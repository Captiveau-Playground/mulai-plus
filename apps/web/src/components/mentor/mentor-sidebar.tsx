"use client";

import { BookOpen, FileText, LayoutDashboard } from "lucide-react";
import type * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { CvgLogo } from "../admin/admin-sidebar";
import { TeamSwitcher } from "../team-switcher";

export function MentorSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = authClient.useSession();

  const data = {
    teams: [
      {
        name: "MulaiPlus",
        logo: CvgLogo,
        plan: "Enterprise",
      },
    ],
    user: {
      name: session?.user?.name || "Mentor",
      email: session?.user?.email || "",
      avatar: session?.user?.image || "",
    },
    navMain: [
      {
        title: "Dashboard",
        url: "/mentor",
        icon: LayoutDashboard,
        isActive: true,
      },
      {
        title: "My Sessions",
        url: "/mentor/sessions",
        icon: FileText,
      },
      {
        title: "My Batches",
        url: "/mentor/batches",
        icon: BookOpen,
      },
      // {
      //   title: "Assignments",
      //   url: "/mentor/assignments",
      //   icon: FileText,
      // },
    ],
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
