import type { Metadata } from "next";

import { client } from "@/lib/client";

// ISR: revalidate weekly — program data rarely changes
export const revalidate = 604800;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}): Promise<Metadata> {
  const { slug, id } = await params;
  try {
    const [detail, slugs] = await Promise.all([
      client.pddikti.publicGetProgramDetail({ idSms: decodeURIComponent(id) }),
      client.pddikti.publicGetUniversitySlugs({}),
    ]);
    const prog = detail?.program;
    const uni = slugs.find((u) => u.slug === slug);

    if (!prog || !uni) {
      return { title: "Program Studi — MULAI+" };
    }

    return {
      title: `${prog.name} (${prog.level}) di ${uni.name} — Detail | MULAI+`,
      description: `Lihat informasi lengkap ${prog.name} (${prog.level}) di ${uni.name}: akreditasi, daya tampung SNBP/SNBT, passing grade, dan peminat 5 tahun terakhir.`,
      alternates: { canonical: `/explore/universities/${slug}/prodi/${id}` },
      openGraph: {
        title: `${prog.name} (${prog.level}) di ${uni.name} — MULAI+`,
        description: `Daya tampung dan passing grade ${prog.name} (${prog.level}) di ${uni.name}.`,
        type: "website",
      },
    };
  } catch {
    return { title: "Program Studi — MULAI+" };
  }
}

export default function ProdiDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
