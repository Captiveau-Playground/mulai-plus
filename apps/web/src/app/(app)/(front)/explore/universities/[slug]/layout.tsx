import type { Metadata } from "next";
import { getUniversityBySlug } from "@/lib/pddikti/server";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const uni = await getUniversityBySlug(slug);

  if (!uni) {
    return { title: "Universitas tidak ditemukan — MULAI+" };
  }

  return {
    title: `${uni.name} — Detail Universitas | MULAI+`,
    description: `Lihat informasi lengkap ${uni.name}, termasuk program studi, akreditasi, biaya kuliah, dan statistik mahasiswa.`,
    alternates: { canonical: `/explore/universities/${slug}` },
    openGraph: {
      title: `${uni.name} — Detail Universitas | MULAI+`,
      description: `Informasi lengkap ${uni.name}, program studi, akreditasi, dan passing grade.`,
      type: "website",
    },
  };
}

export default function UniDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
