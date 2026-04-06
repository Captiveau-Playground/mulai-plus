import Image from "next/image";
import { cn } from "@/lib/utils";

interface ProgramAboutProps {
  title?: string;
  description?: string;
  image?: string | null;
  className?: string;
}

export function ProgramAbout({ title, description, image, className }: ProgramAboutProps) {
  return (
    <section id="about" className={cn("flex w-full flex-col gap-8 py-8 sm:px-4 md:px-0", className)}>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
        {/* Content */}
        <div className="flex flex-1 flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="font-inter font-semibold text-2xl text-[#FE9114] leading-[1.2] tracking-[0.15em]">ABOUT</h2>
            {title && (
              <h3 className="font-bold font-bricolage text-3xl text-[#1A1F6D] leading-none md:text-4xl lg:text-5xl">
                {title}
              </h3>
            )}
          </div>
          {description ? (
            <div className="flex flex-col gap-4 font-inter font-normal text-[#888888] text-base leading-relaxed md:text-lg">
              <p>{description}</p>
            </div>
          ) : (
            <p className="font-inter font-normal text-[#888888] text-base italic">Data belum tersedia</p>
          )}
        </div>

        {/* Image - Only render if image is provided */}
        {image && (
          <div className="relative aspect-video w-full flex-1 overflow-hidden rounded-2xl lg:aspect-square lg:max-w-[400px]">
            <Image
              src={image}
              alt={title || "Program Image"}
              fill
              className="object-cover transition-transform duration-500 hover:scale-105"
            />
          </div>
        )}
      </div>
    </section>
  );
}
