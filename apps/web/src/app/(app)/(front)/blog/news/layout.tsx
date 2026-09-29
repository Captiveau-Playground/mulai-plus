import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Berita & Info Pendidikan Terbaru — MULAI+",
  description:
    "Ikuti berita dan informasi terbaru seputar dunia pendidikan, beasiswa, SNBP/SNBT, dan perkembangan universitas di Indonesia.",
  alternates: {
    canonical: "/blog/news",
  },
  openGraph: {
    title: "Berita & Info Pendidikan Terbaru — MULAI+",
    description:
      "Ikuti berita dan informasi terbaru seputar dunia pendidikan, beasiswa, SNBP/SNBT, dan perkembangan universitas di Indonesia.",
  },
};

export default function BlogNewsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
