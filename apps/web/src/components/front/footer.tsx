"use client";

import { env } from "@mulai-plus/env/web";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "../ui/badge";

export function Footer() {
  return (
    <footer className="relative min-h-100 w-full overflow-hidden bg-[#1A1F6D] py-16 lg:pt-24 lg:pb-12">
      {/* Background Decoration - "mulai+" text */}
      <div className="absolute top-10 bottom-0 left-0 w-full select-none overflow-hidden leading-none">
        <Image
          src="/footer-type.svg"
          alt="Background Decoration"
          width={1920}
          height={387}
          className="w-full object-cover"
        />
      </div>

      <div className="container relative z-10 flex min-w-full flex-col gap-64 px-6 md:px-16">
        <div className="flex flex-col items-center justify-between gap-12 lg:flex-row lg:gap-0">
          {/* Logo */}
          <div className="shrink-0">
            <Image src="/light-type-logo.svg" alt="mulai+" width={140} height={40} className="h-10 w-auto lg:h-12" />
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col items-center gap-6 text-center sm:flex-row sm:gap-12 lg:text-left">
            {[
              { label: "About Us", href: "#about" },
              { label: "Featured Programs", href: "#featured-programs" },
              { label: "Meet The Mentors", href: "#mentors" },
              { label: "FAQ", href: "#faq" },
            ].map((link) => (
              <Link
                key={link.label}
                href={link.href as any}
                className="font-inter text-[#BFD6FF] text-lg transition-colors hover:text-white lg:text-2xl"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-col items-center justify-between gap-4 lg:flex-row lg:gap-0">
          <p className="flex items-center gap-2 text-center font-manrope text-[#BFD6FF] text-lg lg:text-xl">
            <Badge>
              {env.NEXT_PUBLIC_SERVER_URL === "http://localhost:3000"
                ? "development"
                : env.NEXT_PUBLIC_SERVER_URL === "https://api-staging.mulaiplus.id"
                  ? "staging"
                  : "production"}
            </Badge>
            &copy; 2026 mulai+. All rights reserved.{" "}
          </p>
          <p className="text-center font-manrope text-[#BFD6FF] text-lg lg:text-xl">
            <Link href={"https://captiveau.fun"} target="_blank">
              Powered by <b>Captiveau | Creative Tech Studio</b>
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
