"use client";

import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import Loader from "@/components/loader";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

function TmbHeader({ xp, level, streak }: { xp: number; level: number; streak: number }) {
  const _xpToNext = (level + 1) * 150;
  const progress = Math.min(100, ((xp - (level - 1) * 150) / 150) * 100);
  return (
    <header className="sticky top-0 z-20 border-gray-100 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
        <Link href="/tmb" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-navy text-base">🧭</span>
          <div className="leading-tight">
            <p className="font-bold font-bricolage text-brand-navy text-sm">Test by MULAI+</p>
            <p className="font-manrope text-[10px] text-gray-400">Kenali minat & bakatmu</p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {/* XP pill */}
          <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1">
            <span className="text-sm">⚡</span>
            <span className="font-bold font-manrope text-amber-600 text-xs">{xp} XP</span>
            <div className="h-1.5 w-12 overflow-hidden rounded-full bg-amber-200/70">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          {/* Level */}
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-mentor-teal font-bold font-manrope text-white text-xs">
            {level}
          </div>
          {/* Streak */}
          <div className={cn("flex items-center gap-0.5", streak > 0 && "animate-pulse")}>
            <Flame className={cn("h-5 w-5", streak > 0 ? "text-orange-500" : "text-gray-300")} fill="currentColor" />
            <span className="font-bold font-manrope text-gray-700 text-xs">{streak}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function TmbLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();

  const { data } = useQuery({
    ...orpc.tmb.assessment.list.queryOptions({ input: {} }),
    enabled: !!session,
  });

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      const params = new URLSearchParams(searchParams.toString());
      router.push(`/login?${params.toString()}`);
    }
  }, [isPending, session, router, searchParams]);

  if (isPending || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader />
      </div>
    );
  }

  const stats = data?.stats ?? { xp: 0, level: 1, streak: 0, testsCompleted: 0 };

  return (
    <div className="flex min-h-screen flex-col bg-[#fafafc]">
      <TmbHeader xp={stats.xp} level={stats.level} streak={stats.streak} />

      <main className="mx-auto w-full max-w-md flex-1 px-4 py-5 pb-28">
        {/* Bottom nav — mobile first */}
        <nav className="fixed inset-x-0 bottom-0 z-20 border-gray-100 border-t bg-white/95 backdrop-blur">
          <div className="mx-auto grid max-w-md grid-cols-4">
            {[
              { href: "/tmb" as const, label: "Beranda", icon: "🏠", active: pathname === "/tmb" },
              { href: "/tmb/result" as const, label: "Hasil", icon: "📊", active: pathname === "/tmb/result" },
              { href: "/tmb/admin" as const, label: "Sekolah", icon: "🏫", active: pathname.startsWith("/tmb/admin") },
              { href: "/tmb/profile" as const, label: "Profil", icon: "👤", active: pathname === "/tmb/profile" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2.5 font-medium text-[11px]",
                  item.active ? "text-mentor-teal" : "text-gray-400",
                )}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                {item.label}
                {item.active && <span className="h-1 w-6 rounded-full bg-mentor-teal" />}
              </Link>
            ))}
          </div>
        </nav>

        {children}
      </main>
    </div>
  );
}
