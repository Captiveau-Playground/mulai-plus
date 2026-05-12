"use client";

import { Loader2, Menu, User } from "lucide-react";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();
  const { data: session } = authClient.useSession();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const getDashboardLink = () => {
    if (!session?.user) return "/dashboard/student";
    const role = session.user.role;
    if (role === "admin") return "/admin";
    if (role === "mentor") return "/mentor";
    if (role === "program_manager") return "/program-manager";
    return "/dashboard/student";
  };

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await authClient.signOut();
      await router.push("/login");
      window.location.reload();
    } catch (error) {
      setIsLoggingOut(false);
      console.error(error);
    }
  };

  // Different nav items based on current page and screen size
  const getNavItems = () => {
    // For homepage (/) and root path
    if (pathname === "/" || pathname === "") {
      return [
        { label: "About", href: "#about" },
        { label: "Featured Programs", href: "#featured-programs" },
        { label: "Meet The Mentors", href: "#mentors" },
        { label: "FAQ", href: "#faq" },
      ];
    }

    // For programs pages - use default for desktop, special for mobile
    if (pathname.startsWith("/programs")) {
      if (isMobile) {
        return [
          { label: "About", href: "#about" },
          { label: "Timeline", href: "#timeline" },
          { label: "What You Will Get", href: "#benefits" },
          { label: "Syallabus", href: "#syllabus" },
          { label: "FAQ", href: "#faq" },
        ];
      }
      // Desktop uses default navigation
      return [
        { label: "About", href: "/#about" },
        { label: "Programs", href: "/programs" },
        { label: "Mentors", href: "/#mentors" },
        { label: "FAQ", href: "/#faq" },
      ];
    }

    // Default fallback
    return [
      { label: "About", href: "/#about" },
      { label: "Programs", href: "/programs" },
      { label: "Mentors", href: "/#mentors" },
      { label: "FAQ", href: "/#faq" },
    ];
  };

  const navItems = getNavItems();
  return (
    <nav
      ref={navRef}
      className={cn(
        "fixed top-0 right-0 left-0 z-50 flex h-[8vh] w-full items-center justify-between px-6 transition-all duration-300 lg:grid lg:grid-cols-5 lg:px-16",
        isScrolled ||
          pathname.startsWith("/programs") ||
          pathname.startsWith("/courses") ||
          pathname.startsWith("/categories") ||
          pathname.startsWith("/privacy")
          ? "bg-white py-4 shadow-sm backdrop-blur-md"
          : "py-6 lg:py-4",
      )}
    >
      {/* Logo */}
      <div className="flex items-center lg:col-span-1 lg:justify-self-start">
        <Link href="/">
          <Image
            src="/letter-icon-logo.svg"
            alt="Mulai Plus Logo"
            width={150}
            height={38}
            className="w-30 md:w-48"
            priority
          />
        </Link>
      </div>

      {/* Desktop Navigation Links */}
      <div className="hidden w-full items-center justify-center gap-8 lg:col-span-3 lg:flex lg:gap-12 lg:justify-self-center">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href as Route}
            className="font-manrope text-[#333333] text-sm transition-colors hover:text-[#FE9114] lg:text-base"
            onClick={(e) => {
              // Handle anchor links on the same page
              if (item.href.startsWith("#")) {
                const element = document.querySelector(item.href) as HTMLElement | null;
                if (!element) return;
                e.preventDefault();
                const navHeight = navRef.current?.offsetHeight ?? 0;
                const absoluteY = element.getBoundingClientRect().top + window.scrollY;
                const top = Math.max(0, absoluteY - navHeight - 100);
                window.history.replaceState(null, "", item.href);
                window.scrollTo({ top, behavior: "smooth" });
              }
              // Handle links to homepage with anchors
              else if (item.href.includes("/#")) {
                const [path, anchor] = item.href.split("#");
                if (pathname === path) {
                  e.preventDefault();
                  const element = document.querySelector(`#${anchor}`) as HTMLElement | null;
                  if (!element) return;
                  const navHeight = navRef.current?.offsetHeight ?? 0;
                  const absoluteY = element.getBoundingClientRect().top + window.scrollY;
                  const top = Math.max(0, absoluteY - navHeight - 16);
                  window.history.replaceState(null, "", item.href);
                  window.scrollTo({ top, behavior: "smooth" });
                }
              }
            }}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {/* Desktop Auth Section */}
      <div className="hidden items-center gap-2.5 font-manrope lg:flex lg:justify-self-end">
        {session?.user ? (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button
                variant="ghost"
                className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full p-0"
              >
                <Avatar className="h-10 w-10 border-2 border-brand-navy">
                  <AvatarImage src={session.user.image || undefined} alt={session.user.name || "User"} />
                  <AvatarFallback className="bg-brand-navy text-white">
                    {session.user.name?.charAt(0).toUpperCase() || <User className="h-5 w-5" />}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 rounded-2xl border border-gray-100 bg-white p-3 shadow-xl">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="p-3 font-normal">
                  <div className="flex flex-col gap-1">
                    <p className="font-bold font-bricolage text-[#1A1F6D] text-base">{session.user.name}</p>
                    <p className="font-manrope text-[#888888] text-sm">{session.user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-100" />
                <DropdownMenuItem className={"hover:bg-[#1A1F6D] hover:text-white"}>
                  <Link
                    href={getDashboardLink()}
                    className="flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3.5 font-manrope text-[#333333] text-sm transition-colors"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1A1F6D]/10">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
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
                <DropdownMenuSeparator className="bg-gray-100" />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  disabled={isLoggingOut}
                  className="flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3.5 font-manrope text-[#F93447] text-sm transition-colors hover:bg-[#F93447] hover:text-white disabled:opacity-50"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F93447]/10">
                    {isLoggingOut ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" x2="9" y1="12" y2="12" />
                      </svg>
                    )}
                  </div>
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <Link href="/login">
              <Button
                variant="ghost"
                className="cursor-pointer rounded-full px-6 py-4 font-bold text-[#333333] text-sm lg:px-9 lg:py-6 lg:text-base"
              >
                Login
              </Button>
            </Link>
            <Link href="/login">
              <Button className="cursor-pointer rounded-full bg-[#1A1F6D] px-6 py-4 font-bold text-sm text-white hover:bg-[#1A1F6D]/90 lg:px-9 lg:py-6 lg:text-base">
                Daftar Sekarang
              </Button>
            </Link>
          </>
        )}
      </div>

      {/* Mobile Menu */}
      <div className="flex lg:hidden">
        <Sheet>
          <SheetTrigger>
            <Button variant="ghost" size="icon" className="text-[#333333]">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" showCloseButton={false} className="w-full border-none bg-white p-0 sm:w-100">
            <div className="mb-8 flex h-full flex-col p-6">
              {/* Custom Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Image src="/letter-icon-logo.svg" alt="Mulai Plus Logo" width={120} height={30} priority />
                </div>
                <SheetTrigger>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full text-[#333333] hover:bg-gray-100"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-6 w-6"
                      aria-label="Close menu"
                      aria-labelledby="close-menu"
                      role="img"
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                    <span className="sr-only">Close</span>
                  </Button>
                </SheetTrigger>
              </div>

              {/* Menu Links */}
              <div className="mt-12 flex flex-1 flex-col gap-8 pt-12">
                <div className="flex flex-col gap-6">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href as Route}
                      className="font-bricolage font-semibold text-2xl text-[#333333] transition-colors hover:text-[#FE9114]"
                      onClick={(e) => {
                        // Handle anchor links on the same page
                        if (item.href.startsWith("#")) {
                          const element = document.querySelector(item.href) as HTMLElement | null;
                          if (!element) return;
                          e.preventDefault();
                          const navHeight = navRef.current?.offsetHeight ?? 0;
                          const absoluteY = element.getBoundingClientRect().top + window.scrollY;
                          const top = Math.max(0, absoluteY - navHeight - 90);
                          window.history.replaceState(null, "", item.href);
                          window.scrollTo({ top, behavior: "smooth" });
                        }
                        // Handle links to homepage with anchors
                        else if (item.href.includes("/#")) {
                          const [path, anchor] = item.href.split("#");
                          if (pathname === path) {
                            e.preventDefault();
                            const element = document.querySelector(`#${anchor}`) as HTMLElement | null;
                            if (!element) return;
                            const navHeight = navRef.current?.offsetHeight ?? 0;
                            const absoluteY = element.getBoundingClientRect().top + window.scrollY;
                            const top = Math.max(0, absoluteY - navHeight - 90);
                            window.history.replaceState(null, "", item.href);
                            window.scrollTo({ top, behavior: "smooth" });
                          }
                        }
                      }}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="mt-auto flex flex-col gap-4 pb-8">
                {session?.user ? (
                  <>
                    <Link href={getDashboardLink()}>
                      <Button className="h-12 w-full rounded-full bg-brand-navy font-bold text-base text-white hover:bg-brand-navy/90">
                        Dashboard
                      </Button>
                    </Link>
                    <Button
                      type="button"
                      onClick={handleSignOut}
                      disabled={isLoggingOut}
                      variant="outline"
                      className="h-12 w-full rounded-full border-2 border-brand-red font-bold text-base text-brand-red hover:bg-brand-red hover:text-white disabled:opacity-50"
                    >
                      {isLoggingOut ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing out...
                        </>
                      ) : (
                        "Sign Out"
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/login">
                      <Button
                        variant="outline"
                        className="h-12 w-full rounded-full border-2 border-[#333333] font-bold text-[#333333] text-base hover:bg-[#333333] hover:text-white"
                      >
                        Login
                      </Button>
                    </Link>
                    <Link href="/login">
                      <Button className="h-12 w-full rounded-full bg-[#1A1F6D] font-bold text-base text-white hover:bg-[#1A1F6D]/90">
                        Daftar Sekarang
                      </Button>
                    </Link>
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
