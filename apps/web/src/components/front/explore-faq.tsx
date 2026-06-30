"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface FAQItem {
  question: string;
  answer: string;
}

export function ExploreFAQ({ items, title = "Pertanyaan Umum" }: { items: FAQItem[]; title?: string }) {
  if (!items.length) return null;

  // JSON-LD schema for FAQ
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <script id="jsonld-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="py-8 sm:py-12">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-6 font-bold font-bricolage text-brand-navy text-lg">{title}</h2>
          <Accordion className="space-y-2">
            {items.map((item, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="rounded-xl border border-gray-200 px-5 transition-all data-[state=open]:border-brand-navy/20 data-[state=open]:bg-brand-navy/[0.02]"
              >
                <AccordionTrigger className="py-4 font-manrope font-medium text-sm text-text-main hover:text-brand-navy [&>svg]:text-brand-navy">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="pb-4 font-manrope text-sm text-text-muted-custom leading-relaxed">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </>
  );
}

// ─── Preset FAQs ──────────────────────────────────────────────

export function getUniversityFAQs(name: string, type?: string, province?: string): FAQItem[] {
  return [
    {
      question: `Apa saja program studi di ${name}?`,
      answer: `${name} menawarkan berbagai program studi dari berbagai jenjang mulai dari D3, S1, S2, hingga S3. Kamu bisa lihat daftar lengkapnya di tabel program studi di halaman ini.`,
    },
    ...(type
      ? [
          {
            question: `Apakah ${name} termasuk ${type}?`,
            answer: `Ya, ${name} adalah perguruan tinggi ${type.toLowerCase()} yang terdaftar resmi di PDDikti. Informasi lebih lengkap bisa dicek di halaman ini.`,
          },
        ]
      : []),
    ...(province
      ? [
          {
            question: `Dimana lokasi ${name}?`,
            answer: `${name} berlokasi di ${province}. Informasi alamat lengkap dan peta bisa dilihat di halaman detail universitas.`,
          },
        ]
      : []),
    {
      question: `Berapa akreditasi ${name}?`,
      answer: `Informasi akreditasi ${name} bisa dicek langsung di tabel statistik halaman ini. Akreditasi menunjukkan kualitas institusi dan diupdate secara berkala oleh BAN-PT.`,
    },
    {
      question: `Apa saja jalur masuk ke ${name}?`,
      answer:
        "Umumnya jalur masuk perguruan tinggi meliputi SNBP (rapor), SNBT (tes), dan jalur mandiri. Cek passing grade dan daya tampung di halaman passing grade untuk referensi.",
    },
  ];
}

export function getProgramFAQs(name: string): FAQItem[] {
  return [
    {
      question: `Apa itu ${name}?`,
      answer: `${name} adalah salah satu program studi yang ditawarkan oleh berbagai perguruan tinggi di Indonesia. Program ini tersedia di beberapa jenjang pendidikan.`,
    },
    {
      question: `Berapa passing grade ${name}?`,
      answer: `Passing grade ${name} bervariasi tergantung universitas dan tahun pendaftaran. Cek data passing grade SNBP/SNBT 5 tahun terakhir di halaman passing grade.`,
    },
    {
      question: `Prospek kerja lulusan ${name}?`,
      answer: `Lulusan ${name} memiliki prospek karir yang luas di berbagai bidang. Peluang kerja tergantung pada universitas, skill yang dimiliki, dan perkembangan industri terkait.`,
    },
    {
      question: `Universitas mana saja yang ada ${name}?`,
      answer: `Kamu bisa lihat daftar lengkap universitas yang membuka ${name} di halaman ini. Tersedia juga informasi akreditasi dan perbandingan antar universitas.`,
    },
  ];
}
