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

export default function StudyProgramsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
