import type { Metadata, Viewport } from "next";
import { ChatbotProvider } from "@/components/chatbot/chatbot-provider";

export const metadata: Metadata = {
  title: "Eksplorasi Data Pendidikan Tinggi — MULAI+",
  description:
    "Jelajahi data lengkap 408 perguruan tinggi, 18.881 program studi, dan passing grade SNBP/SNBT 5 tahun terakhir. Bantu kamu menentukan pilihan universitas dan jurusan terbaik.",
  alternates: {
    canonical: "/explore",
  },
  openGraph: {
    title: "Eksplorasi Data Pendidikan Tinggi — MULAI+",
    description: "Jelajahi data lengkap perguruan tinggi, program studi, dan passing grade SNBP/SNBT.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Eksplorasi Data Pendidikan Tinggi — MULAI+",
    description: "Jelajahi data lengkap perguruan tinggi, program studi, dan passing grade SNBP/SNBT.",
  },
};

export const viewport: Viewport = {
  themeColor: "#1A1F6D",
};

const jsonLdCollection = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Eksplorasi Data Pendidikan Tinggi — MULAI+",
  description:
    "Jelajahi data lengkap 408 perguruan tinggi, 18.881 program studi, dan passing grade SNBP/SNBT 5 tahun terakhir.",
  provider: {
    "@type": "Organization",
    name: "MULAI+",
    url: process.env.NEXT_PUBLIC_APP_URL ?? "https://mulaiplus.id",
  },
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        id="jsonld-explore-collection"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdCollection) }}
      />
      {children}
      <ChatbotProvider />
    </>
  );
}
