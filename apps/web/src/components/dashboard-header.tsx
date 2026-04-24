"use client";

import { NotificationBell } from "@/components/notification-bell";

export default function DashboardHeader() {
  return (
    <header className="flex items-center justify-end border-gray-200 border-b bg-white px-6 py-3">
      <NotificationBell />
    </header>
  );
}
