import {
  ArrowRight,
  BarChart3,
  Box,
  Brain,
  Calculator,
  CheckCircle2,
  ClipboardList,
  Clock,
  Languages,
  Puzzle,
  SearchCheck,
  Target,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { CountUp, Reveal, StaggerGroup, StaggerItem } from "@/components/front/assessment-anim";
import { AssessmentBreadcrumb } from "@/components/front/assessment-breadcrumb";
import { AssessmentFaq, AssessmentPricingSection } from "@/components/front/assessment-shared";
import { UspStrip } from "@/components/front/assessment-usp";

const ABILITIES = [
  {
    icon: Calculator,
    name: "Numerik",
    desc: "Kemampuan mengolah angka, pola, dan hitungan.",
    sample: "Lanjutkan deret: 2, 4, 8, 16, …",
  },
  {
    icon: Languages,
    name: "Verbal",
    desc: "Kekuatan kosakata, sinonim, dan pemahaman bahasa.",
    sample: "Sinonim kata “cermat” adalah…",
  },
  {
    icon: Puzzle,
    name: "Logika",
    desc: "Penalaran deduktif dan kemampuan menarik kesimpulan.",
    sample: "Semua mahasiswa rajin. Budi mahasiswa, maka…",
  },
  {
    icon: Box,
    name: "Spasial",
    desc: "Visualisasi bentuk, rotasi, dan ruang.",
    sample: "Huruf “b” dicerminkan menjadi…",
  },
  {
    icon: SearchCheck,
    name: "Ketelitian",
    desc: "Kecepatan dan akurasi mengenali detail.",
    sample: "Manakah yang tidak identik dengan AB12CD?",
  },
];

const KEY_FACTS = [
  { icon: Brain, valueNum: 5, suffix: " dimensi", prefix: "", label: "kemampuan dasar" },
  { icon: ClipboardList, valueNum: 10, suffix: " soal", prefix: "", label: "pilihan ganda" },
  { icon: Clock, valueNum: 5, suffix: " menit", prefix: "±", label: "waktu pengerjaan" },
  { icon: TrendingUp, valueNum: 3, suffix: " level", prefix: "", label: "tinggi · sedang · berkembang" },
];

export default function AssessmentBakatPage() {
  return (
    <div className="overflow-hidden bg-white">
      <AssessmentBreadcrumb trail={[{ label: "Test Minat Bakat", href: "/assessment" }]} current="Tes Bakat" />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-32 right-[-8%] h-96 w-96 rounded-full bg-teal-500/[0.07]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 pt-12 pb-14 sm:px-6 md:pt-16 md:pb-20 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/5 px-3 py-1">
                <Brain className="h-3.5 w-3.5 text-teal-600" />
                <span className="font-manrope font-medium text-teal-700 text-xs">Tes Bakat · 5 Kemampuan Dasar</span>
              </div>
              <h1 className="mt-5 font-bold font-bricolage text-4xl text-brand-navy leading-[1.05] tracking-tight md:text-5xl">
                Minat Itu Arah.{" "}
                <span className="relative">
                  <span className="relative z-10">Bakat Itu Kekuatan.</span>
                  <span className="absolute inset-x-0 bottom-1 z-0 h-3 rounded-sm bg-teal-500/20" aria-hidden />
                </span>
              </h1>
              <p className="mt-5 max-w-lg font-manrope text-base text-gray-500 leading-relaxed md:text-lg">
                Tes Bakat mengukur kemampuan dasar yang menentukan seberapa nyaman kamu menyerap materi tertentu — bahan
                penting untuk memilih jurusan yang benar-benar bisa kamu jalani.
              </p>
              <Link
                href="/login?callbackUrl=%2Fdashboard%2Fstudent%2Fassessment"
                className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-brand-navy px-7 py-4 font-bold font-bricolage text-base text-white shadow-brand-navy/15 shadow-lg transition-all hover:bg-brand-navy-light active:scale-[0.98]"
              >
                Mulai Tes Bakat <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Reveal>

            {/* key facts */}
            <StaggerGroup className="grid grid-cols-2 gap-4">
              {KEY_FACTS.map((f) => (
                <StaggerItem key={f.label} className="rounded-2xl border border-gray-100 bg-gray-50/60 p-5">
                  <f.icon className="h-5 w-5 text-teal-600" />
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

      {/* 5 KEMAMPUAN */}
      <section className="border-gray-100 border-t">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="font-bold font-manrope text-teal-600 text-xs uppercase tracking-widest">
              Blueprint Kemampuan
            </p>
            <h2 className="mt-3 font-bold font-bricolage text-3xl text-brand-navy tracking-tight md:text-4xl">
              5 Kemampuan yang Diukur
            </h2>
            <p className="mt-4 font-manrope text-gray-500">
              Setiap dimensi dinilai menjadi level{" "}
              <span className="font-semibold text-gray-700">Tinggi · Sedang · Perlu Pengembangan</span> — lalu digabung
              dengan profil minatmu untuk rekomendasi yang akurat.
            </p>
          </Reveal>

          <StaggerGroup className="mt-12 space-y-3">
            {ABILITIES.map((a, i) => (
              <StaggerItem
                key={a.name}
                className="group flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 transition-all hover:border-teal-500/30 hover:shadow-md md:flex-row md:items-center"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 transition-colors group-hover:bg-teal-500 group-hover:text-white">
                  <a.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold font-bricolage text-gray-900 text-lg">
                    <span className="mr-2 font-bold font-manrope text-sm text-teal-500/60">0{i + 1}</span>
                    {a.name}
                  </h3>
                  <p className="mt-0.5 font-manrope text-gray-500 text-sm">{a.desc}</p>
                </div>
                <div className="rounded-xl bg-gray-50 px-4 py-2.5 md:max-w-xs">
                  <p className="font-bold font-manrope text-[10px] text-gray-400 uppercase tracking-wide">
                    Contoh soal
                  </p>
                  <p className="mt-0.5 font-manrope text-gray-600 text-sm">{a.sample}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* SKORING */}
      <section className="border-gray-100 border-y bg-gray-50/60">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="font-bold font-manrope text-teal-600 text-xs uppercase tracking-widest">Cara Baca Hasil</p>
            <h2 className="mt-3 font-bold font-bricolage text-3xl text-brand-navy tracking-tight">
              Profil yang Langsung Bisa Dipakai
            </h2>
          </Reveal>

          <StaggerGroup className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: BarChart3,
                title: "Profil Kemampuan",
                desc: "Skor per dimensi divisualisasikan dan dikategorikan ke 3 level.",
              },
              {
                icon: TrendingUp,
                title: "Kekuatan Utama",
                desc: "2 dimensi tertinggi menjadi fondasi rekomendasi jurusan.",
              },
              {
                icon: Target,
                title: "Area Pengembangan",
                desc: "Dimensi terendah ditandai sebagai area yang bisa diasah.",
              },
            ].map((s) => (
              <StaggerItem
                key={s.title}
                className="rounded-2xl border border-gray-100 bg-white p-6 text-center transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600">
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-bold font-bricolage text-base text-gray-900">{s.title}</h3>
                <p className="mt-1.5 font-manrope text-gray-500 text-sm">{s.desc}</p>
              </StaggerItem>
            ))}
          </StaggerGroup>

          <Reveal
            delay={0.1}
            className="mx-auto mt-8 flex max-w-3xl items-start gap-3 rounded-2xl border border-teal-100 bg-teal-50/60 p-5"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
            <p className="font-manrope text-sm text-teal-900 leading-relaxed">
              <span className="font-bold">Kombinasi minat + bakat:</span> jurusan direkomendasikan berdasarkan kecocokan
              minat (Holland) <span className="font-medium italic">dan</span> kemampuan yang dibutuhkannya — jadi
              rekomendasi bukan cuma "kamu suka", tapi juga "kamu bisa".
            </p>
          </Reveal>
        </div>
      </section>

      {/* Registrasi + FAQ */}
      <AssessmentPricingSection theme="teal" />
      <AssessmentFaq
        theme="teal"
        items={[
          {
            q: "Apa yang diukur Tes Bakat?",
            a: "Lima kemampuan dasar: numerik (angka & pola), verbal (kosakata & bahasa), logika (penalaran), spasial (visualisasi ruang), dan ketelitian (kecepatan & akurasi detail).",
          },
          {
            q: "Berapa lama tesnya?",
            a: "Sekitar 5 menit untuk 10 soal pilihan ganda. Ada jawaban benar, tapi tidak ada timer yang menekan.",
          },
          {
            q: "Apa bedanya dengan Tes Minat?",
            a: "Minat = apa yang kamu suka (arah). Bakat = seberapa kuat kemampuan dasarmu. Keduanya digabung agar rekomendasi jurusan tidak hanya 'kamu suka', tapi juga 'kamu bisa'.",
          },
          {
            q: "Bagaimana hasilnya dibaca?",
            a: "Setiap dimensi dinilai menjadi Tinggi, Sedang, atau Perlu Pengembangan. Dua tertinggi jadi kekuatan utamamu, terendah jadi area yang bisa diasah.",
          },
          { q: "Apakah tesnya gratis?", a: "Ya, sepenuhnya gratis untuk individu setelah login." },
        ]}
      />

      {/* CTA */}
      <section className="border-gray-100 border-t">
        <Reveal className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 md:py-20 lg:px-8">
          <h2 className="font-bold font-bricolage text-3xl text-brand-navy tracking-tight">Ukur Kekuatanmu Sekarang</h2>
          <p className="mt-3 font-manrope text-gray-500">Gratis, ±5 menit, hasil langsung.</p>
          <Link
            href="/login?callbackUrl=%2Fdashboard%2Fstudent%2Fassessment"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-brand-orange px-8 py-4 font-bold font-bricolage text-base text-white shadow-brand-orange/20 shadow-lg transition-all hover:brightness-105 active:scale-[0.98]"
          >
            Mulai Tes Bakat <ArrowRight className="h-5 w-5" />
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
