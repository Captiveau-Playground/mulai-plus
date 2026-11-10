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
    <section id="about" className={cn("flex w-full scroll-mt-32 flex-col gap-8", className)}>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
        {/* Content */}
        <div className="flex flex-1 flex-col gap-5">
          <div className="flex flex-col gap-3">
            <p className="heading-eyebrow text-brand-orange-ink">About</p>
            {title && <h2 className="heading-section text-brand-navy">{title}</h2>}
          </div>
          {description ? (
            <div className="flex flex-col gap-4 font-manrope text-base text-text-main/75 leading-relaxed md:text-lg">
              <p>{description}</p>
            </div>
          ) : (
            <p className="font-manrope text-base text-text-muted-custom italic">Data belum tersedia</p>
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
              sizes="(max-width: 1024px) 100vw, 400px"
            />
          </div>
        )}
      </div>
    </section>
  );
}
