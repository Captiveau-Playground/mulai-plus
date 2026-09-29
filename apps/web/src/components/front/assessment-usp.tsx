import { ArrowRight, BrainCircuit, Database, FileCheck2, Sparkles, Target, UserRound } from "lucide-react";

/**
 * USP: hasil assessment dihitung dengan AI + database MULAI+
 * (18.000+ prodi & 400+ universitas) — bukan opini acak.
 */

export function AssessmentEngineSection() {
  return (
    <section aria-label="Mesin Rekomendasi" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-bold font-manrope text-teal-600 text-xs uppercase tracking-widest">Didukung Data & AI</p>
        <h2 className="mt-3 font-bold font-bricolage text-3xl text-brand-navy tracking-tight md:text-4xl">
          Rekomendasi Bukan Opini — Ini Hasil Komputasi Data
        </h2>
        <p className="mt-4 font-manrope text-gray-500">
          Setiap jawabanmu diproses oleh mesin yang menggabungkan{" "}
          <span className="font-semibold text-gray-700">AI</span> dan{" "}
          <span className="font-semibold text-gray-700">database pendidikan MULAI+</span> — bukan saran umum.
        </p>
      </div>

      {/* Pipeline */}
      <div className="relative mx-auto mt-14 max-w-4xl">
        <div
          className="absolute top-12 right-[22%] left-[22%] hidden h-px bg-gradient-to-r from-teal-500/30 via-gray-300 to-teal-500/30 md:block"
          aria-hidden
        />

        <div className="grid gap-8 md:grid-cols-3 md:gap-6">
          {/* Input */}
          <div className="relative text-center">
            <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-700 shadow-sm">
              <UserRound className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-bold font-bricolage text-base text-gray-900">Profilmu</h3>
            <p className="mx-auto mt-1 max-w-[220px] font-manrope text-gray-500 text-xs leading-relaxed">
              Minat (Holland RIASEC) + 5 dimensi bakat dari 20 jawabanmu.
            </p>
          </div>

          {/* Engine */}
          <div className="relative rounded-2xl border border-gray-200 bg-gray-50/80 p-6 text-center">
            <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-navy text-white shadow-brand-navy/20 shadow-lg">
              <BrainCircuit className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-bold font-bricolage text-base text-gray-900">Mesin MULAI+</h3>
            <p className="mx-auto mt-1 max-w-[220px] font-manrope text-gray-500 text-xs leading-relaxed">
              AI mencocokkan profilmu dengan data program studi & universitas.
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 font-bold font-manrope text-[10px] text-teal-700 shadow-sm">
                <Database className="h-3 w-3" /> 18.000+ prodi
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 font-bold font-manrope text-[10px] text-teal-700 shadow-sm">
                <Database className="h-3 w-3" /> 400+ universitas
              </span>
            </div>
          </div>

          {/* Output */}
          <div className="relative text-center">
            <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-200 bg-white text-teal-600 shadow-sm">
              <Target className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-bold font-bricolage text-base text-gray-900">Rekomendasi</h3>
            <p className="mx-auto mt-1 max-w-[220px] font-manrope text-gray-500 text-xs leading-relaxed">
              Top 5 jurusan + karier dengan skor kecocokan, plus ringkasan AI.
            </p>
          </div>
        </div>
      </div>

      {/* Pendukung */}
      <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-3">
        {[
          { icon: Database, title: "Data PDDIKTI real", desc: "Akreditasi, jenjang, dan lokasi dari sumber resmi." },
          {
            icon: BrainCircuit,
            title: "AI merangkum profilmu",
            desc: "Ringkasan personal berbahasa Indonesia, bukan template.",
          },
          {
            icon: FileCheck2,
            title: "Skor kecocokan jelas",
            desc: "Setiap jurusan diberi persentase — transparan, bukan magic.",
          },
        ].map((c) => (
          <div key={c.title} className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600">
              <c.icon className="h-4.5 h-[18px] w-4.5 w-[18px]" />
            </div>
            <div>
              <p className="font-bold font-bricolage text-gray-900 text-sm">{c.title}</p>
              <p className="mt-0.5 font-manrope text-gray-500 text-xs leading-relaxed">{c.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Strip kompak untuk halaman detail: badge USP di bawah hero. */
export function UspStrip() {
  return (
    <div className="border-gray-100 border-y bg-gray-50/60">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 py-4 sm:px-6 lg:px-8">
        <span className="inline-flex items-center gap-2 font-manrope font-semibold text-gray-600 text-xs">
          <Database className="h-4 w-4 text-teal-600" /> Database 18.000+ prodi & 400+ universitas
        </span>
        <span className="inline-flex items-center gap-2 font-manrope font-semibold text-gray-600 text-xs">
          <BrainCircuit className="h-4 w-4 text-teal-600" /> Diproses dengan AI
        </span>
        <span className="inline-flex items-center gap-2 font-manrope font-semibold text-gray-600 text-xs">
          <Sparkles className="h-4 w-4 text-teal-600" /> Skor kecocokan & rekomendasi karier
        </span>
        <span className="inline-flex items-center gap-1.5 font-bold font-manrope text-teal-700 text-xs">
          <ArrowRight className="h-3.5 w-3.5" /> Coba sekarang
        </span>
      </div>
    </div>
  );
}
