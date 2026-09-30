"use client";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock,
  Compass,
  FlaskConical,
  Palette,
  Target,
  TrendingUp,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { CountUp, Reveal, StaggerGroup, StaggerItem } from "@/components/front/assessment-anim";
import { AssessmentBreadcrumb } from "@/components/front/assessment-breadcrumb";
import { AssessmentFaq, AssessmentPricingSection } from "@/components/front/assessment-shared";
import { UspStrip } from "@/components/front/assessment-usp";
import { trackEvent } from "@/lib/analytics";
import { buildUtmUrl } from "@/lib/utm";

const RIASEC = [
  {
    code: "R",
    name: "Realistic",
    icon: Wrench,
    desc: "Nyaman dengan kerja praktis, alat, dan aktivitas lapangan.",
    careers: "Teknik Mesin · Pertanian · Arsitektur",
  },
  {
    code: "I",
    name: "Investigative",
    icon: FlaskConical,
    desc: "Analitis, suka riset, dan memecahkan masalah.",
    careers: "Kedokteran · Matematika · Farmasi",
  },
  {
    code: "A",
    name: "Artistic",
    icon: Palette,
    desc: "Kreatif, ekspresif, dan bebas berimajinasi.",
    careers: "DKV · Sastra · Arsitektur",
  },
  {
    code: "S",
    name: "Social",
    icon: Users,
    desc: "Senang membantu, mengajar, dan berinteraksi.",
    careers: "Psikologi · Keperawatan · Keguruan",
  },
  {
    code: "E",
    name: "Enterprising",
    icon: TrendingUp,
    desc: "Pemimpin, persuasif, dan berjiwa bisnis.",
    careers: "Manajemen · Marketing · Hukum",
  },
  {
    code: "C",
    name: "Conventional",
    icon: ClipboardList,
    desc: "Teratur, teliti, dan nyaman dengan data.",
    careers: "Akuntansi · Statistik · Administrasi",
  },
];

const KEY_FACTS = [
  { icon: Compass, valueNum: 6, suffix: " tipe", prefix: "", label: "kepribadian karier (Holland)" },
  { icon: FlaskConical, valueNum: 10, suffix: " soal", prefix: "", label: "pilihan aktivitas" },
  { icon: Clock, valueNum: 7, suffix: " menit", prefix: "±", label: "waktu pengerjaan" },
  { icon: Target, valueNum: 3, suffix: " huruf", prefix: "Kode ", label: "gambaran minat utamamu" },
];

