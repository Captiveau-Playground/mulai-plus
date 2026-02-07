import { cn } from "@/lib/utils";

interface TimelineItem {
  title: string;
  description: string;
}

interface ProgramTimelineProps {
  title?: string;
  description?: string;
  items?: TimelineItem[];
  className?: string;
}

export function ProgramTimeline({
  title = "TIMELINE",
  description = "Lorem ipsum dolor sit amet consectetur.",
  items = [
    {
      title: "Registration — 20 Feb 2026",
      description:
        "Lorem ipsum dolor sit amet consectetur. Sapien sit tortor fringilla magna eu vel urna felis leo. Vitae eget egestas id platea dignissim ipsum lacus aliquet. Amet orci metus a aliquam risus. Maecenas luctus ut massa tellus donec. Dolor id pulvinar gravida quis sed nibh amet. Lorem odio dui at ac pulvinar amet sed.",
    },
    {
      title: "Verification — 27 Feb 2026",
      description:
        "Lorem ipsum dolor sit amet consectetur. Sapien sit tortor fringilla magna eu vel urna felis leo. Vitae eget egestas id platea dignissim ipsum lacus aliquet. Amet orci metus a aliquam risus. Maecenas luctus ut massa tellus donec. Dolor id pulvinar gravida quis sed nibh amet. Lorem odio dui at ac pulvinar amet sed.",
    },
    {
      title: "Assessment — 06 Mar 2026",
      description:
        "Lorem ipsum dolor sit amet consectetur. Sapien sit tortor fringilla magna eu vel urna felis leo. Vitae eget egestas id platea dignissim ipsum lacus aliquet. Amet orci metus a aliquam risus. Maecenas luctus ut massa tellus donec. Dolor id pulvinar gravida quis sed nibh amet. Lorem odio dui at ac pulvinar amet sed.",
    },
    {
      title: "Announcement — 15 Mar 2026",
      description:
        "Lorem ipsum dolor sit amet consectetur. Sapien sit tortor fringilla magna eu vel urna felis leo. Vitae eget egestas id platea dignissim ipsum lacus aliquet. Amet orci metus a aliquam risus. Maecenas luctus ut massa tellus donec. Dolor id pulvinar gravida quis sed nibh amet. Lorem odio dui at ac pulvinar amet sed.",
    },
    {
      title: "Onboarding — 30 Mar 2026",
      description:
        "Lorem ipsum dolor sit amet consectetur. Sapien sit tortor fringilla magna eu vel urna felis leo. Vitae eget egestas id platea dignissim ipsum lacus aliquet. Amet orci metus a aliquam risus. Maecenas luctus ut massa tellus donec. Dolor id pulvinar gravida quis sed nibh amet. Lorem odio dui at ac pulvinar amet sed.",
    },
    {
      title: "Graduation — 08 Mei 2026",
      description:
        "Lorem ipsum dolor sit amet consectetur. Sapien sit tortor fringilla magna eu vel urna felis leo. Vitae eget egestas id platea dignissim ipsum lacus aliquet. Amet orci metus a aliquam risus. Maecenas luctus ut massa tellus donec. Dolor id pulvinar gravida quis sed nibh amet. Lorem odio dui at ac pulvinar amet sed.",
    },
  ],
  className,
}: ProgramTimelineProps) {
  return (
    <section id="timeline" className={cn("flex w-full flex-col gap-9 py-8 sm:px-4 md:px-0", className)}>
      <div className="flex flex-col gap-9">
        <div className="flex flex-col gap-2">
          <h2 className="font-inter font-semibold text-2xl text-[#FE9114] leading-[1.2] tracking-[0.15em]">{title}</h2>
          <h3 className="font-bold font-bricolage text-3xl text-[#1A1F6D] leading-none md:text-4xl lg:text-5xl">
            {description}
          </h3>
        </div>
        <div className="flex flex-col gap-6">
          {items.map((item, index) => (
            <div key={index} className="flex flex-col gap-2">
              <h4 className="font-inter font-semibold text-[#708FFF] text-base leading-[1.2] tracking-[-0.05em]">
                {item.title}
              </h4>
              <p className="font-inter font-normal text-[#888888] text-base leading-[1.2]">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
