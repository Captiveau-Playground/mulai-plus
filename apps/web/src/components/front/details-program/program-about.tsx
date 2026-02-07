import { cn } from "@/lib/utils";

interface ProgramAboutProps {
  title?: string;
  description?: string;
  className?: string;
}

export function ProgramAbout({
  title = "Lorem ipsum dolor sit amet consectetur.",
  description = "Lorem ipsum dolor sit amet consectetur. Duis lorem scelerisque id mattis fames. Vulputate ullamcorper iaculis donec blandit facilisi sapien id morbi. Est ultrices sollicitudin viverra tempor rutrum auctor. Pharetra eu molestie sagittis varius lectus in sit. Integer lorem est nibh viverra porttitor cras massa dictum. Purus imperdiet elit urna venenatis sollicitudin at sit. Condimentum eleifend praesent ac suscipit augue in quam. Nibh at nisl imperdiet cras sed duis vestibulum viverra. Nulla vestibulum egestas ullamcorper sagittis faucibus. Et pellentesque ut habitant lorem eu. Nullam nisi tellus placerat euismod. At commodo ac tempus sit eu quam. Neque ut a lectus amet integer eget libero tempus. Egestas felis pellentesque amet vulputate faucibus velit.",
  className,
}: ProgramAboutProps) {
  return (
    <section id="about" className={cn("flex w-full flex-col gap-9 py-8 sm:px-4 md:px-0", className)}>
      <div className="flex flex-col gap-9">
        <div className="flex flex-col gap-2">
          <h2 className="font-inter font-semibold text-2xl text-[#FE9114] leading-[1.2] tracking-[0.15em]">ABOUT</h2>
          <h3 className="font-bold font-bricolage text-3xl text-[#1A1F6D] leading-none md:text-4xl lg:text-5xl">
            {title}
          </h3>
        </div>
        <p className="font-inter font-normal text-[#888888] text-base leading-[1.2] md:text-lg">{description}</p>
      </div>
    </section>
  );
}
