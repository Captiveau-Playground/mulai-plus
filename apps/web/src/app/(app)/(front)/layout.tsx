import type { Metadata } from "next";
import { Footer } from "@/components/front/footer";
import { Navbar } from "@/components/front/navbar";

export const metadata: Metadata = {
  title: {
    default: "MULAI+ — Bimbingan Universitas, Jurusan & Beasiswa",
    template: "%s | MULAI+",
  },
  description:
    "MULAI+ membimbingmu memilih universitas dan jurusan yang tepat. Program mentoring terstruktur dengan mentor berpengalaman, bimbingan beasiswa, dan persiapan PTN.",
  alternates: {
    languages: {
      "id-ID": "/",
    },
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "MULAI+",
    title: "MULAI+ — Bimbingan Universitas, Jurusan & Beasiswa",
    description:
      "MULAI+ membimbingmu memilih universitas dan jurusan yang tepat. Program mentoring terstruktur dengan mentor berpengalaman, bimbingan beasiswa, dan persiapan PTN.",
  },
  twitter: {
    card: "summary_large_image",
    title: "MULAI+ — Bimbingan Universitas, Jurusan & Beasiswa",
    description:
      "MULAI+ membimbingmu memilih universitas dan jurusan yang tepat. Program mentoring terstruktur dengan mentor berpengalaman, bimbingan beasiswa, dan persiapan PTN.",
  },
};

export default function FrontLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <style>{"html { scrollbar-gutter: stable; }"}</style>
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-xl focus:bg-brand-navy focus:px-6 focus:py-3 focus:font-manrope focus:text-sm focus:text-white focus:shadow-lg focus:outline-none"
      >
        Langsung ke konten utama
      </a>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