export default function AssessmentMinatPage() {
  return (
    <div className="overflow-hidden bg-white">
      <AssessmentBreadcrumb
        trail={[{ label: "Test Minat Bakat", href: "/assessment" }]}
        current="Tes Minat (Holland)"
      />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-32 right-[-8%] h-96 w-96 rounded-full bg-violet-500/[0.07]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 pt-12 pb-14 sm:px-6 md:pt-16 md:pb-20 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/5 px-3 py-1">
                <Compass className="h-3.5 w-3.5 text-violet-600" />
                <span className="font-manrope font-medium text-violet-700 text-xs">Tes Minat · Holland RIASEC</span>
              </div>
              <h1 className="mt-5 font-bold font-bricolage text-4xl text-brand-navy leading-[1.05] tracking-tight md:text-5xl">
                Di Mana Kamu Paling{" "}
                <span className="relative">
                  <span className="relative z-10">Nyaman Bekerja?</span>
                  <span className="absolute inset-x-0 bottom-1 z-0 h-3 rounded-sm bg-violet-500/20" aria-hidden />
                </span>
              </h1>
              <p className="mt-5 max-w-lg font-manrope text-base text-gray-500 leading-relaxed md:text-lg">
                Tes Minat memetakan kecenderunganmu ke 6 tipe kepribadian karier (John Holland) — dari sana kami temukan
                jurusan yang paling selaras dengan cara kamu bekerja dan berpikir.
              </p>
              <Link
                href="/login?callbackUrl=%2Fdashboard%2Fstudent%2Fassessment"
                onClick={() => trackEvent("assessment_cta_click", { type: "minat" })}
                className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-brand-navy px-7 py-4 font-bold font-bricolage text-base text-white shadow-brand-navy/15 shadow-lg transition-all hover:bg-brand-navy-light active:scale-[0.98]"
              >
                Mulai Tes Minat <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Reveal>

            {/* key facts */}
            <StaggerGroup className="grid grid-cols-2 gap-4">
              {KEY_FACTS.map((f) => (
                <StaggerItem key={f.label} className="rounded-2xl border border-gray-100 bg-gray-50/60 p-5">
                  <f.icon className="h-5 w-5 text-violet-600" />
                  <p className="mt-3 font-bold font-bricolage text-brand-navy text-xl">
                    {f.prefix}
                    <CountUp value={f.valueNum} suffix={f.suffix} />
                  </p>
                  <p className="mt-0.5 font-manrope text-gray-500 text-xs">{f.label}</p>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        </div>
      </section>

      {/* USP */}
      <UspStrip />

      {/* 6 TIPE */}
      <section className="border-gray-100 border-t">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="font-bold font-manrope text-violet-600 text-xs uppercase tracking-widest">Model Holland</p>
            <h2 className="mt-3 font-bold font-bricolage text-3xl text-brand-navy tracking-tight md:text-4xl">
              6 Tipe Minat
            </h2>
            <p className="mt-4 font-manrope text-gray-500">
              Setiap orang punya kombinasi unik — hasilnya berupa{" "}
              <span className="font-semibold text-gray-700">kode 3 huruf</span> (misal IAC) yang merepresentasikan
              dominasi minatmu.
            </p>
          </Reveal>

          <StaggerGroup className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {RIASEC.map((r) => (
              <StaggerItem
                key={r.code}
                className="group rounded-2xl border border-gray-100 bg-white p-6 transition-all hover:-translate-y-1 hover:border-violet-500/30 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 transition-colors group-hover:bg-violet-500 group-hover:text-white">
                    <r.icon className="h-5 w-5" />
                  </div>
                  <span className="font-bold font-bricolage text-2xl text-gray-200 transition-colors group-hover:text-violet-500/40">
                    {r.code}
                  </span>
                </div>
                <h3 className="mt-4 font-bold font-bricolage text-gray-900 text-lg">{r.name}</h3>
                <p className="mt-1 font-manrope text-gray-500 text-sm leading-relaxed">{r.desc}</p>
                <p className="mt-4 border-gray-50 border-t pt-3 font-manrope text-gray-400 text-xs">
                  <span className="font-semibold text-gray-500">Contoh jurusan:</span> {r.careers}
                </p>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* CONTOH SOAL */}
      <section className="border-gray-100 border-y bg-gray-50/60">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <p className="font-bold font-manrope text-violet-600 text-xs uppercase tracking-widest">
                Seperti Apa Soalnya?
              </p>
              <h2 className="mt-3 font-bold font-bricolage text-3xl text-brand-navy tracking-tight">
                Pilih yang Lebih Menarik Bagimu
              </h2>
              <p className="mt-4 font-manrope text-gray-500">
                Cepat, intuitif, dan tanpa jawaban benar atau salah. Cukup pilih aktivitas yang paling kamu sukai.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Tidak ada jawaban benar/salah — jawab sesuai dirimu",
                  "Tanpa timer, bisa diubah sebelum lanjut",
                  "10 soal, selesai ±7 menit",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 font-manrope text-gray-600 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" /> {t}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={0.15} className="mx-auto w-full max-w-md">
              <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-brand-navy/5 shadow-xl">
                <p className="font-manrope font-semibold text-violet-600 text-xs uppercase tracking-wide">
                  Contoh Soal
                </p>
                <p className="mt-2 font-bold font-bricolage text-gray-900 text-lg">Kamu lebih suka…</p>
                <div className="mt-4 space-y-2.5">
                  <div className="flex items-center gap-3 rounded-xl border border-gray-200 p-3.5 transition-colors hover:border-violet-500/50">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                      <FlaskConical className="h-4 w-4" />
                    </span>
                    <span className="font-manrope text-gray-700 text-sm">
                      Meneliti dan menganalisis data eksperimen
                    </span>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border-2 border-violet-500 bg-violet-500/5 p-3.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500 text-white">
                      <Palette className="h-4 w-4" />
                    </span>
                    <span className="font-manrope font-medium text-gray-800 text-sm">
                      Membuat karya seni, desain, atau tulisan kreatif
                    </span>
                  </div>
                </div>
                <div className="mt-4 rounded-xl bg-violet-500/5 p-4">
                  <p className="font-manrope text-violet-700 text-xs leading-relaxed">
                    <span className="font-bold">Memilih "data dan eksperimen"</span> → skor{" "}
                    <span className="font-bold">Investigative (I)</span> naik. Setelah 10 soal, tiga skor tertinggi
                    membentuk kode minatmu.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Registrasi + FAQ */}
      <AssessmentPricingSection theme="violet" />
      <AssessmentFaq
        theme="violet"
        items={[
          {
            q: "Apa itu Tes Minat Holland RIASEC?",
            a: "Tes yang memetakan kecenderungan minatmu ke 6 tipe kepribadian karier (Realistic, Investigative, Artistic, Social, Enterprising, Conventional) berdasarkan teori John Holland. Hasilnya berupa kode 3 huruf yang menggambarkan kombinasi minat utamamu.",
          },
          {
            q: "Berapa lama tesnya?",
            a: "Sekitar 7 menit untuk 10 soal pilihan aktivitas. Tidak ada timer — kamu bisa santai menjawab.",
          },
          {
            q: "Apakah ada jawaban benar atau salah?",
            a: "Tidak ada. Kamu hanya memilih aktivitas yang paling kamu sukai antara dua pilihan. Jawab sesuai dirimu, bukan yang kamu pikir 'seharusnya'.",
          },
          {
            q: "Bagaimana hasil tes ini digunakan?",
            a: "Kode minatmu digabung dengan hasil Tes Bakat untuk merekomendasikan jurusan dan karier yang cocok — dicocokkan dengan 18.000+ program studi di Indonesia.",
          },
          {
            q: "Apakah tesnya gratis?",
            a: "Ya, sepenuhnya gratis untuk individu. Kamu bisa ikut kapan saja setelah login.",
          },
        ]}
      />

      {/* CTA */}
      <section className="border-gray-100 border-t bg-white">
        <Reveal className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-navy via-[#2a31a4] to-brand-navy-light px-6 py-12 text-center shadow-2xl shadow-brand-navy/20 sm:px-12 md:py-16">
            <div className="pointer-events-none absolute -top-24 left-1/4 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl" aria-hidden />
            <div className="pointer-events-none absolute -right-16 -bottom-24 h-64 w-64 rounded-full bg-brand-orange/15 blur-3xl" aria-hidden />
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.06]"
              style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)", backgroundSize: "22px 22px" }}
              aria-hidden
            />

            <div className="relative">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 font-manrope text-[11px] font-semibold tracking-wide text-teal-300">
                🔍 Tes Minat (Holland) — tipe karirmu ada di sini
              </span>

              <h2 className="mx-auto mt-5 max-w-2xl font-bold font-bricolage text-3xl text-white leading-tight md:text-4xl">
                Tipe Minatmu Menentukan Arah Kampus. Tebak, Kode Kamu yang Mana?
              </h2>
              <p className="mx-auto mt-3 max-w-md font-manrope text-sm text-white/70 leading-relaxed">Dari 6 tipe minat (Holland), kombinasi 3 huruf teratas kamu yang menentukan — apakah jurusanmu selama ini benar-benar sejalan.</p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                                    <span key="R"
                      className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 font-bold font-manrope text-[11px] text-white/85"
                      style={{ animation: `chip-pop 0.4s ease both ${0.15 + 0 * 0.08}s` }}
                    >
                      R
                    </span>
                    <span key="I"
                      className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 font-bold font-manrope text-[11px] text-white/85"
                      style={{ animation: `chip-pop 0.4s ease both ${0.15 + 1 * 0.08}s` }}
                    >
                      I
                    </span>
                    <span key="A"
                      className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 font-bold font-manrope text-[11px] text-white/85"
                      style={{ animation: `chip-pop 0.4s ease both ${0.15 + 2 * 0.08}s` }}
                    >
                      A
                    </span>
                    <span key="S"
                      className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 font-bold font-manrope text-[11px] text-white/85"
                      style={{ animation: `chip-pop 0.4s ease both ${0.15 + 3 * 0.08}s` }}
                    >
                      S
                    </span>
                    <span key="E"
                      className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 font-bold font-manrope text-[11px] text-white/85"
                      style={{ animation: `chip-pop 0.4s ease both ${0.15 + 4 * 0.08}s` }}
                    >
                      E
                    </span>
                    <span key="C"
                      className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 font-bold font-manrope text-[11px] text-white/85"
                      style={{ animation: `chip-pop 0.4s ease both ${0.15 + 5 * 0.08}s` }}
                    >
                      C
                    </span>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <a
                  data-tracked="1"
                  href={buildUtmUrl('/login?callbackUrl=%2Fdashboard%2Fstudent%2Fassessment', { source: 'mulaiplus_web', medium: 'front', campaign: 'assessment-minat', content: 'cta-bottom-hook' }) as any}
                  onClick={() => trackEvent("assessment_cta_click", { type: "minat", cta: "bottom-hook" })}
                  className="group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl bg-brand-orange px-9 py-4 font-bold font-bricolage text-base text-white shadow-xl shadow-brand-orange/30 transition-all hover:brightness-105 active:scale-[0.97]"
                >
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-500 group-hover:translate-x-full" aria-hidden />
                  Mulai Tes Minat <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </a>
                <span className="inline-flex items-center gap-2 font-manrope text-xs text-white/55">
                  Gratis · ±7 menit · tanpa kartu
                </span>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
