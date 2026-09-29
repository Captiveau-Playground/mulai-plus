import Link from "next/link";

interface LegalSection {
  id: string;
  title: string;
  content: string[];
  extra?: React.ReactNode;
}

export function LegalPageShell({
  sections,
  icon,
  label,
  title,
  description,
  updatedDate,
  intro,
}: {
  sections: LegalSection[];
  icon: React.ReactNode;
  label: string;
  title: string;
  description: string;
  updatedDate: string;
  intro: string;
}) {
  return (
    <div className="mt-10 flex w-full flex-col">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-gray-100 border-b bg-gradient-to-b from-brand-navy/[0.02] via-white to-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="pointer-events-none absolute top-0 left-1/4 h-72 w-72 -translate-x-1/2 -translate-y-1/3 rounded-full bg-brand-navy/[0.03] blur-[120px]" />
        <div className="pointer-events-none absolute right-0 bottom-0 h-48 w-48 rounded-full bg-brand-orange/[0.04] blur-[100px]" />

        <div className="relative mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-navy/10 bg-brand-navy/5 px-4 py-1.5">
              {icon}
              <span className="font-manrope font-semibold text-[11px] text-brand-navy/60 uppercase tracking-wider">
                {label}
              </span>
            </div>

            <h1 className="font-bold font-bricolage text-4xl text-brand-navy leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              {title}
            </h1>

            <p className="mx-auto mt-4 max-w-2xl font-manrope text-base text-text-muted-custom leading-relaxed sm:text-lg">
              {description}
            </p>

            <div className="mt-6 flex items-center justify-center gap-2 font-manrope text-text-muted-custom/60 text-xs">
              <span className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 shadow-sm">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                  />
                </svg>
                Diperbarui {updatedDate}
              </span>
              <span className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 shadow-sm">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
                {sections.length} bagian
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Content ── */}
      <section className="bg-white px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">
            {/* ═══ Sidebar (TOC) ═══ */}
            <aside className="hidden w-full shrink-0 lg:block lg:w-64 xl:w-72">
              <div className="sticky top-24 space-y-1">
                <p className="mb-3 font-manrope font-semibold text-[10px] text-text-muted-custom/50 uppercase tracking-wider">
                  Daftar Isi
                </p>
                <nav className="space-y-0.5">
                  {sections.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="block rounded-lg px-3 py-1.5 font-manrope text-text-muted-custom text-xs transition-colors hover:bg-brand-navy/5 hover:text-brand-navy"
                    >
                      {section.title}
                    </a>
                  ))}
                </nav>

                <div className="mt-6 border-gray-100 border-t pt-6">
                  {label === "Privacy" ? (
                    <Link
                      href={"/terms" as any}
                      className="flex items-center gap-2 rounded-lg bg-brand-navy/5 px-3 py-2 font-manrope font-medium text-brand-navy text-xs transition-colors hover:bg-brand-navy/10"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                      Lihat Syarat & Ketentuan
                    </Link>
                  ) : (
                    <Link
                      href={"/privacy" as any}
                      className="flex items-center gap-2 rounded-lg bg-brand-navy/5 px-3 py-2 font-manrope font-medium text-brand-navy text-xs transition-colors hover:bg-brand-navy/10"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                      Lihat Kebijakan Privasi
                    </Link>
                  )}
                </div>
              </div>
            </aside>

            {/* ═══ Main Content ═══ */}
            <div className="min-w-0 flex-1">
              {/* Intro */}
              <div className="mb-10 rounded-2xl border border-gray-100 bg-gradient-to-br from-brand-navy/[0.02] to-white p-6 shadow-sm sm:p-8">
                <p className="font-manrope text-base text-text-main/85 leading-relaxed">{intro}</p>
              </div>

              {/* Sections */}
              <div className="space-y-10">
                {sections.map((section, index) => (
                  <section key={section.id} id={section.id} className="scroll-mt-24">
                    <div className="flex items-start gap-4">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-orange/10 font-bold font-bricolage text-brand-orange text-sm">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="font-bricolage font-semibold text-brand-navy text-xl">{section.title}</h2>
                        <div className="mt-3 space-y-3">
                          {section.content.map((paragraph, i) => (
                            <p key={i} className="font-manrope text-base text-text-main/80 leading-relaxed">
                              {paragraph}
                            </p>
                          ))}
                          {section.extra}
                        </div>
                      </div>
                    </div>
                  </section>
                ))}
              </div>

              {/* Outro */}
              <div className="mt-14 rounded-2xl border border-brand-navy/10 bg-gradient-to-br from-brand-navy/[0.03] to-brand-orange/[0.02] p-6 text-center shadow-sm sm:p-8">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-navy/10">
                  <svg
                    className="h-6 w-6 text-brand-navy"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                    />
                  </svg>
                </div>
                <h3 className="font-bricolage font-semibold text-brand-navy text-lg">Ada pertanyaan?</h3>
                <p className="mt-2 font-manrope text-sm text-text-muted-custom">
                  Hubungi tim kami kapan saja — kami siap membantu.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
