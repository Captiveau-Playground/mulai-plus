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
    <section id="benefits" className={cn("flex w-full scroll-mt-32 flex-col gap-8", className)}>
      <div className="flex flex-col gap-3">
        <p className="heading-eyebrow text-brand-orange-ink">{title}</p>
        {description && <h2 className="heading-section text-brand-navy">{description}</h2>}
      </div>

      {items.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {items.map((item, index) => (
            <li key={index} className="flex items-center gap-4 rounded-xl bg-bg-light px-4 py-3">
              <span className="flex size-9 flex-none items-center justify-center rounded-full bg-brand-navy/10 text-brand-navy">
                <Check className="size-4" strokeWidth={3} />
              </span>
              <p className="font-manrope font-medium text-base text-text-main md:text-lg">{item.title}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-manrope text-base text-text-muted-custom italic">Data belum tersedia</p>
      )}
    </section>
  );
}
