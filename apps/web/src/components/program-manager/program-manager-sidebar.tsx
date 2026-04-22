"use client";

import { BookOpen, LayoutDashboard, MessageSquare } from "lucide-react";
import Image from "next/image";
import type * as React from "react";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";

export function CvgLogo(props: React.ComponentProps<"img">) {
  return <Image src="/main-icon-logo.svg" alt="Logo" width={32} height={32} {...props} />;
}

const data = {
  user: {
    name: "Program Manager",
    email: "pm@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "MulaiPlus",
      logo: CvgLogo,
      plan: "Enterprise",
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/program-manager",
      icon: LayoutDashboard,
      isActive: true,
    },
  ],
  navPrograms: [
    {
      title: "Programs",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "All Programs",
          url: "/program-manager/programs",
        },
        {
          title: "Analytics",
          url: "/program-manager/programs/analytics",
        },
      ],
    },
  ],
  navContent: [
    {
      title: "Content",
      url: "#",
      icon: MessageSquare,
      items: [
        {
          title: "Testimonials",
          url: "/program-manager/testimonials",
        },
      ],
    },
  ],
};

export function ProgramManagerSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
        <NavMain label="Programs" items={data.navPrograms} />
        <NavMain label="Content" items={data.navContent} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
