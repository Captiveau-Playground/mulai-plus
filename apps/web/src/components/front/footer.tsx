"use client";
import { motion } from "framer-motion";
import { ArrowRight, Facebook, Instagram, Linkedin, Loader2, Mail, MapPin, Phone } from "lucide-react";

/** Brand icon Threads (tidak ada di lucide) */
function ThreadsIcon({ className = "" }: { className?: string }) {
  return (
    <svg aria-label="Threads" viewBox="0 0 192 192" fill="currentColor" className={className} aria-hidden="true">
      <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.7731 51.1409 62.102 62.7807L75.881 72.2328C81.6116 63.5383 90.6052 61.6848 97.2286 61.6848C97.3051 61.6848 97.3819 61.6848 97.4576 61.6855C105.707 61.7381 111.932 64.1366 115.961 68.814C118.893 72.2193 120.854 76.925 121.825 82.8638C114.511 81.6207 106.601 81.2385 98.145 81.7233C74.3247 83.0954 59.0111 96.9879 60.0396 116.292C60.5615 126.084 65.4397 134.508 73.775 140.011C80.8224 144.663 89.899 146.938 99.3323 146.423C111.79 145.74 121.563 140.987 128.381 132.296C133.559 125.696 136.834 117.143 138.28 106.366C144.217 109.949 148.617 114.664 151.047 120.332C155.179 129.967 155.42 145.8 142.501 158.708C131.182 170.016 117.576 174.908 97.0135 175.059C74.2042 174.89 56.9538 167.575 45.7381 153.317C35.2355 139.966 29.8077 120.682 29.6052 96C29.8077 71.3178 35.2355 52.0336 45.7381 38.6827C56.9538 24.4249 74.2039 17.11 97.0132 16.9405C119.988 17.1113 137.539 24.4614 149.184 38.788C154.894 45.8136 159.199 54.6488 162.037 64.9503L178.184 60.6422C174.744 47.9622 169.331 37.0357 161.965 27.974C147.036 9.60668 125.202 0.195148 97.0695 0H96.9569C68.8816 0.19447 47.2921 9.6418 32.7883 28.0793C19.8819 44.4864 13.2244 67.3157 13.0007 95.9325L13 96L13.0007 96.0675C13.2244 124.684 19.8819 147.514 32.7883 163.921C47.2921 182.358 68.8816 191.806 96.9569 192H97.0695C122.03 191.827 139.624 185.292 154.118 170.811C173.081 151.866 172.51 128.119 166.26 113.541C161.776 103.087 153.227 94.5962 141.537 88.9883ZM98.4405 129.507C88.0005 130.095 77.1544 125.409 76.6196 115.372C76.2232 107.93 81.9158 99.626 99.0812 98.6368C101.047 98.5234 102.976 98.468 104.871 98.468C111.106 98.468 116.939 99.0737 122.242 100.233C120.264 124.935 108.662 128.946 98.4405 129.507Z" />
    </svg>
  );
}

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { resetConsent } from "@/lib/analytics";
import { client } from "@/lib/client";
import { BLOG_LINKS, CONTACT, EXPLORE_LINKS, OTHER_LINKS, PROGRAM_LINKS, SOCIAL } from "@/lib/site-config";
import { notify } from "@/lib/toast";
import { getWebEnv, RELEASE_TAG } from "@/lib/web-env";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

