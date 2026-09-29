import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cek Passing Grade SNBP/SNBT — Data Daya Tampung & Keketatan PTN | MULAI+",
  description:
    "Cek passing grade, daya tampung, dan tingkat keketatan SNBP/SNBT untuk ribuan program studi di 146 PTN Indonesia. Data 5 tahun terakhir (2021-2025). Cari jurusan impianmu dan lihat peluang lolos.",
  alternates: {
    canonical: "/explore/passing-grade",
  },
  openGraph: {
    title: "Cek Passing Grade SNBP/SNBT — Data Daya Tampung & Keketatan PTN | MULAI+",
    description:
      "Cek passing grade dan daya tampung SNBP/SNBT untuk ribuan program studi di 146 PTN. Data 5 tahun terakhir.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cek Passing Grade SNBP/SNBT — MULAI+",
    description: "Cek passing grade dan daya tampung SNBP/SNBT untuk ribuan program studi di 146 PTN.",
  },
};

const jsonLdSearch = {
  "@context": "https://schema.org",
  "@type": "SearchResultsPage",
  name: "Cek Passing Grade SNBP/SNBT — MULAI+",
  description:
    "Cek passing grade, daya tampung, dan tingkat keketatan SNBP/SNBT untuk ribuan program studi di 146 PTN Indonesia.",
};

export default function PassingGradeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        id="jsonld-passing-grade-search"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSearch) }}
      />
      {children}
    </>
  );
}
