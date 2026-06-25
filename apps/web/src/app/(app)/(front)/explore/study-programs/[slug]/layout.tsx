import type { Metadata } from "next";
import { client } from "@/lib/client";

// ISR: revalidate every hour
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;

  // Fetch real program data from API for accurate metadata
  try {
    const program = await (client as any).pddikti.publicGetProgramBySlug({ input: { slug } });
    if (program?.name) {
      return {
        title: `${program.name} — Cari Universitas & Passing Grade | MULAI+`,
        description: `Cari tahu universitas mana saja yang menawarkan ${program.name} (${program.level || "S1"}). Lihat passing grade, daya tampung SNBP/SNBT, dan akreditasi program studi.`,
        alternates: { canonical: `/explore/study-programs/${slug}` },
        openGraph: {
          title: `${program.name} — Cari Universitas & Passing Grade | MULAI+`,
          description: `Cari universitas dengan program studi ${program.name}. Data lengkap passing grade ${program.level || ""}.`,
          type: "website",
        },
      };
    }
  } catch {
    console.error(`[study-programs] Failed to fetch data for slug: ${slug}`);
  }

  // Fallback: derive name from slug
  const lastDash = slug.lastIndexOf("-");
  const namePart = lastDash > 0 ? slug.substring(0, lastDash) : slug;
  const programName = namePart
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return {
    title: `${programName} — Cari Universitas & Passing Grade | MULAI+`,
    description: `Cari tahu universitas mana saja yang menawarkan ${programName}. Lihat passing grade, daya tampung SNBP/SNBT, dan akreditasi program studi.`,
    alternates: { canonical: `/explore/study-programs/${slug}` },
    openGraph: {
      title: `${programName} — Cari Universitas & Passing Grade | MULAI+`,
      description: `Cari universitas dengan program studi ${programName}. Data lengkap passing grade.`,
      type: "website",
    },
  };
}

export default function StudyProgramSlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
