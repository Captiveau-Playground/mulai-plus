"use client";

import { env } from "@mulai-plus/env/web";
import { ArrowRight, Instagram, Linkedin, Mail, MapPin, Phone, Youtube } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

const footerNavLinks = [
  {
    title: "Navigate",
    links: [
      { label: "About Us", href: "/#about" },
      { label: "Featured Programs", href: "/#featured-programs" },
      { label: "Meet The Mentors", href: "/#mentors" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    title: "Programs",
    links: [
      { label: "Program", href: "/programs" },
      { label: "Beasiswa Mentoring", href: "/programs/program-beasiswa-mentoring" },
      { label: "Privacy & Policy", href: "/privacy" },
    ],
  },
  {
    title: "Contact",
    links: [
      { label: "hello@mulaiplus.id", href: "mailto:hello@mulaiplus.id", icon: Mail },
      { label: "+62 812-3456-7890", href: "tel:+6281234567890", icon: Phone },
      { label: "Jakarta, Indonesia", href: "#", icon: MapPin },
    ],
  },
];

const socialLinks = [
  { label: "Instagram", href: "https://instagram.com/mulaiplus", icon: Instagram },
  { label: "LinkedIn", href: "https://linkedin.com/company/mulai-plus", icon: Linkedin },
  { label: "YouTube", href: "https://youtube.com/@mulaiplus", icon: Youtube },
];

export function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
    setEmail("");
    setTimeout(() => setSubscribed(false), 3000);
  };

  return (
    <footer className="relative overflow-hidden bg-[#0D1145]">
      {/* ===== Background Decorations ===== */}
      {/* Subtle grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Gradient orbs */}
      <div className="pointer-events-none absolute top-0 -left-48 h-96 w-96 rounded-full bg-[#FE9114]/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-48 bottom-0 h-96 w-96 rounded-full bg-[#F93447]/10 blur-3xl" />

      {/* Background SVG decoration */}
      <div className="pointer-events-none absolute top-12 bottom-0 left-0 w-full select-none overflow-hidden leading-none opacity-40">
        <Image src="/footer-type.svg" alt="" width={1920} height={387} className="w-full object-cover" aria-hidden />
      </div>

      {/* ===== Newsletter Section ===== */}
      <div className="relative z-10 border-white/10 border-b">
        <div className="container mx-auto max-w-7xl py-12 lg:py-16">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center lg:gap-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="font-manrope text-[#BFD6FF] text-xs uppercase tracking-wide">Stay in the loop</span>
            </div>

            <h2 className="font-bold font-bricolage text-3xl text-white leading-tight tracking-tight md:text-4xl lg:text-5xl">
              Ready to{" "}
              <span className="bg-linear-to-r from-[#FE9114] to-[#F93447] bg-clip-text text-transparent">mulai+</span>?
            </h2>

            <p className="max-w-lg font-manrope text-[#BFD6FF] text-base leading-relaxed lg:text-lg">
              Subscribe to our newsletter for the latest program updates, university tips, and exclusive mentorship
              opportunities.
            </p>

            <form
              onSubmit={handleSubscribe}
              className="flex w-full max-w-md items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-1.5 ring-1 ring-white/5 backdrop-blur-sm transition-all duration-300 focus-within:border-[#FE9114]/50 focus-within:ring-[#FE9114]/20"
            >
              <Mail className="ml-3 h-5 w-5 shrink-0 text-[#BFD6FF]/60" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full bg-transparent py-2 font-manrope text-sm text-white placeholder:text-[#BFD6FF]/40 focus:outline-none"
              />
              <Button
                type="submit"
                className="group cursor-pointer rounded-xl bg-linear-to-r from-[#FE9114] to-[#F93447] px-5 py-5 font-inter font-semibold text-sm text-white transition-all duration-300 hover:scale-105 hover:shadow-[#F93447]/25 hover:shadow-lg"
              >
                {subscribed ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Subscribed!
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    Subscribe
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </span>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* ===== Main Footer Content ===== */}
      <div className="container relative z-10 mx-auto max-w-7xl px-4 py-16 md:px-6 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          {/* ===== Brand Column ===== */}
          <div className="flex flex-col gap-6 lg:col-span-4">
            <Link href="/" className="inline-block shrink-0 transition-opacity hover:opacity-80">
              <Image src="/light-type-logo.svg" alt="mulai+" width={140} height={40} className="h-10 w-auto lg:h-12" />
            </Link>

            <p className="font-manrope text-[#BFD6FF]/70 text-sm leading-relaxed lg:text-base">
              MULAI+ membimbingmu memilih universitas dan jurusan yang tepat. Bersama mentor berpengalaman, temukan masa
              depan yang sesuai dengan impianmu.
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <Link
                  key={social.label}
                  href={social.href as any}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#BFD6FF] transition-all duration-300 hover:border-[#FE9114]/30 hover:bg-[#FE9114]/10 hover:text-[#FE9114] hover:shadow-[#FE9114]/10 hover:shadow-lg"
                >
                  <social.icon className="h-4.5 w-4.5" />
                </Link>
              ))}
            </div>

            {/* Partner badges */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {["google", "microsoft", "meta", "tokopedia", "discord"].map((partner) => (
                <div
                  key={partner}
                  className="flex h-8 items-center rounded-lg border border-white/5 bg-white/[0.03] px-3 transition-all duration-200 hover:border-white/10 hover:bg-white/[0.06]"
                >
                  <Image
                    src={`/partners/${partner}.svg`}
                    alt={partner}
                    width={60}
                    height={20}
                    className="h-4 w-auto opacity-40 grayscale transition-all duration-300 hover:opacity-70 hover:grayscale-0"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ===== Link Columns ===== */}
          <div className="mt-0 flex flex-col gap-12 md:mt-18 lg:col-span-8 lg:grid lg:grid-cols-3 lg:gap-8">
            {footerNavLinks.map((column) => (
              <div key={column.title} className="flex flex-col gap-5">
                <h3 className="font-bricolage font-semibold text-sm text-white uppercase tracking-wider">
                  {column.title}
                </h3>
                <ul className="flex flex-col gap-3.5">
                  {column.links.map((link) => {
                    const Icon = "icon" in link ? link.icon : undefined;
                    return (
                      <li key={link.label}>
                        <Link
                          href={link.href as any}
                          className="group inline-flex items-center gap-2 font-manrope text-[#BFD6FF]/70 text-sm transition-all duration-200 hover:text-white lg:text-base"
                        >
                          {Icon && (
                            <Icon className="h-4 w-4 shrink-0 text-[#BFD6FF]/40 transition-colors group-hover:text-[#FE9114]" />
                          )}
                          <span>{link.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== Bottom Bar ===== */}
      <div className="relative z-10 border-white/5 border-t">
        <div className="container mx-auto max-w-7xl px-4 md:px-6">
          <div className="flex flex-col items-center justify-between gap-4 py-6 lg:flex-row lg:py-4">
            {/* Left: Badge + Copyright */}
            <div className="flex flex-col items-center gap-3 lg:flex-row lg:items-center">
              <Badge className="border-white/10 bg-white/5 font-manrope text-[#BFD6FF]/80 text-[10px] uppercase tracking-wider hover:bg-white/10">
                {env.NEXT_PUBLIC_SERVER_URL === "http://localhost:3000"
                  ? "⚡ development"
                  : env.NEXT_PUBLIC_SERVER_URL === "https://api-staging.mulaiplus.id"
                    ? "🔄 staging"
                    : "🚀 production"}
              </Badge>

              <span className="hidden text-white/20 lg:inline">|</span>

              {/* Uptime Badge */}
              <div className="flex w-full justify-center lg:w-fit">
                <iframe
                  src="https://status.captiveau.fun/badge?theme=dark"
                  width="180"
                  height="30"
                  frameBorder="0"
                  scrolling="no"
                  style={{ colorScheme: "normal", border: "none" }}
                  title="Status"
                  className="opacity-80 transition-opacity hover:opacity-100"
                />
              </div>
            </div>

            {/* Right: Copyright + Credit */}
            <div className="flex flex-col items-center gap-2 text-center lg:items-end lg:text-right">
              <p className="font-manrope text-[#BFD6FF]/50 text-xs lg:text-sm">
                &copy; {new Date().getFullYear()} mulai+. All rights reserved.
              </p>
              <p className="font-manrope text-[#BFD6FF]/40 text-xs lg:text-sm">
                Powered by{" "}
                <Link
                  href="https://captiveau.fun"
                  target="_blank"
                  className="font-semibold text-[#BFD6FF]/60 transition-colors hover:text-[#FE9114]"
                >
                  Captiveau
                </Link>
                <span className="mx-1.5 text-[#BFD6FF]/20">|</span>
                <span className="text-[#BFD6FF]/40">Creative Tech Studio</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
