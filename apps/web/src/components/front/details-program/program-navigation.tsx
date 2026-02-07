"use client";

import Link from "next/link";

const navItems = [
  { label: "About", href: "#about" },
  { label: "Timeline", href: "#timeline" },
  { label: "What You Will Get", href: "#benefits" },
  { label: "Syllabus", href: "#syllabus" },
  { label: "Meet The Mentors", href: "#mentors" },
  { label: "FAQ", href: "#faq" },
];

export function ProgramNavigation() {
  return (
    <div className="sticky top-[8vh] z-40 w-full bg-white transition-all">
      <div className="mx-auto flex h-[108px] max-w-7xl items-center justify-center">
        <div className="no-scrollbar flex w-full items-center justify-between gap-8 overflow-x-auto">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href as any}
              className="whitespace-nowrap font-inter font-normal text-[#333333] text-base transition-colors hover:text-[#1A1F6D]"
              onClick={(e) => {
                e.preventDefault();
                const element = document.querySelector(item.href);
                if (element) {
                  element.scrollIntoView({ behavior: "smooth" });
                }
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
