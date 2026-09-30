"use client";
import { motion } from "framer-motion";
import { ArrowRight, Facebook, Instagram, Linkedin, Loader2, Mail, MapPin, Phone } from "lucide-react";

/** Brand icon Threads (tidak ada di lucide) */
function ThreadsIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.186 23.86c-2.832 0-5.128-.715-6.912-2.15C3.744 20.514 2.82 18.548 2.82 16.1c0-2.25.83-4.17 2.534-5.87.645-.645 1.373-1.22 2.19-1.72l.07.133c-.595.38-1.14.82-1.637 1.324-1.286 1.29-2.106 2.99-2.234 4.607.04-2.03.55-4.04 1.77-5.654 1.13-1.496 2.79-2.593 4.593-3.035C8.53 7.63 6.43 10.1 6.03 13.37c-.362-.29-.79-.57-1.21-.78 1.12-3.19 3.08-6.03 6.83-6.76l.39-.078c.73-.147 1.47-.16 2.21-.04.027-.364-.001-.728-.082-1.083l.095-.022c.462.13.896.336 1.29.61-.12.396-.2.804-.236 1.22-.338.047-.673.1-1.007.16 1.418.216 2.665.8 3.683 1.686 1.467 1.276 2.266 3.092 2.253 5.12 0 2.88-1.6 5.26-4.66 6.89-1.6.85-3.34 1.31-5.13 1.36m3.9-11.52c-.44-.5-1.03-.86-1.75-.95.17-.44.32-1.285.12-2.16.32-.37.63-.76.9-1.17-.06-1.02-2.12-1-2.83-.15-.29-.28-.2.6-.36 1.28-2.7.64-3.5 2.24-3.5 4.06 0 1.392.398 2.596 1.24 3.58l.05.05c-.16.18.76-.29 1.3-.42l.64.5c-.51.16-1.03.37-1.51.62.36-.09.73-.14 1.1-.14-1.13.98-2.62 1.19-3.36 1.41.37.31.88.5 1.3.5-.47.07-.94.05-1.4-.06a4.81 4.81 0 0 1-.77-.24c-.02 0-.03.04-.01.06l.45.11.02 2.91c0 1.19.17 2.4.84 3.17.28.31.64.55 1.03.69.95.3 2-.02 2.58-.72.87-1.1.6-2.75.12-3.8-.98-.14-2.02 1.2-2.02 1.2.93-1.29 2.42-1.52 3.4-1.07.05.02.1.05.14.08.03-.09.05-.18.07-.27-.62.47-1.3.68-1.98.63 1.07-.68 2.19-.99 2.66.09.39.92-.06 1.85-.83 2.47-1.34.99-3.48.9-4.72.14-.79-.5-1.2-1.34-1.31-2.26-.08.06-.16.12-.23.19-.3-.3-.55-.66-.72-1.06.05-.05.1-.1.14-.16l-.18-.24c-.19-.55-.3-1.12-.34-1.7L16.05 12.5c.05-.09.06-.18.04-.16m-1.3-1.15c.2.33.45.62.73.88.43-.26.99-.4 1.55-.4 2.16 0 3.79-1.13 4.07-2.82-.4.89-1.33 1.27-2.15 1.43-.72-1.18-1.98-2.04-3.48-2.03l.28-.74.14-.1c-.11-.44-.08-1.08.05-1.87-.13-.09-.28-.09-.4-.05-1.64 1.06-2.7 2.88-2.79 4.53.6.57 1.3 1.02 2.5 1.17m.7 1.2c.23.36.56.67.94.91-.62.15-.89.14-1.29-.12s-.66-.72-.83-1.13c.28.15.61.3.91.31-.09-.01.13 0 .27.03" />
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
