"use client";

interface HeaderDetailsProgramProps {
  title?: string;
  batch?: string;
  startDate?: string;
}

/**
 * Hero ringkas halaman detail program: banner navy + grid halus (pola sama dengan
 * /programs), tanpa foto besar — hemat ruang vertikal (~340–400px vs 700px+).
 */
export function HeaderDetailsProgram({
  title = "Mentoring Scholarship Program 2026",
  batch = "BATCH 1",
  startDate = "28 MARET 2026",
}: HeaderDetailsProgramProps) {
  return (
    <section className="relative mt-14 w-full overflow-hidden bg-brand-navy md:mt-16">
      {/* Latar: gradient brand + grid halus + glow oranye */}
      <div className="absolute inset-0 bg-linear-to-br from-brand-navy via-brand-navy to-brand-navy-light" />
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(to right, #ffffff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="absolute -top-24 -right-16 size-72 rounded-full bg-brand-orange/15 blur-3xl" />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-10 sm:px-6 md:py-12 lg:gap-6 lg:px-8 lg:py-14">
        <p className="heading-eyebrow text-brand-orange">Welcome to</p>
        <h1 className="heading-display max-w-3xl text-white">{title}</h1>

        <div className="mt-1 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-brand-orange px-4 py-1.5 font-bold font-manrope text-brand-navy text-sm">
            {batch}
          </span>
          <span className="font-manrope font-medium text-sm text-white/75">{startDate}</span>
        </div>
      </div>
    </section>
  );
}
