import { cn } from "@/lib/utils";

interface ProgramAboutProps {
  title?: string;
  description?: string;
  className?: string;
}

export function ProgramAbout({ title, description, className }: ProgramAboutProps) {
  return (
    <section id="about" className={cn("flex w-full flex-col gap-9 py-8 sm:px-4 md:px-0", className)}>
      <div className="flex flex-col gap-9">
        <div className="flex flex-col gap-2">
          <h2 className="font-inter font-semibold text-2xl text-[#FE9114] leading-[1.2] tracking-[0.15em]">ABOUT</h2>
          {title && (
            <h3 className="font-bold font-bricolage text-3xl text-[#1A1F6D] leading-none md:text-4xl lg:text-5xl">
              {title}
            </h3>
          )}
        </div>
        {description ? (
          <p className="font-inter font-normal text-[#888888] text-base leading-[1.2] md:text-lg">{description}</p>
        ) : (
          <p className="font-inter font-normal text-base text-muted-foreground italic">Data belum tersedia</p>
        )}
      </div>
    </section>
  );
}
