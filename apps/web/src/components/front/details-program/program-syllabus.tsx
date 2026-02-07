import { ChevronDown } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface SyllabusItem {
  week: string;
  title: string;
  description: string;
}

interface ProgramSyllabusProps {
  title?: string;
  description?: string;
  items?: SyllabusItem[];
  className?: string;
}

export function ProgramSyllabus({
  title = "SYLLABUS",
  description = "Lorem ipsum dolor sit amet consectetur.",
  items = [
    {
      week: "WEEK 1",
      title: "Ruang Aman & Kontrak Beasiswa Mentoring",
      description:
        "Lorem ipsum dolor sit amet consectetur. Magna vulputate interdum semper enim mattis non. Sed mi fringilla sed dolor nisl vulputate tristique consequat scelerisque.",
    },
    {
      week: "WEEK 1",
      title: "Mengenal Diri",
      description:
        "Lorem ipsum dolor sit amet consectetur. Magna vulputate interdum semper enim mattis non. Sed mi fringilla sed dolor nisl vulputate tristique consequat scelerisque.",
    },
    {
      week: "WEEK 2",
      title: "Dunia Kuliah Nyata",
      description:
        "Lorem ipsum dolor sit amet consectetur. Magna vulputate interdum semper enim mattis non. Sed mi fringilla sed dolor nisl vulputate tristique consequat scelerisque.",
    },
    {
      week: "WEEK 3",
      title: "Arah Akademik & Jurusan",
      description:
        "Lorem ipsum dolor sit amet consectetur. Magna vulputate interdum semper enim mattis non. Sed mi fringilla sed dolor nisl vulputate tristique consequat scelerisque.",
    },
    {
      week: "WEEK 4",
      title: "Jalur Masuk Perguruan Tinggi",
      description:
        "Lorem ipsum dolor sit amet consectetur. Magna vulputate interdum semper enim mattis non. Sed mi fringilla sed dolor nisl vulputate tristique consequat scelerisque.",
    },
    {
      week: "WEEK 5",
      title: "Kesadaran Dalam Pengambilan Keputusan",
      description:
        "Lorem ipsum dolor sit amet consectetur. Magna vulputate interdum semper enim mattis non. Sed mi fringilla sed dolor nisl vulputate tristique consequat scelerisque.",
    },
    {
      week: "WEEK 6",
      title: "Refleksi & Rencana Lanjutan",
      description:
        "Lorem ipsum dolor sit amet consectetur. Magna vulputate interdum semper enim mattis non. Sed mi fringilla sed dolor nisl vulputate tristique consequat scelerisque.",
    },
  ],
  className,
}: ProgramSyllabusProps) {
  return (
    <section id="syllabus" className={cn("flex w-full flex-col gap-9 py-8 sm:px-4 md:px-0", className)}>
      <div className="flex flex-col gap-9">
        <div className="flex flex-col gap-2">
          <h2 className="font-inter font-semibold text-2xl text-[#FE9114] leading-[1.2] tracking-[0.15em]">{title}</h2>
          <h3 className="font-bold font-bricolage text-3xl text-[#1A1F6D] leading-none md:text-4xl lg:text-5xl">
            {description}
          </h3>
        </div>

        <Accordion className="flex flex-col gap-4">
          {items.map((item, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="rounded-lg border-none bg-white px-6 py-2 shadow-sm ring-1 ring-[#E7E7E7] data-[state=open]:ring-[#FE9114]"
            >
              <AccordionTrigger className="hover:no-underline [&>svg]:hidden">
                <div className="flex w-full items-center justify-between gap-4 text-left">
                  <div className="flex flex-col gap-1">
                    <span className="font-inter font-semibold text-[#99B8FF] text-sm uppercase tracking-[0.15em] md:text-base">
                      {item.week}
                    </span>
                    <span className="font-inter font-semibold text-[#1A1F6D] text-lg leading-[1.2] md:text-2xl">
                      {item.title}
                    </span>
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F6F6F6] transition-transform duration-200 group-data-[state=open]/accordion-trigger:rotate-180">
                    <ChevronDown className="h-5 w-5 text-[#B0B0B0]" />
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <p className="pt-2 font-inter font-normal text-[#888888] text-base leading-normal">
                  {item.description}
                </p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
