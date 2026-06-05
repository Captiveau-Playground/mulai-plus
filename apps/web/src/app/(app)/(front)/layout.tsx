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
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
