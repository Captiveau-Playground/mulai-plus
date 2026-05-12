import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Program Mentoring - MULAI+",
  description:
    "Temukan program mentoring MULAI+ untuk membantu kamu memilih universitas dan jurusan yang tepat. Daftar sekarang!",
  openGraph: {
    title: "Program Mentoring - MULAI+",
    description:
      "Temukan program mentoring MULAI+ untuk membantu kamu memilih universitas dan jurusan yang tepat. Daftar sekarang!",
  },
};

export default function ProgramsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
