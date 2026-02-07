"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FAQS = [
  {
    id: "item-1",
    question: "Apakah program ini cocok untuk pemula?",
    answer:
      "Ya, program kami dirancang untuk mengakomodasi berbagai tingkat kemampuan, mulai dari pemula hingga tingkat lanjut. Mentor kami akan membimbing Anda sesuai dengan kecepatan belajar Anda.",
  },
  {
    id: "item-2",
    question: "Bagaimana sistem mentoring berjalan?",
    answer:
      "Mentoring dilakukan secara online melalui sesi video call mingguan, diskusi grup, dan review tugas personal. Anda akan mendapatkan feedback langsung dari mentor profesional.",
  },
  {
    id: "item-3",
    question: "Apakah saya mendapatkan sertifikat?",
    answer:
      "Tentu saja! Setelah menyelesaikan seluruh rangkaian program dan tugas akhir, Anda akan mendapatkan sertifikat penyelesaian yang dapat digunakan untuk portofolio karir atau aplikasi universitas.",
  },
  {
    id: "item-4",
    question: "Bagaimana jika saya berhalangan hadir di sesi mentoring?",
    answer:
      "Setiap sesi mentoring akan direkam sehingga Anda dapat menonton ulang kapan saja. Namun, kami sangat menyarankan untuk hadir secara langsung agar bisa berinteraksi dengan mentor.",
  },
  {
    id: "item-5",
    question: "Apakah ada jaminan diterima di universitas tujuan?",
    answer:
      "Kami tidak memberikan jaminan penerimaan karena keputusan akhir ada di tangan universitas. Namun, kami memaksimalkan peluang Anda melalui persiapan dokumen, essay, dan strategi pendaftaran yang matang.",
  },
];

export function FAQSection() {
  return (
    <section className="w-full bg-[#F5F7FA] py-16 lg:py-24">
      <div className="container mx-auto px-6 md:px-16">
        <div className="flex flex-col gap-12 lg:flex-row lg:gap-16">
          {/* Header Section */}
          <div className="flex flex-col gap-4 lg:w-1/3">
            <span className="font-inter font-semibold text-[#FE9114] text-sm tracking-widest md:text-base">FAQ</span>
            <h2 className="font-bold font-bricolage text-3xl text-[#1A1F6D] leading-tight md:text-4xl lg:text-5xl">
              Pertanyaan yang Sering Diajukan
            </h2>
            <p className="font-inter text-[#888888] text-lg">
              Masih ragu atau punya pertanyaan lain? Temukan jawabannya di sini atau hubungi tim support kami.
            </p>
          </div>

          {/* Accordion Section */}
          <div className="w-full lg:w-2/3">
            <Accordion className="flex flex-col gap-4">
              {FAQS.map((faq) => (
                <AccordionItem
                  key={faq.id}
                  value={faq.id}
                  className="rounded-2xl border-none bg-white px-6 py-2 shadow-sm transition-all data-[state=open]:shadow-md"
                >
                  <AccordionTrigger className="font-bold font-bricolage text-[#1A1F6D] text-lg hover:no-underline md:text-xl">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="font-inter text-[#555555] text-base leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
}
