import {
  ArrowRight,
  CheckCircle2,
  Compass,
  GraduationCap,
  Map as MapIcon,
  Search,
  Sparkles,
  Target,
} from "lucide-react";
import Link from "next/link";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/front/assessment-anim";
import { AssessmentBreadcrumb } from "@/components/front/assessment-breadcrumb";
import { AssessmentFaq, AssessmentPricingSection } from "@/components/front/assessment-shared";

const STEPS = [
  {
    icon: Search,
    title: "Tulis Karir Impian",
    desc: 'Pakai bahasa sehari-hari — "aku mau jadi game developer", "pengacara", atau "dokter hewan".',
  },
  {
    icon: MapIcon,
    title: "Kami Petakan Jalurnya",
    desc: "Karir dicocokkan ke jurusan, prodi, dan kampus nyata dari 18.000+ program studi di Indonesia.",
  },
  {
    icon: Target,
    title: "Cek Keselarasannya",
    desc: "Jalur dibandingkan dengan profil minat-bakatmu — tahu mana yang paling natural untukmu.",
  },
];

const REASONS = [
  {
    icon: GraduationCap,
    title: "Data prodi & kampus nyata",
    desc: "Bukan saran umum — setiap jalur mengarah ke program studi dan universitas yang benar-benar ada.",
  },
  {
    icon: MapIcon,
    title: "Peta visual yang interaktif",
    desc: "Lihat hubungan karir → jurusan → prodi dalam satu peta yang bisa kamu jelajahi.",
  },
  {
    icon: Sparkles,
    title: "Terhubung dengan hasil testmu",
    desc: "Sudah ikut Test Minat Bakat? Kami tunjukkan seberapa cocok jalur impianmu dengan profilmu.",
  },
  {
    icon: Compass,
    title: "Gratis & tanpa batas",
    desc: "Coba berbagai karir impian sebanyak yang kamu mau — kapan saja.",
  },
];

function MindMapMock() {
  const branch = (x: number, y: number, w: number, h: number, color: string, label: string, sub: string) => (
    <g>
      <path
        d={`M 42 96 C ${x - 70} 96, ${x - 30} ${y + h / 2}, ${x} ${y + h / 2}`}
        stroke={color}
        strokeWidth="2"
        fill="none"
        strokeOpacity="0.5"
      />
      <rect x={x} y={y} width={w} height={h} rx="10" fill="white" stroke={color} strokeWidth="1.5" />
      <text x={x + 12} y={y + 22} fontSize="13" fontWeight="700" fill="#1a1f6d" fontFamily="Manrope, sans-serif">
        {label}
      </text>
      <text x={x + 12} y={y + 40} fontSize="10.5" fill="#6b7280" fontFamily="Manrope, sans-serif">
        {sub}
      </text>
    </g>
  );

  return (
    <svg viewBox="0 0 640 192" className="h-auto w-full" aria-label="Contoh peta jalur karir">
      <rect x="0" y="66" width="84" height="60" rx="14" fill="#1a1f6d" />
      <text
        x="42"
        y="96"
        textAnchor="middle"
        fontSize="12"
        fontWeight="700"
        fill="#fff"
        fontFamily="Manrope, sans-serif"
      >
        Game
      </text>
      <text
        x="42"
        y="112"
        textAnchor="middle"
        fontSize="10"
        fontWeight="600"
        fill="#fe9114"
        fontFamily="Manrope, sans-serif"
      >
        Developer
      </text>

      {branch(120, 14, 150, 52, "#1a1f6d", "Teknik Informatika", "3 prodi · 5 kampus")}
      {branch(120, 126, 150, 52, "#0d9488", "Desain & DKV", "4 prodi · 6 kampus")}

      <g>
        <path
          d={`M 42 96 C 300 96, 330 ${14 + 26}, 360 ${14 + 26}`}
          stroke="#7c3aed"
          strokeWidth="2"
          fill="none"
          strokeOpacity="0.5"
        />
        <rect x={360} y={14} width={150} height={52} rx="10" fill="white" stroke="#7c3aed" strokeWidth="1.5" />
        <text x={372} y={36} fontSize="13" fontWeight="700" fill="#1a1f6d" fontFamily="Manrope, sans-serif">
          Ilmu Komunikasi
        </text>
        <text x={372} y={54} fontSize="10.5" fill="#6b7280" fontFamily="Manrope, sans-serif">
          2 prodi · 4 kampus
        </text>
      </g>

      <g>
        <path
          d={`M 270 ${14 + 26} C 420 ${14 + 26}, 440 ${146}, 500 ${146}`}
          stroke="#fe9114"
          strokeWidth="1.5"
          fill="none"
          strokeOpacity="0.45"
        />
        <rect x={500} y={122} width={120} height={48} rx="10" fill="#fff8f0" stroke="#fe9114" strokeWidth="1.2" />
        <text x={512} y={143} fontSize="11.5" fontWeight="700" fill="#1a1f6d" fontFamily="Manrope, sans-serif">
          Software Engineer
        </text>
        <text x={512} y={160} fontSize="10" fill="#6b7280" fontFamily="Manrope, sans-serif">
          jalur paling dekat
        </text>
      </g>
    </svg>
  );
}

