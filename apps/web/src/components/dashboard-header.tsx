"use client";

import { Menu } from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSidebar } from "@/components/ui/sidebar";

export default function DashboardHeader() {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="flex items-center justify-between border-gray-200 border-b bg-white px-4 py-3 sm:px-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="text-gray-700">
          <Menu className="h-5 w-5" />
        </Button>
        <Separator orientation="vertical" className="hidden h-4 md:block" />
      </div>
      <NotificationBell />
    </header>
  );
}
