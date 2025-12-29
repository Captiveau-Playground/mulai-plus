"use client";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) {
    return null;
  }
  const links = [
    { to: "/" as Route, label: "Home" },
    { to: "/categories" as Route, label: "Categories" },
    { to: "/courses" as Route, label: "Courses" },
  ] as const;

  return (
    <div>
      <div className="flex flex-row items-center justify-between px-2 py-1">
        <nav className="flex gap-6 text-sm">
          {links.map(({ to, label }) => {
            return (
              <Link key={to} href={to}>
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <Link href={"/dashboard/student" as Route} className="text-sm">
            Dashboard
          </Link>
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
      <hr />
    </div>
  );
}
