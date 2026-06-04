import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Artikel Bimbingan Universitas & Jurusan — MULAI+",
  description:
    "Baca artikel terbaru seputar bimbingan universitas, tips memilih jurusan, persiapan SNBP/SNBT, dan beasiswa kuliah dari MULAI+.",
  alternates: {
    canonical: "/blog/articles",
  },
  openGraph: {
    title: "Artikel Bimbingan Universitas & Jurusan — MULAI+",
    description:
      "Baca artikel terbaru seputar bimbingan universitas, tips memilih jurusan, persiapan SNBP/SNBT, dan beasiswa kuliah dari MULAI+.",
  },
};

export default function BlogArticlesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
