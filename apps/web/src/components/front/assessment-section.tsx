import { ArrowRight, BrainCircuit, CheckCircle2, Compass, Database, Sparkles, Target, TrendingUp } from "lucide-react";
import Link from "next/link";

export function AssessmentSection() {
  return (
    <section aria-label="Test Minat Bakat" className="relative w-full bg-white py-14 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-navy to-brand-navy-light p-8 md:p-12">
          {/* deco */}
          <div
            className="pointer-events-none absolute -top-24 -right-20 h-72 w-72 rounded-full bg-teal-500/10 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-brand-orange/10 blur-3xl"
            aria-hidden
          />

          <div className="relative grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            {/* Copy */}
            <div className="text-white">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span className="font-manrope font-medium text-white/80 text-xs">Fitur Baru · Gratis · ±10 Menit</span>
              </div>

              <h2 className="mt-4 font-bold font-bricolage text-3xl leading-tight md:text-4xl">
                Belum Yakin Mau Kuliah Apa?
                <span className="mt-1 block bg-gradient-to-r from-teal-300 to-teal-400 bg-clip-text text-transparent">
                  Kenali Minat &amp; Bakatmu Sekarang
                </span>
              </h2>

              <p className="mt-4 max-w-lg font-manrope text-sm text-white/70 leading-relaxed md:text-base">
                20 soal untuk menemukan jurusan yang benar-benar cocok — dicocokkan dengan{" "}
                <span className="font-semibold text-white">18.000+ prodi</span> dan{" "}
                <span className="font-semibold text-white">AI</span>, bukan tebakan.
              </p>

              <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
                {[
                  { icon: Compass, text: "Tes Minat — Holland RIASEC" },
                  { icon: TrendingUp, text: "Tes Bakat — 5 kemampuan" },
                  { icon: BrainCircuit, text: "AI + data 18k prodi" },
                  { icon: CheckCircle2, text: "Hasil instan + laporan PDF" },
                ].map((b) => (
                  <li key={b.text} className="flex items-center gap-2.5 font-manrope text-sm text-white/80">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10">
                      <b.icon className="h-3.5 w-3.5 text-teal-300" />
                    </span>
                    {b.text}
                  </li>
                ))}
              </ul>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/assessment"
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 font-bold font-bricolage text-brand-navy text-sm shadow-lg transition-all hover:bg-amber-50 active:scale-[0.98]"
                >
                  Coba Sekarang
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/assessment/minat"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-6 py-3.5 font-bold font-bricolage text-sm text-white transition-all hover:bg-white/10 active:scale-[0.98]"
                >
                  Pelajari Tes Minat
                </Link>
              </div>
            </div>

            {/* Visual — pipeline kompak */}
            <div className="mx-auto w-full max-w-md lg:max-w-none">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                {/* 2 test */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <Compass className="h-5 w-5 text-teal-300" />
                    <p className="mt-2 font-bold font-bricolage text-sm text-white">Tes Minat</p>
                    <p className="font-manrope text-[10px] text-white/50">Holland · 10 soal</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <TrendingUp className="h-5 w-5 text-teal-300" />
                    <p className="mt-2 font-bold font-bricolage text-sm text-white">Tes Bakat</p>
                    <p className="font-manrope text-[10px] text-white/50">5 kemampuan · 10 soal</p>
                  </div>
                </div>

                {/* engine */}
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/20">
                    <BrainCircuit className="h-4.5 h-[18px] w-4.5 w-[18px] text-teal-300" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold font-manrope text-white text-xs">Mesin MULAI+</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 font-manrope font-semibold text-[9px] text-white/70">
                        <Database className="h-2.5 w-2.5" /> 18.000+ prodi
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 font-manrope font-semibold text-[9px] text-white/70">
                        <BrainCircuit className="h-2.5 w-2.5" /> AI summary
                      </span>
                    </div>
                  </div>
                </div>

                {/* result */}
                <div className="mt-3 space-y-2">
                  {[
                    { label: "Kedokteran", pct: 92 },
                    { label: "Teknik Informatika", pct: 85 },
                    { label: "Psikologi", pct: 78 },
                  ].map((m) => (
                    <div key={m.label}>
                      <div className="flex justify-between font-manrope text-[11px]">
                        <span className="font-semibold text-white/80">{m.label}</span>
                        <span className="font-bold text-teal-300">{m.pct}%</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-500"
                          style={{ width: `${m.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <p className="mt-3 text-center font-manrope text-[11px] text-white/50">
                <Target className="mr-1 inline h-3 w-3" />
                Rekomendasi dari data nyata, bukan opini
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
