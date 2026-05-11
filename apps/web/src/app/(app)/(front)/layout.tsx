import { Footer } from "@/components/front/footer";
import { Navbar } from "@/components/front/navbar";

export default function FrontLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
