/**
 * Site-wide configuration for MULAI+.
 * Single source of truth for branding, contact, social links, and structured data.
 * Import this instead of hardcoding strings everywhere.
 */

// ─── Site Info ───────────────────────────────────────────
export const SITE = {
  name: "MULAI+",
  tagline: "Bimbingan Universitas, Jurusan & Beasiswa",
  description:
    "MULAI+ membantumu memilih universitas dan jurusan yang tepat. Program mentoring terstruktur dengan mentor berpengalaman, bimbingan beasiswa, dan persiapan PTN.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "https://mulaiplus.id",
  lang: "id",
  locale: "id_ID",
  logo: "/letter-icon-logo.svg",
  ogImage: "/og-image.jpg",
} as const;

// ─── Contact ─────────────────────────────────────────────
export const CONTACT = {
  email: "hello@mulaiplus.id",
  phone: "+62 85730367310",
  phoneDisplay: "+62 85730367310",
  location: "Jakarta, Indonesia",
} as const;

// ─── Social Media ────────────────────────────────────────
export const SOCIAL = {
  instagram: { label: "Instagram", url: "https://instagram.com/mulaiplus.id" },
  linkedin: { label: "LinkedIn", url: "https://linkedin.com/company/mulai-plus" },
  youtube: { label: "YouTube", url: "https://youtube.com/@mulaiplus" },
} as const;

export const SOCIAL_LINKS = Object.values(SOCIAL);

// ─── Navigation ──────────────────────────────────────────
export interface NavLink {
  label: string;
  href: string;
}

export const NAV_LINKS: NavLink[] = [
  { label: "About Us", href: "/#about" },
  { label: "Featured Programs", href: "/#featured-programs" },
  { label: "Meet The Mentors", href: "/#mentors" },
  { label: "FAQ", href: "/#faq" },
];

export const PROGRAM_LINKS: NavLink[] = [
  { label: "Lihat Semua Program", href: "/programs" },
  { label: "Info Beasiswa", href: "/programs" },
  { label: "Privacy Policy", href: "/privacy" },
];

// ─── FAQ (used in both component & JSON-LD) ──────────────
export interface FAQItem {
  question: string;
  answer: string;
}

export const FAQS: FAQItem[] = [
  {
    question: "Siapa aja yang bisa mendaftar MULAI+?",
    answer:
      "Program MULAI+ terbuka untuk siswa SMA/SMK/MA kelas 10–12 yang sedang mencari kejelasan arah jurusan, kampus, dan rencana masa depan. Baik kamu yang masih bingung total, sudah punya pilihan tapi belum yakin, atau ingin menyusun strategi masuk PTN dengan lebih terstruktur, MULAI+ dirancang untuk membantu proses tersebut.",
  },
  {
    question: "Apakah program ini gratis?",
    answer:
      "MULAI+ memiliki dua jenis program: Regular Mentoring (berbayar) dan Beasiswa Mentoring (melalui proses seleksi). Program beasiswa tersedia bagi siswa terpilih yang memenuhi kriteria dan lolos tahap seleksi.",
  },
  {
    question: "Bagaimana sistem seleksinya?",
    answer:
      "Untuk program beasiswa, peserta akan melalui beberapa tahap: Pengisian formulir pendaftaran, menjawab pertanyaan reflektif (non-akademik), seleksi berbasis kebutuhan dan komitmen, pengumuman peserta terpilih secara personal, dan persetujuan kontrak komitmen sederhana. Kami menilai berdasarkan komitmen, kesiapan berkembang, dan kesesuaian dengan program.",
  },
  {
    question: "Berapa lama program berlangsung?",
    answer:
      "Durasi program umumnya berlangsung selama kurang lebih 6 minggu, tergantung batch dan jenis program yang diikuti. Selama periode tersebut, peserta akan mengikuti sesi mentoring, refleksi, dan penyusunan strategi secara bertahap.",
  },
  {
    question: "Apakah program ini dilakukan online atau offline?",
    answer:
      "Seluruh sesi dalam program MULAI+ dilaksanakan secara online untuk memastikan akses yang fleksibel dan merata bagi peserta dari berbagai daerah.",
  },
];

// ─── JSON-LD Helpers ─────────────────────────────────────
export function jsonLdOrganization() {
  return {
    "@type": "EducationalOrganization",
    "@id": `${SITE.url}/#organization`,
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    logo: { "@type": "ImageObject", url: `${SITE.url}${SITE.logo}` },
    sameAs: SOCIAL_LINKS.map((s) => s.url),
    contactPoint: {
      "@type": "ContactPoint",
      email: CONTACT.email,
      contactType: "customer service",
      availableLanguage: ["Indonesian", "English"],
    },
  };
}

export function jsonLdWebsite() {
  return {
    "@type": "WebSite",
    "@id": `${SITE.url}/#website`,
    url: SITE.url,
    name: SITE.name,
    publisher: { "@id": `${SITE.url}/#organization` },
    inLanguage: SITE.lang,
    description: SITE.description,
  };
}

export function jsonLdWebpage(title?: string, description?: string) {
  return {
    "@type": "WebPage",
    "@id": `${SITE.url}/#webpage`,
    url: `${SITE.url}/`,
    name: title ?? `${SITE.name} — ${SITE.tagline}`,
    description: description ?? SITE.description,
    isPartOf: { "@id": `${SITE.url}/#website` },
    about: { "@id": `${SITE.url}/#organization` },
    inLanguage: SITE.lang,
  };
}

export function jsonLdBreadcrumb(items: { name: string; href: string }[]) {
  return {
    "@type": "BreadcrumbList",
    "@id": `${SITE.url}/#breadcrumbs`,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE.url}${item.href}`,
    })),
  };
}

export function jsonLdFAQ(faqs: FAQItem[]) {
  return {
    "@type": "FAQPage",
    "@id": `${SITE.url}/#faq`,
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
