import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog — Bimbingan Universitas & Beasiswa",
  description:
    "Baca artikel dan berita terbaru seputar bimbingan universitas, tips memilih jurusan, persiapan SNBP/SNBT, dan beasiswa kuliah dari MULAI+.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: "Blog — Bimbingan Universitas & Beasiswa | MULAI+",
    description:
      "Baca artikel dan berita terbaru seputar bimbingan universitas, tips memilih jurusan, persiapan SNBP/SNBT, dan beasiswa kuliah dari MULAI+.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog — Bimbingan Universitas & Beasiswa | MULAI+",
    description:
      "Baca artikel dan berita terbaru seputar bimbingan universitas, tips memilih jurusan, persiapan SNBP/SNBT, dan beasiswa kuliah dari MULAI+.",
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
