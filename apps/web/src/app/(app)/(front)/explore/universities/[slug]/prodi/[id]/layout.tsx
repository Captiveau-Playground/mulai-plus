import type { Metadata } from "next";
import { getProgramById, getUniversityBySlug } from "@/lib/pddikti/server";

// ISR: revalidate weekly — program data rarely changes
export const revalidate = 604800;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}): Promise<Metadata> {
  const { slug, id } = await params;
  const [prog, uni] = await Promise.all([getProgramById(decodeURIComponent(id)), getUniversityBySlug(slug)]);

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
}

export default function ProdiDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
