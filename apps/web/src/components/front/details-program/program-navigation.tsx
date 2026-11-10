"use client";

import { useEffect, useState } from "react";

const navItems = [
  { label: "About", href: "#about" },
  { label: "Timeline", href: "#timeline" },
  { label: "What You Will Get", href: "#benefits" },
  { label: "Syllabus", href: "#syllabus" },
  { label: "FAQ", href: "#faq" },
];

export function ProgramNavigation() {
  const [active, setActive] = useState<string>(navItems[0].href);

  useEffect(() => {
    const sections = navItems
      .map((item) => document.querySelector(item.href))
      .filter((el): el is Element => Boolean(el));

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target.id) setActive(`#${visible.target.id}`);
      },
      { rootMargin: "-25% 0px -65% 0px" },
    );

    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Navigasi bagian program"
      className="sticky top-14 z-40 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85 md:top-16"
    >
      <ul className="no-scrollbar flex items-center gap-6 overflow-x-auto border-gray-200/70 border-b">
        {navItems.map((item) => {
          const isActive = active === item.href;
          return (
            <li key={item.label}>
              <a
                href={item.href}
                aria-current={isActive ? "true" : undefined}
                className={`inline-flex items-center whitespace-nowrap border-b-2 py-3 font-manrope font-medium text-sm transition-colors ${
                  isActive
                    ? "border-brand-orange text-brand-navy"
                    : "border-transparent text-text-main/75 hover:border-brand-navy/20 hover:text-brand-navy"
                }`}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
