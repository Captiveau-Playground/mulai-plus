import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bandingkan Universitas & Program Studi — MULAI+",
  description:
    "Bandingkan universitas, program studi, akreditasi, dan data passing grade secara side-by-side. Temukan pilihan terbaik untuk masa depanmu.",
  alternates: {
    canonical: "/explore/compare",
  },
  openGraph: {
    title: "Bandingkan Universitas & Program Studi — MULAI+",
    description: "Bandingkan universitas, program studi, akreditasi, dan data passing grade secara side-by-side.",
    type: "website",
  },
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