export default function FutureCareerLandingPage() {
  return (
    <div className="overflow-hidden bg-white">
      <AssessmentBreadcrumb trail={[{ label: "Test Minat Bakat", href: "/assessment" }]} current="Karir Impian" />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-32 right-[-8%] h-96 w-96 rounded-full bg-brand-orange/[0.06]" />
          <div className="absolute bottom-[-30%] left-[-6%] h-96 w-96 rounded-full bg-teal-500/[0.06]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pt-14 pb-16 sm:px-6 md:pt-20 md:pb-24 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-orange/25 bg-brand-orange/5 px-3 py-1">
                <Sparkles className="h-3.5 w-3.5 text-brand-orange" />
                <span className="font-manrope font-medium text-orange-700 text-xs">Fitur Baru · Karir Impian</span>
              </div>

              <h1 className="mt-5 font-bold font-bricolage text-4xl text-brand-navy leading-[1.05] tracking-tight md:text-5xl">
                Mau Jadi Apa Nanti?{" "}
                <span className="relative">
                  <span className="relative z-10">Ini Jalur Kuliahnya.</span>
                  <span className="absolute inset-x-0 bottom-1 z-0 h-3 rounded-sm bg-brand-orange/20" aria-hidden />
                </span>
              </h1>

              <p className="mt-5 max-w-lg font-manrope text-base text-gray-500 leading-relaxed md:text-lg">
                Tulis profesi impianmu — kami petakan langsung ke{" "}
                <span className="font-semibold text-gray-800">jurusan, program studi, dan universitas</span> yang
                mengarah ke sana, lalu bandingkan dengan hasil minat-bakatmu.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/login?callbackUrl=%2Fdashboard%2Fstudent%2Fassessment%2Ffuture-career"
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-brand-navy px-7 py-4 font-bold font-bricolage text-base text-white shadow-brand-navy/15 shadow-lg transition-all hover:bg-brand-navy-light active:scale-[0.98]"
                >
                  Coba Gratis
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <a
                  href="#cara-kerja"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-7 py-4 font-bold font-bricolage text-base text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98]"
                >
                  Lihat Cara Kerjanya
                </a>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
                {["Gratis", "Peta interaktif", "Terhubung hasil test"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5 font-manrope font-medium text-gray-500 text-xs">
                    <CheckCircle2 className="h-4 w-4 text-mentor-teal" /> {t}
                  </span>
                ))}
              </div>
            </Reveal>

            {/* Mockup mind map */}
            <Reveal delay={0.15} className="mx-auto w-full max-w-lg lg:max-w-none">
              <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-2xl shadow-brand-navy/10">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-navy text-white">
                    <MapIcon className="h-4.5 w-4.5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold font-bricolage text-gray-900 text-sm">Peta Jalur Kuliah</p>
                    <p className="font-manrope text-[11px] text-gray-400">dari karir impian: Game Developer</p>
                  </div>
                  <span className="rounded-full bg-teal-500/10 px-2.5 py-1 font-bold font-manrope text-[10px] text-teal-700">
                    84% SELARAS
                  </span>
                </div>
                <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/60 px-3.5 py-2.5">
                  <p className="font-manrope text-[11px] text-gray-400">Permintaan</p>
                  <p className="font-manrope font-semibold text-gray-800 text-sm">"aku mau jadi game developer"</p>
                </div>
                <div className="mt-3">
                  <MindMapMock />
                </div>
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-teal-100 bg-teal-50/60 p-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                  <p className="font-manrope text-[11px] text-teal-900 leading-relaxed">
                    Jalur ini <b>sejalan</b> dengan profilmu (kode Holland IAR) — rekomendasi kuat untuk dikejar.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CARA KERJA */}
      <section id="cara-kerja" className="border-gray-100 border-y bg-gray-50/60">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="font-bold font-manrope text-teal-600 text-xs uppercase tracking-widest">Cara Kerja</p>
            <h2 className="mt-3 font-bold font-bricolage text-3xl text-brand-navy tracking-tight md:text-4xl">
              Dari Karir Impian ke Jalur Kuliah dalam 3 Langkah
            </h2>
          </Reveal>

          <StaggerGroup className="relative mt-12 grid gap-8 md:grid-cols-3">
            <div className="absolute top-6 right-[16%] left-[16%] hidden h-px bg-gray-200 md:block" aria-hidden />
            {STEPS.map((s, i) => (
              <StaggerItem key={s.title} className="relative text-center">
                <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-700 shadow-sm">
                  <s.icon className="h-5 w-5" />
                  <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-navy font-bold font-manrope text-[10px] text-white">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-4 font-bold font-bricolage text-base text-gray-900">{s.title}</h3>
                <p className="mx-auto mt-1.5 max-w-xs font-manrope text-gray-500 text-sm">{s.desc}</p>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* KENAPA */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="font-bold font-manrope text-teal-600 text-xs uppercase tracking-widest">Kenapa Karir Impian</p>
          <h2 className="mt-3 font-bold font-bricolage text-3xl text-brand-navy tracking-tight md:text-4xl">
            Lebih dari Sekadar "Bisa Jadi Apa?"
          </h2>
        </Reveal>

        <StaggerGroup className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {REASONS.map((r) => (
            <StaggerItem
              key={r.title}
              className="group rounded-2xl border border-gray-100 bg-white p-6 transition-all hover:-translate-y-1 hover:border-teal-500/30 hover:shadow-lg hover:shadow-teal-500/5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 transition-colors group-hover:bg-teal-500 group-hover:text-white">
                <r.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-bold font-bricolage text-base text-gray-900">{r.title}</h3>
              <p className="mt-1.5 font-manrope text-gray-500 text-sm leading-relaxed">{r.desc}</p>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </section>

      {/* REGISTRASI + FAQ */}
      <AssessmentPricingSection theme="violet" />
      <AssessmentFaq
        theme="violet"
        items={[
          {
            q: "Apa itu fitur Karir Impian?",
            a: 'Kamu menulis profesi impianmu (misal "game developer"), lalu kami memetakan jalur kuliahnya: jurusan yang relevan, program studi, dan universitas — dari data 18.000+ prodi di Indonesia.',
          },
          {
            q: "Apakah harus sudah ikut Test Minat Bakat?",
            a: "Tidak wajib. Fitur ini bisa dipakai berdiri sendiri. Tapi kalau kamu sudah mengikuti test, kami juga menunjukkan seberapa cocok jalur karir impianmu dengan profil minat-bakatmu.",
          },
          {
            q: "Bagaimana kalau karir impianku tidak ada di database?",
            a: "Kami akan menyarankan karier terdekat yang mungkin kamu maksud. Kalau tetap tidak ketemu, kamu tetap bisa melihat daftar karier populer untuk dicoba.",
          },
          {
            q: 'Apa artinya "kurang cocok" pada hasil?',
            a: 'Kami membandingkan jalur karir impianmu dengan kode Holland dan kemampuanmu. "Kurang cocok" artinya jalur itu tidak sejalan dengan profilmu saat ini — kamu tetap bisa mengejarnya, tapi kami sarankan jalur yang lebih natural.',
          },
          { q: "Apakah fitur ini gratis?", a: "Ya, sepenuhnya gratis untuk individu setelah login." },
        ]}
      />

      {/* CTA */}
      <section className="border-gray-100 border-t">
        <Reveal className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 md:py-20 lg:px-8">
          <h2 className="font-bold font-bricolage text-3xl text-brand-navy tracking-tight">
            Mulai Petakan Jalur Karir Impianmu
          </h2>
          <p className="mt-3 font-manrope text-gray-500">Gratis, langsung, dan terhubung dengan hasil testmu.</p>
          <Link
            href="/login?callbackUrl=%2Fdashboard%2Fstudent%2Fassessment%2Ffuture-career"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-brand-orange px-8 py-4 font-bold font-bricolage text-base text-white shadow-brand-orange/20 shadow-lg transition-all hover:brightness-105 active:scale-[0.98]"
          >
            Coba Sekarang <ArrowRight className="h-5 w-5" />
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
