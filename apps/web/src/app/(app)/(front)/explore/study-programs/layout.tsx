import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Program Studi — Eksplorasi Data Pendidikan Tinggi | MULAI+",
  description:
    "Cari dan jelajahi 18.881 program studi dari berbagai perguruan tinggi di Indonesia. Filter berdasarkan jenjang, akreditasi, dan passing grade SNBP/SNBT.",
  alternates: {
    canonical: "/explore/study-programs",
  },
  openGraph: {
    title: "Program Studi di Indonesia — MULAI+",
    description: "Cari program studi impianmu dari 18.881 program studi di seluruh Indonesia.",
    type: "website",
  },
};

const jsonLdCollection = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Study Programs — MULAI+",
  description: "Jelajahi 18.881 program studi dari berbagai perguruan tinggi",
};

export default function StudyProgramsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        id="jsonld-study-programs-collection"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdCollection) }}
      />
      {children}
    </>
  );
}
