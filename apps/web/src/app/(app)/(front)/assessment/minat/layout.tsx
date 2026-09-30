import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Tes Minat (Holland RIASEC) | MULAI+",
  description: "Tes minat berdasarkan teori Holland untuk jurusan & karier yang sesuai.",
};

export default function SegLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
