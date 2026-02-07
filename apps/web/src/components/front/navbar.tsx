"use client";

import { Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = ["About Us", "Featured Programs", "Meet The Mentors", "FAQ"];

  return (
    <nav
      className={cn(
        "fixed top-0 right-0 left-0 z-50 flex w-full items-center justify-between px-6 transition-all duration-300 lg:grid lg:grid-cols-3 lg:px-16",
        isScrolled ? "bg-white/80 py-4 shadow-sm backdrop-blur-md" : "bg-transparent py-6 lg:py-4",
      )}
    >
      {/* Logo */}
      <div className="flex items-center lg:justify-self-start">
        <Link href="/">
          <Image
            src="/letter-icon-logo.svg"
            alt="Mulai Plus Logo"
            width={150}
            height={38}
            className="w-[120px] md:w-[192px]"
            priority
          />
        </Link>
      </div>

      {/* Desktop Navigation Links */}
      <div className="items-center justify-center gap-8 lg:flex lg:gap-12 lg:justify-self-center">
        {navLinks.map((item) => (
          <Link
            key={item}
            href="#"
            className="font-manrope text-[#333333] text-sm transition-colors hover:text-[#FE9114] lg:text-base"
          >
            {item}
          </Link>
        ))}
      </div>

      {/* Desktop Auth Buttons */}
      <div className="hidden items-center gap-2.5 font-manrope lg:flex lg:justify-self-end">
        <Button
          variant="ghost"
          className="rounded-full px-6 py-3 font-bold font-inter text-[#333333] text-sm lg:px-9 lg:py-4 lg:text-base"
        >
          Login
        </Button>
        <Button className="rounded-full bg-[#1A1F6D] px-6 py-4 font-bold font-inter text-sm text-white hover:bg-[#1A1F6D]/90 lg:px-9 lg:py-6 lg:text-base">
          Daftar Sekarang
        </Button>
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
          <SheetContent side="right" showCloseButton={false} className="w-full border-none bg-white p-0 sm:w-[400px]">
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
                  {navLinks.map((item) => (
                    <Link
                      key={item}
                      href="#"
                      className="font-bricolage font-semibold text-2xl text-[#333333] transition-colors hover:text-[#FE9114]"
                    >
                      {item}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="mt-auto flex flex-col gap-4 pb-8">
                <Button
                  variant="outline"
                  className="h-12 w-full rounded-full border-2 border-[#333333] font-bold font-inter text-[#333333] text-base hover:bg-[#333333] hover:text-white"
                >
                  Login
                </Button>
                <Button className="h-12 w-full rounded-full bg-[#1A1F6D] font-bold font-inter text-base text-white hover:bg-[#1A1F6D]/90">
                  Daftar Sekarang
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
