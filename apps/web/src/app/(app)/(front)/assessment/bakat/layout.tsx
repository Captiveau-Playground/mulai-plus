import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Tes Bakat | MULAI+",
  description: "Ukur kemampuan numerik, verbal, logika, spasial & ketelitian.",
};

export default function SegLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
