"use client";

import { ChevronDown } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FAQS = [
  {
    id: "item-1",
    question: "Siapa aja yang bisa mendaftar MULAI+?",
    answer:
      "Program MULAI+ terbuka untuk siswa SMA/SMK/MA kelas 10–12 yang sedang mencari kejelasan arah jurusan, kampus, dan rencana masa depan. Baik kamu yang masih bingung total, sudah punya pilihan tapi belum yakin, atau ingin menyusun strategi masuk PTN dengan lebih terstruktur, MULAI+ dirancang untuk membantu proses tersebut.",
  },
  {
    id: "item-2",
    question: "Apakah program ini gratis?",
    answer:
      "MULAI+ memiliki dua jenis program Regular Mentoring (berbayar) ⁠Beasiswa Mentoring (melalui proses seleksi) Program beasiswa tersedia bagi siswa terpilih yang memenuhi kriteria dan lolos tahap seleksi.",
  },
  {
    id: "item-3",
    question: "Bagaimana sistem seleksinya?",
    answer:
      "Untuk program beasiswa, peserta akan melalui beberapa tahap berikut Pengisian formulir pendaftaran ⁠Menjawab pertanyaan reflektif (non-akademik) ⁠Seleksi berbasis kebutuhan dan komitmen ⁠Pengumuman peserta terpilih secara personal Persetujuan kontrak komitmen sederhana Kami menilai berdasarkan komitmen, kesiapan berkembang, dan kesesuaian dengan program.",
  },
  {
    id: "item-4",
    question: "Berapa lama program berlangsung?",
    answer:
      "Durasi program umumnya berlangsung selama kurang lebih 6 minggu, tergantung batch dan jenis program yang diikuti.Selama periode tersebut, peserta akan mengikuti sesi mentoring, refleksi, dan penyusunan strategi secara bertahap.",
  },
  {
    id: "item-5",
    question: "Apakah program ini dilakukan online atau offline?",
    answer:
      "Seluruh sesi dalam program MULAI+ dilaksanakan secara online untuk memastikan akses yang fleksibel dan merata bagi peserta dari berbagai daerah..",
  },
];

export function FAQSection({ type = "front" }: { type?: "front" | "back" }) {
  return (
    <section className={`w-full bg-white py-16 ${type === "front" ? "lg:py-24" : "lg:py-16"}`}>
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-0">
        {type === "front" ? (
          <div
            className={`flex w-full flex-col ${type === "front" ? "lg:flex-row" : ""} gap-12 lg:justify-between lg:gap-9`}
          >
            {/* Left Column: Header Content */}
            <div className="flex flex-col gap-9 lg:w-[40%] lg:max-w-[718px]">
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
            </div>

            {/* Right Column: Accordion List */}
            <div className="w-full lg:w-[60%] lg:max-w-[858px]">
              <Accordion className="flex flex-col gap-6">
                {FAQS.map((faq) => (
                  <AccordionItem
                    key={faq.id}
                    value={faq.id}
                    className="rounded-[8px] border-none bg-[#1A1F6D] px-6 py-6 shadow-sm"
                  >
                    <AccordionTrigger className="flex items-center justify-between gap-6 py-0 transition-none hover:no-underline [&>svg]:hidden">
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
                ))}
              </Accordion>
            </div>
          </div>
        ) : (
          <div className={"flex w-full flex-col gap-12 lg:flex-col lg:justify-between lg:gap-9"}>
            {/* Left Column: Header Content */}
            <div className="flex flex-col gap-9 lg:w-full">
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
            </div>

            {/* Right Column: Accordion List */}
            <div className="w-full lg:w-full">
              <Accordion className="flex flex-col gap-6">
                {FAQS.map((faq) => (
                  <AccordionItem
                    key={faq.id}
                    value={faq.id}
                    className="rounded-[8px] border-none bg-[#1A1F6D] px-6 py-6 shadow-sm"
                  >
                    <AccordionTrigger className="flex items-center justify-between gap-6 py-0 transition-none hover:no-underline [&>svg]:hidden">
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
                ))}
              </Accordion>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
