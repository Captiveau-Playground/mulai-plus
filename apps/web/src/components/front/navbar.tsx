"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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

  return (
    <nav
      className={cn(
        "fixed top-0 right-0 left-0 z-50 grid w-full grid-cols-3 items-center px-16 transition-all duration-300",
        isScrolled ? "bg-white/80 py-4 shadow-sm backdrop-blur-md" : "bg-transparent py-4",
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-self-start">
        <Link href="/">
          <Image src="/letter-icon-logo.svg" alt="Mulai Plus Logo" width={192} height={48} priority />
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex items-center justify-center gap-12 justify-self-center">
        {["About Us", "Featured Programs", "Meet The Mentors", "FAQ"].map((item) => (
          <Link
            key={item}
            href="#"
            className="font-manrope text-[#333333] text-base transition-colors hover:text-[#FE9114]"
          >
            {item}
          </Link>
        ))}
      </div>

      {/* Auth Buttons */}
      <div className="flex items-center gap-2.5 justify-self-end font-manrope">
        <Button variant="ghost" className="rounded-full px-9 py-4 font-bold font-inter text-[#333333] text-base">
          Login
        </Button>
        <Button className="rounded-full bg-[#1A1F6D] px-9 py-6 font-bold font-inter text-base text-white hover:bg-[#1A1F6D]/90">
          Daftar Sekarang
        </Button>
      </div>
    </nav>
  );
}
