import { ChevronDown } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export interface FAQItem {
  question: string;
  answer: string;
}

interface ProgramFAQProps {
  title?: string;
  description?: string;
  items?: FAQItem[];
  className?: string;
}

export function ProgramFAQ({ title = "FAQ", description, items = [], className }: ProgramFAQProps) {
  return (
    <section id="faq" className={cn("flex w-full scroll-mt-32 flex-col gap-8", className)}>
      <div className="flex flex-col gap-3">
        <p className="heading-eyebrow text-brand-orange-ink">{title}</p>
        {description && <h2 className="heading-section text-brand-navy">{description}</h2>}
      </div>

      {items.length > 0 ? (
        <Accordion className="flex flex-col gap-3">
          {items.map((item, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="rounded-2xl bg-white px-5 py-2 shadow-xs ring-1 ring-gray-200 transition-shadow data-open:ring-brand-orange/40"
            >
              <AccordionTrigger
                headerClassName="heading-card min-w-0 flex-1"
                className="cursor-pointer items-center gap-4 py-4 hover:no-underline [&>[data-slot=accordion-trigger-icon]]:hidden"
              >
                <span className="heading-card flex-1 text-left text-brand-navy">{item.question}</span>
                <span className="flex size-8 shrink-0 rotate-0 items-center justify-center rounded-full bg-bg-light text-text-muted-custom transition-transform duration-200 group-aria-expanded/accordion-trigger:rotate-180">
                  <ChevronDown className="size-4" />
                </span>
              </AccordionTrigger>
              <AccordionContent className="pt-1 pb-4 font-manrope text-base text-text-main/75 leading-relaxed">
                {item.answer}
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
