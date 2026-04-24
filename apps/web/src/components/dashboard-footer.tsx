"use client";

import { env } from "@mulai-plus/env/web";

const APP_VERSION = "0.1.0";

export default function DashboardFooter() {
  const currentYear = new Date().getFullYear();
  const _envLabel =
    env.NEXT_PUBLIC_SERVER_URL === "http://localhost:3000"
      ? "development"
      : env.NEXT_PUBLIC_SERVER_URL === "https://api-staging.mulaiplus.id"
        ? "staging"
        : "production";

  return (
    <footer className="flex items-center justify-between border-gray-200 border-t bg-white px-6 py-3">
      <div className="text-gray-600 text-sm">&copy; {currentYear} Mulai Plus</div>
      <div className="text-gray-400 text-xs">v{APP_VERSION}</div>
    </footer>
  );
}
