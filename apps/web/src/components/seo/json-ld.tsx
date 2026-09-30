/** Render structured data (JSON-LD) — server component, aman & tanpa JS. */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export const SITE = {
  name: "MULAI+",
  url: "https://mulaiplus.id",
  logo: "https://mulaiplus.id/light-type-logo.svg",
};

/** Organization + WebSite — sinyal brand global. */
export const organizationSchema = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE.url}/#organization`,
    name: SITE.name,
    url: SITE.url,
    logo: SITE.logo,
    sameAs: ["https://www.instagram.com/mulaiplus.id"],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE.url}/#website`,
    url: SITE.url,
    name: SITE.name,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE.url}/explore/study-programs?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  },
];

/** Breadcrumb generik — posisi terakhir adalah halaman aktif. */
export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: it.url })),
  };
}
