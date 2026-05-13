"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FAQS as FAQS_CONFIG } from "@/lib/site-config";

const FAQS = FAQS_CONFIG.map((faq, i) => ({ id: `item-${i + 1}`, ...faq }));

export function FAQSection({ type = "front" }: { type?: "front" | "back" }) {
  return (
    <motion.section
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
      }}
      className={`w-full bg-white py-16 ${type === "front" ? "lg:py-24" : "lg:py-8"}`}
      id="faq"
    >
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-0">
        {type === "front" ? (
          <div
            className={`flex w-full flex-col ${type === "front" ? "lg:flex-row" : ""} gap-12 lg:justify-between lg:gap-9`}
          >
            {/* Left Column: Header Content */}
            <motion.div
              variants={{
                hidden: { opacity: 0, x: -30 },
                show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const } },
              }}
              className="flex flex-col gap-9 lg:w-[40%] lg:max-w-179.5"
            >
              <div className="flex flex-col gap-4">
                <span className="font-inter font-semibold text-2xl text-[#FE9114] tracking-[0.25em]">FAQ</span>
                <h2 className="font-bold font-bricolage text-4xl text-[#1A1F6D] leading-tight md:text-5xl lg:text-[64px]">
                  Hal Yang Paling Sering Ditanyain
                </h2>
              </div>
              <p className="font-inter text-[#888888] text-lg leading-relaxed tracking-tight lg:text-2xl">
                Kami tahu, sebelum memulai sesuatu yang baru pasti ada banyak pertanyaan muncul di kepala. Karena itu,
                kami rangkum berbagai hal penting seputar program MULAI+ bisa ambil keputusan dengan tenang dan percaya
                diri.
              </p>
            </motion.div>

            {/* Right Column: Accordion List */}
            <motion.div
              variants={{
                hidden: { opacity: 0, x: 30 },
                show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const } },
              }}
              className="w-full lg:w-[60%] lg:max-w-214.5"
            >
              <Accordion className="flex flex-col gap-6">
                {FAQS.map((faq, i) => (
                  <motion.div
                    key={faq.id}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      show: {
                        opacity: 1,
                        y: 0,
                        transition: { duration: 0.5, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] as const },
                      },
                    }}
                  >
                    <AccordionItem value={faq.id} className="rounded-xl border-none bg-[#1A1F6D] px-6 py-6 shadow-sm">
                      <AccordionTrigger className="flex cursor-pointer items-center justify-between gap-6 py-0 transition-none hover:no-underline [&>svg]:hidden">
                        <span className="min-w-0 flex-1 text-left font-inter font-semibold text-lg text-white leading-snug tracking-[-0.05em] lg:text-2xl">
                          {faq.question}
                        </span>
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F93447] transition-transform duration-200 group-aria-expanded/accordion-trigger:rotate-180">
                          <ChevronDown className="h-5 w-5 text-white" strokeWidth={3} />
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-6 font-inter text-[#B9E1FE] text-base leading-relaxed">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  </motion.div>
                ))}
              </Accordion>
            </motion.div>
          </div>
        ) : (
          <div className={"flex w-full flex-col gap-12 lg:flex-col lg:justify-between lg:gap-9"}>
            {/* Left Column: Header Content */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 30 },
                show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const } },
              }}
              className="flex flex-col gap-9 lg:w-full"
            >
              <div className="flex flex-col gap-4">
                <span className="font-inter font-semibold text-2xl text-[#FE9114] tracking-[0.25em]">FAQ</span>
                <h2 className="font-bold font-bricolage text-4xl text-[#1A1F6D] leading-tight md:text-5xl lg:text-[64px]">
                  Hal Yang Paling Sering Ditanyain
                </h2>
              </div>
              <p className="font-inter text-[#888888] text-lg leading-relaxed tracking-tight lg:text-2xl">
                Kami tahu, sebelum memulai sesuatu yang baru pasti ada banyak pertanyaan muncul di kepala. Karena itu,
                kami rangkum berbagai hal penting seputar program MULAI+ bisa ambil keputusan dengan tenang dan percaya
                diri.
              </p>
            </motion.div>

            {/* Right Column: Accordion List */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 30 },
                show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const } },
              }}
              className="w-full lg:w-full"
            >
              <Accordion className="flex flex-col gap-6">
                {FAQS.map((faq, i) => (
                  <motion.div
                    key={faq.id}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      show: {
                        opacity: 1,
                        y: 0,
                        transition: { duration: 0.5, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] as const },
                      },
                    }}
                  >
                    <AccordionItem value={faq.id} className="rounded-xl border-none bg-[#1A1F6D] px-6 py-6 shadow-sm">
                      <AccordionTrigger className="flex cursor-pointer items-center justify-between gap-6 py-0 transition-none hover:no-underline [&>svg]:hidden">
                        <span className="min-w-0 flex-1 text-left font-inter font-semibold text-lg text-white leading-snug tracking-[-0.05em] lg:text-2xl">
                          {faq.question}
                        </span>
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F93447] transition-transform duration-200 group-aria-expanded/accordion-trigger:rotate-180">
                          <ChevronDown className="h-5 w-5 text-white" strokeWidth={3} />
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-6 font-inter text-[#B9E1FE] text-base leading-relaxed">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  </motion.div>
                ))}
              </Accordion>
            </motion.div>
          </div>
        )}
      </div>
    </motion.section>
  );
}
