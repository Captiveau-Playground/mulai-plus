"use client";

import { getWebEnv } from "@/lib/web-env";

const APP_VERSION = "0.1.0";

export default function DashboardFooter() {
  const currentYear = new Date().getFullYear();
  const _envLabel = getWebEnv();

  return (
    <footer className="flex items-center justify-between border-gray-200 border-t bg-white px-6 py-3">
      <div className="text-gray-600 text-sm">&copy; {currentYear} Mulai Plus</div>
      <div className="text-gray-400 text-xs">v{APP_VERSION}</div>
    </footer>
  );
}
