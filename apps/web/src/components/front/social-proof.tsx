"use client";

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
    logo: "/partners/spotify.svg",
  },
  {
    name: "Amazon",
    width: 140,
    height: 42,
    logo: "/partners/amazon.svg",
  },
  {
    name: "Adobe",
    width: 130,
    height: 38,
    logo: "/partners/adobe.svg",
  },
];

export function SocialProof() {
  return (
    <section className="w-full bg-white py-12 md:py-16 lg:py-20">
      <div className="container mx-auto px-6 md:px-16">
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8 opacity-60 grayscale md:justify-between md:gap-x-16 lg:gap-x-24">
          {PARTNERS.map((partner) => (
            <div
              key={partner.name}
              className="flex items-center justify-center"
              style={{ width: partner.width, height: partner.height }}
            >
              <span className="font-bold font-bricolage text-2xl text-[#B0B0B0] sm:text-3xl">{partner.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
