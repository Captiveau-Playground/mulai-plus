import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: {
    canonical: "/blog",
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
