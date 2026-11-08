"use client";

import { getWebEnv, VERSION_LABEL } from "@/lib/web-env";

export default function DashboardFooter() {
  const currentYear = new Date().getFullYear();
  const _envLabel = getWebEnv();

  return (
    <footer className="flex items-center justify-between border-gray-200 border-t bg-white px-6 py-3">
      <div className="text-gray-600 text-sm">&copy; {currentYear} Mulai Plus</div>
      <div className="flex items-center gap-2 text-gray-400 text-xs">
        <span title="Versi aplikasi">{VERSION_LABEL}</span>
        <span className="text-gray-300">·</span>
        <span title="Lingkungan">
          {_envLabel === "development" ? "development" : _envLabel === "staging" ? "staging" : "production"}
        </span>
      </div>
    </footer>
  );
}
