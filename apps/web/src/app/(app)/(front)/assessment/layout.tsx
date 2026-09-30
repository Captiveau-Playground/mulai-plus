import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Tes Minat & Bakat Online | MULAI+",
  description: "Kenali minat bakat dan jurusan cocok — Tes Minat Bakat (RIASEC) + Tes Bakat gratis.",
};

export default function SegLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
