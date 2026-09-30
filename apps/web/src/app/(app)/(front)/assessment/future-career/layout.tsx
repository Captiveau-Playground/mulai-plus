import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Karir Impian — Peta Masa Depan | MULAI+",
  description: "Temukan peta karier & jurusan menuju karir impianmu.",
};

export default function SegLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
