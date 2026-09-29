import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Program Mentoring - MULAI+",
  description:
    "Temukan program mentoring MULAI+ untuk membantu kamu memilih universitas dan jurusan yang tepat. Program mentoring terstruktur dengan mentor berpengalaman.",
  alternates: {
    canonical: "/programs",
  },
  openGraph: {
    title: "Program Mentoring - MULAI+",
    description:
      "Temukan program mentoring MULAI+ untuk membantu kamu memilih universitas dan jurusan yang tepat. Program mentoring terstruktur dengan mentor berpengalaman.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Program Mentoring - MULAI+",
    description: "Temukan program mentoring MULAI+ untuk membantu kamu memilih universitas dan jurusan yang tepat.",
  },
};

export default function ProgramsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
