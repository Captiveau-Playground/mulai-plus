"use client";

import { BookOpen, ExternalLink, LayoutDashboard, MessageSquare } from "lucide-react";
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
          title: "Mentor",
          url: "/program-manager/programs/mentors",
        },
        {
          title: "Analytics",
          url: "/program-manager/programs/analytics",
        },
        {
          title: "Testimonial",
          url: "/program-manager/programs/testimonials",
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

        {/* Spacer + Back to Site */}
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
