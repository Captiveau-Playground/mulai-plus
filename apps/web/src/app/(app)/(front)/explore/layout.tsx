import type { Metadata } from "next";

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

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
