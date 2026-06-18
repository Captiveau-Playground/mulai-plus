"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  GraduationCap,
  HeartHandshake,
  Loader2,
  Menu,
  Search,
  User,
} from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    label: "Explore",
    children: [
      {
        label: "Semua Data",
        href: "/explore",
        desc: "Cari universitas & prodi",
        icon: Search,
      },
      {
        label: "Universitas",
        href: "/explore/universities",
        desc: "408 PT negeri & swasta",
        icon: GraduationCap,
      },
      {
        label: "Program Studi",
        href: "/explore/study-programs",
        desc: "18.881 jurusan",
        icon: BookOpen,
      },
      {
        label: "Passing Grade",
        href: "/explore/passing-grade",
        desc: "Data SNBP/SNBT 2021-2025",
        icon: BarChart3,
      },
    ],
  },
  {
    label: "Program",
    children: [
      {
        label: "Semua Program",
        href: "/programs",
        desc: "Lihat semua program",
        icon: GraduationCap,
      },
      {
        label: "Reguler",
        href: "/programs",
        desc: "Mentoring 6 minggu",
        icon: HeartHandshake,
      },
      {
        label: "Beasiswa",
        href: "/programs",
        desc: "Program seleksi",
        icon: HeartHandshake,
      },
    ],
  },
  {
    label: "Blog",
    children: [
      {
        label: "Semua Artikel",
        href: "/blog",
        desc: "Blog MULAI+",
        icon: BookOpen,
      },
      {
        label: "Artikel",
        href: "/blog/articles",
        desc: "Tips & panduan",
        icon: BookOpen,
      },
      {
        label: "News",
        href: "/blog/news",
        desc: "Info terbaru",
        icon: BookOpen,
      },
    ],
  },
] as const;

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Only transparent on list pages (dark hero), not on detail sub-pages (white header)
  const isExploreList =
    pathname === "/explore" ||
    pathname.replace(/\/$/, "") === "/explore/universities" ||
    pathname.replace(/\/$/, "") === "/explore/study-programs" ||
    pathname.replace(/\/$/, "") === "/explore/passing-grade";
  const isExploreLight = isExploreList && !isScrolled;
  const isTransparent =
    !isScrolled &&
    !pathname.startsWith("/programs") &&
    !pathname.startsWith("/courses") &&
    !pathname.startsWith("/blog") &&
    !pathname.startsWith("/privacy") &&
    pathname !== "/login";

  const getDashboardLink = () => {
    if (!session?.user) return "/dashboard/student";
    const role = session.user.role;
    if (role === "admin") return "/admin";
    if (role === "mentor") return "/mentor";
    if (role === "program_manager") return "/program-manager";
    return "/dashboard/student";
  };

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await authClient.signOut();
      await router.push("/login");
      window.location.reload();
    } catch {
      setIsLoggingOut(false);
    }
  };

  return (
    <nav
      ref={navRef}
      className={cn(
        "fixed top-0 right-0 left-0 z-50 flex h-14 items-center justify-between px-4 transition-all duration-300 md:h-16 md:px-8 lg:px-12",
        isTransparent ? "bg-transparent" : "bg-white shadow-sm",
      )}
    >
      {/* Logo — Trim Path animation */}
      <Link href="/" className="inline-block w-24 shrink-0 md:w-36">
        <DotLottieReact
          src={
            isExploreLight
              ? "https://lottie.host/25b9a571-3e0d-42c9-a13f-ba85cf70eac0/BvERUpRWE9.lottie"
              : "https://lottie.host/e9e261ee-2040-44e5-b5cf-55bac95e359b/3d1Ek6VBhX.lottie"
          }
          autoplay
          style={{ width: "100%", height: "auto" }}
        />
      </Link>

      {/* Desktop Nav */}
      <div className={cn("hidden items-center gap-1 md:flex md:gap-2", isExploreLight && "text-white")}>
        {NAV_ITEMS.map((item: any) => {
          if ("children" in item) {
            return (
              <DropdownMenu key={item.label}>
                <DropdownMenuTrigger
                  className={cn(
                    "rounded-full px-3 py-2 font-manrope text-sm transition-colors lg:px-4",
                    isExploreLight
                      ? "text-white/80 hover:bg-white/10 hover:text-white"
                      : "text-text-main hover:bg-brand-navy/5 hover:text-brand-navy",
                  )}
                >
                  <span className="flex items-center gap-1">
                    {item.label}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-56 rounded-2xl border bg-white p-2 shadow-xl">
                  {item.children.map((child: any) => (
                    <DropdownMenuItem
                      key={child.href}
                      render={
                        <Link
                          href={child.href as Route}
                          className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors"
                        />
                      }
                      className="cursor-pointer rounded-xl px-0 py-0 transition-colors hover:bg-brand-navy/5 focus-visible:bg-brand-navy/5"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-navy/10">
                        <child.icon className="h-4 w-4 text-brand-navy" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-manrope font-semibold text-sm text-text-main">{child.label}</p>
                        <p className="font-manrope text-text-muted text-xs">{child.desc}</p>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href as Route}
              className={cn(
                "rounded-full px-3 py-2 font-manrope text-sm transition-colors lg:px-4",
                isExploreLight
                  ? "text-white/80 hover:bg-white/10 hover:text-white"
                  : "text-text-main hover:bg-brand-navy/5 hover:text-brand-navy",
              )}
            >
              {item.label}
            </Link>
          );
        })}

        {/* Desktop Auth */}
        <div className="ml-3 flex items-center gap-2 lg:ml-6">
          {session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button
                  variant="ghost"
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full p-0 md:h-10 md:w-10"
                >
                  <Avatar className="h-8 w-8 border-2 border-brand-navy md:h-9 md:w-9">
                    <AvatarImage src={session.user.image || undefined} alt={session.user.name || ""} />
                    <AvatarFallback className="bg-brand-navy text-white text-xs">
                      {session.user.name?.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-2xl border bg-white p-3 shadow-xl">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="p-3 font-normal">
                    <p className="font-bold font-bricolage text-brand-navy text-sm">{session.user.name}</p>
                    <p className="font-manrope text-text-muted text-xs">{session.user.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="hover:bg-brand-navy hover:text-white">
                    <Link
                      href={getDashboardLink()}
                      className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 font-manrope text-sm text-text-main"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-navy/10">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect width="7" height="9" x="3" y="3" rx="1" />
                          <rect width="7" height="5" x="14" y="3" rx="1" />
                          <rect width="7" height="9" x="14" y="12" rx="1" />
                          <rect width="7" height="5" x="3" y="16" rx="1" />
                        </svg>
                      </div>
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    disabled={isLoggingOut}
                    className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 font-manrope text-brand-red text-sm transition-colors hover:bg-brand-red hover:text-white disabled:opacity-50"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-red/10">
                      {isLoggingOut ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" x2="9" y1="12" y2="12" />
                        </svg>
                      )}
                    </div>
                    {isLoggingOut ? "Signing out..." : "Sign Out"}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link href="/login">
                <Button
                  variant="ghost"
                  className={cn(
                    "cursor-pointer rounded-full px-4 py-2 font-bold font-manrope text-sm lg:px-6",
                    isExploreLight ? "text-white/80 hover:text-white" : "text-text-main",
                  )}
                >
                  Login
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  className={cn(
                    "cursor-pointer rounded-full px-4 py-2 font-bold font-manrope text-sm text-white lg:px-6",
                    isExploreLight ? "bg-white/15 hover:bg-white/25" : "bg-brand-navy hover:bg-brand-navy/90",
                  )}
                >
                  Daftar
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile: Hamburger */}
      <div className="flex md:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger>
            <Button variant="ghost" size="icon" className="text-text-main">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" showCloseButton={false} className="w-full border-none bg-white p-0 sm:w-72">
            <div className="flex h-full flex-col p-5">
              {/* Sheet header */}
              <div className="flex items-center justify-between">
                <Image src="/letter-icon-logo.svg" alt="MULAI+" width={90} height={22} priority />
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-text-main transition-colors hover:bg-gray-100"
                  aria-label="Tutup menu"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>

              {/* Menu items — click langsung navigate + close sheet */}
              <div className="mt-8 flex flex-1 flex-col gap-1">
                {NAV_ITEMS.map((item: any) => {
                  if ("children" in item) {
                    const isOpen = openDropdown === item.label;
                    return (
                      <div key={item.label}>
                        <button
                          type="button"
                          onClick={() => setOpenDropdown(isOpen ? null : item.label)}
                          className="flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 font-manrope font-semibold text-base text-text-main transition-colors hover:bg-brand-navy/5"
                        >
                          {item.label}
                          <ChevronDown
                            className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                        {isOpen && (
                          <div className="ml-3 flex flex-col gap-0.5 border-gray-100 border-l pl-3">
                            {item.children.map((child: any) => (
                              <button
                                key={child.href}
                                type="button"
                                onClick={() => {
                                  setSheetOpen(false);
                                  setTimeout(() => router.push(child.href as Route), 150);
                                }}
                                className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left font-manrope text-sm text-text-muted transition-colors hover:bg-brand-navy/5 hover:text-brand-navy"
                              >
                                <child.icon className="h-4 w-4 shrink-0" />
                                <span>{child.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => {
                        setSheetOpen(false);
                        setTimeout(() => router.push(item.href as Route), 150);
                      }}
                      className="flex w-full cursor-pointer items-center rounded-xl px-3 py-2.5 text-left font-manrope font-semibold text-base text-text-main transition-colors hover:bg-brand-navy/5"
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {/* Auth buttons */}
              <div className="flex flex-col gap-2 pb-4">
                {session?.user ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setSheetOpen(false);
                        setTimeout(() => router.push(getDashboardLink()), 150);
                      }}
                      className="h-11 w-full cursor-pointer rounded-full bg-brand-navy font-bold font-manrope text-sm text-white transition-all hover:bg-brand-navy/90 active:scale-[0.98]"
                    >
                      Dashboard
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleSignOut();
                        setSheetOpen(false);
                      }}
                      disabled={isLoggingOut}
                      className="h-11 w-full cursor-pointer rounded-full border-2 border-brand-red font-bold font-manrope text-brand-red text-sm transition-all hover:bg-brand-red hover:text-white active:scale-[0.98] disabled:opacity-50"
                    >
                      {isLoggingOut ? "Signing out..." : "Sign Out"}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setSheetOpen(false);
                        setTimeout(() => router.push("/login"), 150);
                      }}
                      className="h-11 w-full cursor-pointer rounded-full border-2 border-gray-300 font-bold font-manrope text-sm text-text-main transition-all hover:bg-text-main hover:text-white active:scale-[0.98]"
                    >
                      Login
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSheetOpen(false);
                        setTimeout(() => router.push("/login"), 150);
                      }}
                      className="h-11 w-full cursor-pointer rounded-full bg-brand-navy font-bold font-manrope text-sm text-white transition-all hover:bg-brand-navy/90 active:scale-[0.98]"
                    >
                      Daftar Sekarang
                    </button>
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
