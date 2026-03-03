"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="w-full bg-white py-16 lg:pt-16 lg:pb-[108px]" id="cta">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-0">
        <div className="relative flex h-[500px] w-full flex-col justify-center overflow-hidden rounded-none bg-[#F93447] px-8 py-12 md:h-[600px] md:rounded-[48px] md:px-4 lg:h-[700px] lg:justify-start lg:py-32">
          {/* Background Image */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/cta.png" // Placeholder - ideally this is a specific BG image
              alt="CTA Background"
              fill
              className="object-cover object-center opacity-50 mix-blend-overlay"
            />
          </div>

          {/* Gradient Overlay */}
          <div
            className="absolute inset-0 z-10"
            style={{
              background:
                "linear-gradient(to left, rgba(254, 145, 20, 0) 22%, rgba(251, 99, 46, 0.57) 50%, #F93447 76%)",
            }}
          />

          {/* Content */}
          <div className="relative z-20 flex max-w-4xl flex-col gap-12 lg:ml-16">
            <h2 className="font-bold font-bricolage text-4xl text-white leading-tight md:text-6xl lg:text-[96px]">
              Siap Mulai Langkah Pertamamu?
            </h2>

            <Link href="/programs">
              <Button
                size="lg"
                className="h-auto rounded-full bg-white px-8 py-4 text-xl hover:bg-gray-100 md:px-12 md:py-6 md:text-2xl lg:text-4xl"
              >
                <span className="bg-linear-to-r from-[#F93447] to-[#FE9114] bg-clip-text font-inter font-semibold text-transparent">
                  Daftar Mentoring Scholarship
                </span>
              </Button>
            </Link>
          </div>

          {/* Decorative Elements (Sketch) - Simplified representation */}
          <div className="absolute bottom-0 left-0 z-0 hidden lg:block">
            {/* Can add SVGs here later if assets are provided */}
          </div>
        </div>
      </div>
    </section>
  );
}
