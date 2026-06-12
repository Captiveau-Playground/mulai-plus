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

export default function UniversitiesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
