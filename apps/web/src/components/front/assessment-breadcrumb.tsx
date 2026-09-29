import Link from "next/link";

export function AssessmentBreadcrumb({
  trail,
  current,
}: {
  trail: { label: string; href: string }[];
  current: string;
}) {
  const items = [{ label: "Home", href: "/" }, ...trail];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.label,
      item: `https://mulaiplus.id${it.href}`,
    })),
  };

  return (
    <div className="border-b bg-white pt-16 sm:pt-20">
      <div className="mx-auto max-w-7xl px-4 py-3">
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD breadcrumb (static) */}
        <script
          id="jsonld-breadcrumb"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 font-manrope text-text-muted-custom text-xs">
          {items.map((it, i) => (
            <span key={it.label} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden>/</span>}
              <Link href={it.href as any} className="transition-colors hover:text-brand-navy">
                {it.label}
              </Link>
            </span>
          ))}
          <span aria-hidden>/</span>
          <span aria-current="page" className="text-text-main">
            {current}
          </span>
        </nav>
      </div>
    </div>
  );
}
