import { ChevronDown } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export interface SyllabusItem {
  week: number;
  title: string;
  outcome: string | null;
}

interface ProgramSyllabusProps {
  title?: string;
  description?: string;
  items?: SyllabusItem[];
  className?: string;
}

export function ProgramSyllabus({ title = "SYLLABUS", description, items = [], className }: ProgramSyllabusProps) {
  return (
    <section id="syllabus" className={cn("flex w-full scroll-mt-32 flex-col gap-8", className)}>
      <div className="flex flex-col gap-3">
        <p className="heading-eyebrow text-brand-orange-ink">{title}</p>
        {description && <h2 className="heading-section text-brand-navy">{description}</h2>}
      </div>

      {items.length > 0 ? (
        <Accordion className="flex flex-col gap-3">
          {items.map((item, index) => (
            <AccordionItem
              key={index}
              value={`week-${item.week}-${index}`}
              className="rounded-2xl bg-white px-5 py-2 shadow-xs ring-1 ring-gray-200 transition-shadow data-open:ring-brand-orange/40"
            >
              <AccordionTrigger
                headerClassName="heading-card min-w-0 flex-1"
                className="cursor-pointer items-center gap-4 py-4 hover:no-underline [&>[data-slot=accordion-trigger-icon]]:hidden"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1 text-left">
                  <span className="heading-eyebrow text-brand-navy/70">Week {item.week}</span>
                  <span className="heading-card text-brand-navy">{item.title}</span>
                </span>
                <span className="flex size-8 shrink-0 rotate-0 items-center justify-center rounded-full bg-bg-light text-text-muted-custom transition-transform duration-200 group-aria-expanded/accordion-trigger:rotate-180">
                  <ChevronDown className="size-4" />
                </span>
              </AccordionTrigger>
              <AccordionContent className="pt-1 pb-4 font-manrope text-base text-text-main/75 leading-relaxed">
                {item.outcome ?? "Materi akan diumumkan."}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <p className="font-manrope text-base text-text-muted-custom italic">Data belum tersedia</p>
      )}
    </section>
  );
}
