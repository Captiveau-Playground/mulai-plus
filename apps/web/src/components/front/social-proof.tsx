"use client";
import Image from "next/image";

const PARTNERS = [
  {
    name: "Google",
    width: 128,
    height: 42,
    // Using a placeholder for now as assets are missing
    logo: "/partners/google.svg",
  },
  {
    name: "Microsoft",
    width: 192,
    height: 42,
    logo: "/partners/microsoft.svg",
  },
  {
    name: "Spotify",
    width: 160,
    height: 48,
    logo: "/partners/meta.svg",
  },
  {
    name: "Amazon",
    width: 140,
    height: 42,
    logo: "/partners/discord.svg",
  },
  {
    name: "Adobe",
    width: 130,
    height: 38,
    logo: "/partners/tokopedia.svg",
  },
];

export function SocialProof() {
  return (
    <section className="w-full bg-white py-12 md:py-16 lg:py-20">
      <div className="container mx-auto max-w-7xl px-4 md:px-6 lg:px-0">
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8 opacity-60 grayscale md:gap-x-16 lg:justify-between lg:gap-x-24">
          {PARTNERS.map((partner) => (
            <Image
              key={partner.name}
              src={partner.logo}
              alt={partner.name}
              width={partner.width}
              height={partner.height}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
