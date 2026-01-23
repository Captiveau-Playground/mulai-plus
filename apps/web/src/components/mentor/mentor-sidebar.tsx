"use client";

import { BookOpen, FileText, LayoutDashboard } from "lucide-react";
import type * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";

export function MentorSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = authClient.useSession();

  const data = {
    user: {
      name: session?.user?.name || "Mentor",
      email: session?.user?.email || "",
      avatar: session?.user?.image || "",
    },
    navMain: [
      {
        title: "Dashboard",
        url: "/mentor/dashboard",
        icon: LayoutDashboard,
        isActive: true,
      },
      {
        title: "Assignments",
        url: "/mentor/assignments",
        icon: FileText,
      },
    ],
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <BookOpen className="h-6 w-6" />
          <span className="font-bold">LMS Mentor</span>
        </div>
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
