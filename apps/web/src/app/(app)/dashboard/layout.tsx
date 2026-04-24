import type { Metadata } from "next";

import { Bricolage_Grotesque, Geist, Geist_Mono, Manrope } from "next/font/google";

import "../../../style/globals-app.css";
import { env } from "@mulai-plus/env/web";
import Providers from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bricolageGrotesque = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mulai Plus",
  description: "Mulai Plus Apps",
  robots:
    env.NEXT_PUBLIC_SERVER_URL === "https://api.staging.mulaiplus.id" ? { index: false, follow: false } : undefined,
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mulai Plus",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Mulai Plus",
    title: "Mulai Plus",
    description: "Mulai Plus Apps",
  },
  twitter: {
    card: "summary",
    title: "Mulai Plus",
    description: "Mulai Plus Apps",
  },
  icons: {
    icon: "/favicon.ico",
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${bricolageGrotesque.variable} ${manrope.variable} scroll-smooth antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
