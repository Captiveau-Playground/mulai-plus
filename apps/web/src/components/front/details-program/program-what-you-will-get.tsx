import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BenefitItem {
  title: string;
}

interface ProgramWhatYouWillGetProps {
  title?: string;
  description?: string;
  items?: BenefitItem[];
  className?: string;
}

export function ProgramWhatYouWillGet({
  title = "WHAT YOU WILL GET",
  description,
  items = [],
  className,
}: ProgramWhatYouWillGetProps) {
  return (
    <section id="benefits" className={cn("flex w-full flex-col gap-9 py-8 sm:px-4 md:px-0", className)}>
      <div className="flex flex-col gap-9">
        <div className="flex flex-col gap-2">
          <h2 className="font-inter font-semibold text-2xl text-[#FE9114] leading-[1.2] tracking-[0.15em]">{title}</h2>
          {description && (
            <h3 className="font-bold font-bricolage text-3xl text-[#1A1F6D] leading-none md:text-4xl lg:text-5xl">
              {description}
            </h3>
          )}
        </div>
        <div className="flex flex-col gap-4">
          {items.length > 0 ? (
            items.map((item, index) => (
              <div key={index} className="flex items-center gap-6">
                <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-[#E0E0E9]">
                  <Check className="h-6 w-6 text-white" strokeWidth={3} />
                </div>
                <p className="font-inter font-normal text-[#333333] text-lg leading-[1.2] md:text-2xl">{item.title}</p>
              </div>
            ))
          ) : (
            <p className="font-inter font-normal text-base text-muted-foreground italic">Data belum tersedia</p>
          )}
        </div>
      </div>
    </section>
  );
}