const footerNavLinks = [
  {
    title: "Program",
    links: PROGRAM_LINKS,
  },
  {
    title: "Explore",
    links: EXPLORE_LINKS,
  },
  {
    title: "Assessment",
    links: [
      { label: "Tes Minat Bakat", href: "/assessment" },
      { label: "Tes Minat (Holland)", href: "/assessment/minat" },
      { label: "Tes Bakat", href: "/assessment/bakat" },
      { label: "Karir Impian", href: "/assessment/future-career" },
    ],
  },
  {
    title: "Blog",
    links: BLOG_LINKS,
  },
  {
    title: "About",
    links: [
      { label: "About Us", href: "/#about" },
      { label: "Mentors", href: "/#mentors" },
      { label: "Sponsor & Partner", href: "/sponsors" },
      { label: "Pembaruan / Changelog", href: "/changelog" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    title: "Legal",
    links: OTHER_LINKS,
  },
  {
    title: "Contact",
    links: [
      { label: CONTACT.email, href: `mailto:${CONTACT.email}`, icon: Mail },
      {
        label: CONTACT.phoneDisplay,
        href: `tel:${CONTACT.phone}`,
        icon: Phone,
      },
      {
        label: CONTACT.locationDetail,
        href: CONTACT.mapsUrl,
        icon: MapPin,
        external: true,
      },
    ],
  },
];

const socialLinks = [
  {
    label: SOCIAL.instagram.label,
    href: SOCIAL.instagram.url,
    icon: Instagram,
  },
  { label: SOCIAL.linkedin.label, href: SOCIAL.linkedin.url, icon: Linkedin },
  { label: SOCIAL.facebook.label, href: SOCIAL.facebook.url, icon: Facebook },
  { label: SOCIAL.threads.label, href: SOCIAL.threads.url, icon: ThreadsIcon },
];

export function Footer() {
  const pathname = usePathname();
  const isExplore = pathname?.startsWith("/explore");
  const [email, setEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || subscribing) return;
    setSubscribing(true);
    try {
      await client.cms.newsletter.subscribe({ email, source: "footer-form" });
      setSubscribed(true);
      setEmail("");
      notify.create("Berlangganan berhasil", { description: "Ikuti update program & tips universitas." });
      setTimeout(() => setSubscribed(false), 3000);
    } catch (_error) {
      notify.error("Gagal berlangganan 🙈", { description: "Coba lagi sebentar ya." });
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="relative overflow-hidden bg-brand-navy"
    >
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
      <div className="pointer-events-none absolute top-0 -left-48 h-96 w-96 rounded-full bg-brand-orange/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-48 bottom-0 h-96 w-96 rounded-full bg-brand-red/10 blur-3xl" />

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
              <span className="font-manrope text-text-lighter-blue text-xs uppercase tracking-wide">
                Stay in the loop
              </span>
            </div>

            <h2 className="font-bold font-bricolage text-3xl text-white leading-tight tracking-tight md:text-4xl lg:text-5xl">
              Ready to <span className="text-brand-orange">mulai+</span>?
            </h2>

            <p className="max-w-lg font-manrope text-base text-text-lighter-blue leading-relaxed lg:text-lg">
              Subscribe to our newsletter for the latest program updates, university tips, and exclusive mentorship
              opportunities.
            </p>

            <form
              onSubmit={handleSubscribe}
              className="flex w-full max-w-md items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-1.5 ring-1 ring-white/5 backdrop-blur-sm transition-all duration-300 focus-within:border-brand-orange/50 focus-within:ring-brand-orange/20"
            >
              <Mail className="ml-3 h-5 w-5 shrink-0 text-text-lighter-blue/60" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full bg-transparent py-2 font-manrope text-sm text-white placeholder:text-text-lighter-blue/40 focus:outline-none"
              />
              <Button
                type="submit"
                className="group cursor-pointer rounded-xl bg-brand-red px-5 py-5 font-manrope font-semibold text-sm text-white transition-all duration-300 hover:scale-105 hover:bg-brand-red/90 hover:shadow-lg"
              >
                {subscribing ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Subscribing...
                  </span>
                ) : subscribed ? (
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

            <p className="font-manrope text-sm text-text-lighter-blue/70 leading-relaxed lg:text-base">
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
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-text-lighter-blue transition-all duration-300 hover:border-brand-orange/30 hover:bg-brand-orange/10 hover:text-brand-orange hover:shadow-brand-orange/10 hover:shadow-lg"
                >
                  <social.icon className="h-4.5 w-4.5" />
                </Link>
              ))}
            </div>
          </div>

          {/* ===== Link Columns ===== */}
          <div className="mt-0 grid grid-cols-2 gap-x-4 gap-y-10 md:mt-18 lg:col-span-8 lg:grid-cols-3 lg:gap-8">
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
                          target={link.href.startsWith("http") ? "_blank" : undefined}
                          rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                          className="group inline-flex items-start gap-2 font-manrope text-sm text-text-lighter-blue/70 transition-all duration-200 hover:text-white lg:text-base"
                        >
                          {Icon && (
                            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-text-lighter-blue/40 transition-colors group-hover:text-brand-orange" />
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
              <Badge className="border-white/10 bg-white/5 font-manrope text-[10px] text-text-lighter-blue/80 uppercase tracking-wider hover:bg-white/10">
                {getWebEnv() === "development"
                  ? "⚡ development"
                  : getWebEnv() === "staging"
                    ? "🔄 staging"
                    : "🚀 production"}
              </Badge>

              {/* Release version badge */}
              {RELEASE_TAG && (
                <Link
                  href={"/changelog" as any}
                  title={`Release: ${RELEASE_TAG} — lihat changelog`}
                  className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-medium font-mono text-[10px] text-text-lighter-blue/70 tracking-wide transition-colors hover:bg-white/10 hover:text-text-lighter-blue"
                >
                  {RELEASE_TAG}
                </Link>
              )}

              <span className="hidden text-white/20 lg:inline">|</span>

              {/* Uptime Badge */}
              <div className="flex w-full justify-center lg:w-fit">
                <iframe
                  src="https://status.mulaiplus.id/badge?theme=dark"
                  width="250"
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
              <p className="font-manrope text-text-lighter-blue/50 text-xs lg:text-sm">
                &copy; {new Date().getFullYear()} mulai+. All rights reserved.
              </p>
              {isExplore && (
                <p className="font-manrope text-[10px] text-text-lighter-blue/30 lg:text-xs">
                  Data perguruan tinggi dari PDDikti &amp; SNPMB (Kemdiktisaintek RI)
                </p>
              )}
              <button
                type="button"
                onClick={() => resetConsent()}
                className="font-manrope text-[11px] text-text-lighter-blue/40 underline-offset-2 transition-colors hover:text-text-lighter-blue/70 hover:underline"
              >
                Kelola izin cookie
              </button>
              <p className="font-manrope text-text-lighter-blue/40 text-xs lg:text-sm">
                Powered by{" "}
                <Link
                  href="https://captiveau.fun"
                  target="_blank"
                  className="font-semibold text-text-lighter-blue/60 transition-colors hover:text-brand-orange"
                >
                  Captiveau
                </Link>
                <span className="mx-1.5 text-text-lighter-blue/20">|</span>
                <span className="text-text-lighter-blue/40">Creative Tech Studio</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.footer>
  );
}
