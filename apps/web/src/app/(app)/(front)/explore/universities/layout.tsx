import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daftar Universitas — Eksplorasi Data Pendidikan Tinggi | MULAI+",
  description:
    "Jelajahi 408 perguruan tinggi di Indonesia. Lihat akreditasi, program studi, biaya kuliah, dan statistik lengkap dari PTN, PT Agama Negeri, dan Swasta Unggul.",
  alternates: {
    canonical: "/explore/universities",
  },
  openGraph: {
    title: "Daftar Universitas di Indonesia — MULAI+",
    description:
      "Jelajahi 408 perguruan tinggi Indonesia lengkap dengan data akreditasi, program studi, dan statistik.",
    type: "website",
  },
};

const jsonLdCollection = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Universities — MULAI+",
  description: "Jelajahi 408 perguruan tinggi di Indonesia",
};

export default function UniversitiesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        id="jsonld-universities-collection"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdCollection) }}
      />
      {children}
    </>
  );
}
