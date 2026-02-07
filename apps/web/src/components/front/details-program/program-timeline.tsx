import { cn } from "@/lib/utils";

export interface TimelineItem {
  title: string;
  description: string;
}

interface ProgramTimelineProps {
  title?: string;
  description?: string;
  items?: TimelineItem[];
  className?: string;
}

export function ProgramTimeline({ title = "TIMELINE", description, items = [], className }: ProgramTimelineProps) {
  return (
    <section id="timeline" className={cn("flex w-full flex-col gap-9 py-8 sm:px-4 md:px-0", className)}>
      <div className="flex flex-col gap-9">
        <div className="flex flex-col gap-2">
          <h2 className="font-inter font-semibold text-2xl text-[#FE9114] leading-[1.2] tracking-[0.15em]">{title}</h2>
          {description && (
            <h3 className="font-bold font-bricolage text-3xl text-[#1A1F6D] leading-none md:text-4xl lg:text-5xl">
              {description}
            </h3>
          )}
        </div>
        <div className="flex flex-col gap-6">
          {items.length > 0 ? (
            items.map((item, index) => (
              <div key={index} className="flex flex-col gap-2">
                <h4 className="font-inter font-semibold text-[#708FFF] text-base leading-[1.2] tracking-[-0.05em]">
                  {item.title}
                </h4>
                <p className="font-inter font-normal text-[#888888] text-base leading-[1.2]">{item.description}</p>
              </div>
            ))
          ) : (
            <p className="font-inter font-normal text-[#888888] text-base italic">Data belum tersedia</p>
          )}
        </div>
      </div>
    </section>
  );
}
