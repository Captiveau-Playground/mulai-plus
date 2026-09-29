import type { Metadata } from "next";

import { client } from "@/lib/client";

// ISR: revalidate weekly — university data rarely changes
export const revalidate = 604800;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const slugs = await client.pddikti.publicGetUniversitySlugs({});
    const uni = slugs.find((u) => u.slug === slug);

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
  } catch {
    return { title: "Universitas tidak ditemukan — MULAI+" };
  }
}

export default function UniDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
