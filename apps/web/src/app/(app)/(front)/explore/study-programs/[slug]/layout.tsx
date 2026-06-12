import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;

  // Extract name from slug: "teknik-informatika-14" → "Teknik Informatika"
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
