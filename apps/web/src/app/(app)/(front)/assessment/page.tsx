import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Compass,
  FileText,
  FlaskConical,
  MessageCircle,
  Palette,
  Quote,
  Sparkles,
  Target,
  TrendingUp,
  User,
} from "lucide-react";
import Link from "next/link";
import { CountUp, Reveal, StaggerGroup, StaggerItem } from "@/components/front/assessment-anim";
import { AssessmentBreadcrumb } from "@/components/front/assessment-breadcrumb";
import { AssessmentEngineSection } from "@/components/front/assessment-usp";

const WA_LINK =
  "https://wa.me/6285730367310?text=Halo%20MULAI%2B%2C%20saya%20ingin%20jadwalkan%20demo%20Test%20Minat%20Bakat%20untuk%20sekolah%20kami";

const STATS = [
  { valueNum: 20, suffix: "", label: "soal terukur" },
  { valueNum: 10, suffix: "", label: "menit selesai" },
  { valueNum: 18, suffix: ".000+", label: "prodi dicocokkan" },
  { valueNum: 6, suffix: "+5", label: "dimensi minat & bakat" },
];

const FEATURES = [
  {
    icon: Target,
    title: "Rekomendasi berbasis data",
    desc: "Setiap jurusan dicocokkan dengan 18.000+ program studi & 400+ universitas di Indonesia — bukan saran umum.",
  },
  {
    icon: Sparkles,
    title: "AI Summary personal",
    desc: "Ringkasan berbahasa Indonesia yang menjelaskan profilmu dan mengapa jurusan tersebut cocok.",
  },
  {
    icon: BarChart3,
    title: "Profil minat & kemampuan",
    desc: "Kode Holland 3 huruf + 5 dimensi kemampuan, divisualisasikan agar mudah dipahami.",
  },
  {
    icon: FileText,
    title: "Laporan PDF siap unduh",
    desc: "Hasil lengkap dalam dokumen rapi — bisa dibagikan ke orang tua atau guru BK.",
  },
];

const STEPS = [
  { icon: User, title: "Buat akun gratis", desc: "Login atau daftar sekali — langsung bisa mulai." },
  { icon: Compass, title: "Ikuti 2 test", desc: "Tes Minat (Holland) + Tes Bakat, tanpa tekanan waktu." },
  { icon: Target, title: "Dapat rekomendasi", desc: "Top 5 jurusan & karier dari data prodi nyata." },
];

export default function AssessmentLandingPage() {
  return (
    <div className="overflow-hidden bg-white">
      <AssessmentBreadcrumb trail={[]} current="Test Minat Bakat" />

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-40 right-[-10%] h-[480px] w-[480px] rounded-full bg-teal-500/[0.07]" />
          <div className="absolute bottom-[-20%] left-[-5%] h-[420px] w-[420px] rounded-full bg-brand-navy/[0.05]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pt-14 pb-16 sm:px-6 md:pt-20 md:pb-24 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Copy */}
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/5 px-3 py-1">
                <Sparkles className="h-3.5 w-3.5 text-mentor-teal" />
                <span className="font-manrope font-medium text-teal-700 text-xs">Gratis · 20 Soal · ±10 Menit</span>
              </div>

              <h1 className="mt-5 font-bold font-bricolage text-4xl text-brand-navy leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
                Temukan Jurusan yang Benar-Benar{" "}
                <span className="relative whitespace-nowrap">
                  <span className="relative z-10">Cocok untukmu</span>
                  <span className="absolute inset-x-0 bottom-1 z-0 h-3 rounded-sm bg-teal-500/20" aria-hidden />
                </span>
              </h1>

              <p className="mt-5 max-w-lg font-manrope text-base text-gray-500 leading-relaxed md:text-lg">
                Test Minat Bakat by MULAI+ menggabungkan{" "}
                <span className="font-semibold text-gray-800">Tes Minat (Holland)</span> dan{" "}
                <span className="font-semibold text-gray-800">Tes Bakat</span> — lalu mencocokkan hasilnya dengan data
                program studi & universitas di Indonesia.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/login?callbackUrl=%2Fdashboard%2Fstudent%2Fassessment"
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-brand-navy px-7 py-4 font-bold font-bricolage text-base text-white shadow-brand-navy/15 shadow-lg transition-all hover:bg-brand-navy-light active:scale-[0.98]"
                >
                  Mulai Gratis
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-7 py-4 font-bold font-bricolage text-base text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98]"
                >
                  Lihat Cara Kerjanya
                </a>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
                {["Tanpa biaya", "Hasil instan", "Bisa diulang"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5 font-manrope font-medium text-gray-500 text-xs">
                    <CheckCircle2 className="h-4 w-4 text-mentor-teal" /> {t}
                  </span>
                ))}
              </div>
            </Reveal>

            {/* Mockup */}
            <Reveal delay={0.15} className="relative mx-auto w-full max-w-lg lg:max-w-none">
              <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xl shadow-brand-navy/10">
                <div className="flex items-center gap-1.5 border-gray-100 border-b bg-gray-50/80 px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-gray-200" />
                  <span className="h-2.5 w-2.5 rounded-full bg-gray-200" />
                  <span className="h-2.5 w-2.5 rounded-full bg-gray-200" />
                  <div className="mx-auto flex items-center gap-1.5 rounded-md bg-white px-3 py-1 font-manrope text-[10px] text-gray-400">
                    <span className="h-2 w-2 rounded-full bg-teal-500" /> assessment
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full w-[60%] rounded-full bg-teal-500" />
                    </div>
                    <span className="font-manrope font-semibold text-gray-400 text-xs">6/10</span>
                  </div>

                  <p className="mt-5 font-manrope font-semibold text-teal-600 text-xs uppercase tracking-wide">
                    Tes Minat
                  </p>
                  <h3 className="mt-1 font-bold font-bricolage text-gray-900 text-lg">
                    Kamu lebih suka bekerja dengan…
                  </h3>

                  <div className="mt-4 space-y-2.5">
                    <div className="flex items-center gap-3 rounded-xl border border-gray-200 p-3.5 transition-colors hover:border-teal-500/50">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                        <FlaskConical className="h-4 w-4" />
                      </span>
                      <span className="font-manrope text-gray-700 text-sm">Data dan eksperimen ilmiah</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border-2 border-teal-500 bg-teal-500/5 p-3.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500 text-white">
                        <Palette className="h-4 w-4" />
                      </span>
                      <span className="font-manrope font-medium text-gray-800 text-sm">Ide kreatif dan visual</span>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between rounded-xl bg-gray-50 p-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white font-bold text-[10px] text-gray-500">
                        I
                      </span>
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white font-bold text-[10px] text-gray-500">
                        A
                      </span>
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white font-bold text-[10px] text-gray-500">
                        S
                      </span>
                    </div>
                    <span className="font-manrope text-[10px] text-gray-400">Kode minatmu</span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="border-gray-100 border-y bg-gray-50/60">
        <StaggerGroup className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 md:grid-cols-4 lg:px-8">
          {STATS.map((s) => (
            <StaggerItem key={s.label} className="text-center">
              <p className="font-bold font-bricolage text-3xl text-brand-navy md:text-4xl">
                <CountUp value={s.valueNum} suffix={s.suffix} />
              </p>
              <p className="mt-1 font-manrope text-gray-500 text-xs uppercase tracking-wide">{s.label}</p>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="font-bold font-manrope text-teal-600 text-xs uppercase tracking-widest">
            Kenapa Test ini Berbeda
          </p>
          <h2 className="mt-3 font-bold font-bricolage text-3xl text-brand-navy tracking-tight md:text-4xl">
            Bukan Quiz Biasa — Ini Sistem Rekomendasi
          </h2>
          <p className="mt-4 font-manrope text-gray-500">
            Dua assessment, satu mesin rekomendasi yang dihubungkan dengan data pendidikan Indonesia.
          </p>
        </Reveal>

        <StaggerGroup className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <StaggerItem
              key={f.title}
              className="group rounded-2xl border border-gray-100 bg-white p-6 transition-all hover:-translate-y-1 hover:border-teal-500/30 hover:shadow-lg hover:shadow-teal-500/5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 transition-colors group-hover:bg-teal-500 group-hover:text-white">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-bold font-bricolage text-base text-gray-900">{f.title}</h3>
              <p className="mt-1.5 font-manrope text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </section>

      {/* ── MESIN REKOMENDASI (USP) ── */}
      <AssessmentEngineSection />

      {/* ── DUA TEST ── */}
      <section className="border-gray-100 border-y bg-gray-50/60">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="font-bold font-manrope text-teal-600 text-xs uppercase tracking-widest">
              Dua Assessment, Satu Arah
            </p>
            <h2 className="mt-3 font-bold font-bricolage text-3xl text-brand-navy tracking-tight md:text-4xl">
              Minat + Bakat = Rekomendasi yang Akurat
            </h2>
            <p className="mt-4 font-manrope text-gray-500">
              Ikuti keduanya berurutan — rekomendasi hanya muncul setelah keduanya selesai.
            </p>
          </Reveal>

          <StaggerGroup className="mt-12 grid gap-5 md:grid-cols-2">
            <StaggerItem>
              <Link
                href="/assessment/minat"
                className="group relative block h-full overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div
                  className="absolute top-0 right-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-violet-500/5 transition-transform group-hover:scale-125"
                  aria-hidden
                />
                <div className="relative">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
                    <Compass className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 font-bold font-bricolage text-gray-900 text-xl">Tes Minat</h3>
                  <p className="mt-2 font-manrope text-gray-500 text-sm leading-relaxed">
                    Model Holland RIASEC — 10 soal untuk menemukan 6 tipe minat yang membentuk arah jurusanmu.
                  </p>
                  <div className="mt-5 flex items-center gap-1.5">
                    {["R", "I", "A", "S", "E", "C"].map((c) => (
                      <span
                        key={c}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-50 font-bold font-bricolage text-gray-500 text-xs"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                  <span className="mt-6 inline-flex items-center gap-1.5 font-bold font-bricolage text-sm text-teal-600">
                    Pelajari <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </StaggerItem>

            <StaggerItem>
              <Link
                href="/assessment/bakat"
                className="group relative block h-full overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div
                  className="absolute top-0 right-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-teal-500/5 transition-transform group-hover:scale-125"
                  aria-hidden
                />
                <div className="relative">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 font-bold font-bricolage text-gray-900 text-xl">Tes Bakat</h3>
                  <p className="mt-2 font-manrope text-gray-500 text-sm leading-relaxed">
                    5 kemampuan dasar — numerik, verbal, logika, spasial, ketelitian — yang menentukan kecepatan
                    belajarmu.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {["Numerik", "Verbal", "Logika", "Spasial", "Ketelitian"].map((a) => (
                      <span
                        key={a}
                        className="rounded-lg bg-gray-50 px-2.5 py-1 font-manrope font-semibold text-[11px] text-gray-500"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                  <span className="mt-6 inline-flex items-center gap-1.5 font-bold font-bricolage text-sm text-teal-600">
                    Pelajari <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </StaggerItem>
          </StaggerGroup>
        </div>
      </section>

      {/* ── CARA KERJA ── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="font-bold font-manrope text-teal-600 text-xs uppercase tracking-widest">Cara Kerja</p>
          <h2 className="mt-3 font-bold font-bricolage text-3xl text-brand-navy tracking-tight md:text-4xl">
            Selesai dalam 3 Langkah
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
      </section>

      {/* ── TESTIMONIAL ── */}
      <section className="border-gray-100 border-y bg-gray-50/60">
        <Reveal className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 md:py-24">
          <Quote className="mx-auto h-8 w-8 text-teal-500/40" />
          <blockquote className="mt-6 font-bold font-bricolage text-gray-900 text-xl leading-relaxed md:text-2xl">
            "Aku sempat bingung antara Kedokteran dan Teknik Informatika. Setelah ikut test ini, rekomendasinya
            menegaskan kalau investigatif + teknis adalah kombinasi yang cocok untukku."
          </blockquote>
          <div className="mt-6 flex items-center justify-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-navy font-bold font-bricolage text-sm text-white">
              R
            </div>
            <div className="text-left">
              <p className="font-bold font-manrope text-gray-900 text-sm">Raka</p>
              <p className="font-manrope text-gray-500 text-xs">Siswa kelas 12, hasil kode IAC</p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── REGISTRASI ── */}
      <section id="untuk-sekolah" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="font-bold font-manrope text-teal-600 text-xs uppercase tracking-widest">Registrasi</p>
          <h2 className="mt-3 font-bold font-bricolage text-3xl text-brand-navy tracking-tight md:text-4xl">
            Gratis untuk Kamu, Demo untuk Sekolah
          </h2>
        </Reveal>

        <Reveal delay={0.1} className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2">
          {/* B2C */}
          <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-8">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-teal-500/10 px-3 py-1 font-bold font-manrope text-[11px] text-teal-700">
                UNTUK DIRI SENDIRI
              </span>
              <span className="rounded-full bg-green-100 px-3 py-1 font-bold font-manrope text-[11px] text-green-700">
                GRATIS
              </span>
            </div>
            <h3 className="mt-4 font-bold font-bricolage text-gray-900 text-xl">Siswa & Umum</h3>
            <p className="mt-2 font-manrope text-gray-500 text-sm">Ikuti test mandiri, dapat rekomendasi langsung.</p>
            <ul className="mt-5 space-y-2.5">
              {["Tanpa biaya, tanpa kartu", "Hasil instan + AI summary", "Laporan PDF", "Bisa diulang kapan saja"].map(
                (t) => (
                  <li key={t} className="flex items-center gap-2.5 font-manrope text-gray-600 text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-600" /> {t}
                  </li>
                ),
              )}
            </ul>
            <div className="flex-1" />
            <Link
              href="/login?callbackUrl=%2Fdashboard%2Fstudent%2Fassessment"
              className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-navy px-6 py-3.5 font-bold font-bricolage text-white transition-all hover:bg-brand-navy-light active:scale-[0.98]"
            >
              Daftar & Mulai Gratis <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* B2B */}
          <div className="relative flex flex-col overflow-hidden rounded-2xl bg-brand-navy p-8 text-white">
            <div
              className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-brand-orange/15 blur-3xl"
              aria-hidden
            />
            <div className="relative flex flex-1 flex-col">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 font-bold font-manrope text-[11px] text-white/80">
                  UNTUK SEKOLAH / INSTITUSI
                </span>
                <span className="rounded-full bg-amber-400/20 px-3 py-1 font-bold font-manrope text-[11px] text-amber-300">
                  DEMO DULU
                </span>
              </div>
              <h3 className="mt-4 font-bold font-bricolage text-xl">Sekolah & Lembaga</h3>
              <p className="mt-2 font-manrope text-sm text-white/70">
                Kelola batch test khusus sekolahmu, pantau hasil seluruh siswa, dan dapatkan rekap analitik.
              </p>
              <ul className="mt-5 space-y-2.5">
                {[
                  "Batch test per kelas/jurusan",
                  "Undangan via link, QR, atau email",
                  "Dashboard progres siswa",
                  "Rekap & analitik distribusi minat",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2.5 font-manrope text-sm text-white/80">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-300" /> {t}
                  </li>
                ))}
              </ul>
              <div className="flex-1" />
              <a
                href={WA_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-orange px-6 py-3.5 font-bold font-bricolage text-white shadow-lg transition-all hover:brightness-105 active:scale-[0.98]"
              >
                <MessageCircle className="h-4 w-4" /> Jadwalkan Demo via WhatsApp
              </a>
              <p className="mt-3 text-center font-manrope text-[11px] text-white/50">
                Tim kami akan menghubungimu untuk penjadwalan demo & kerjasama.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── CLOSING ── */}
      <section className="border-gray-100 border-t">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <Reveal className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-navy to-brand-navy-light px-8 py-12 text-center md:px-12 md:py-16">
            <div
              className="pointer-events-none absolute -top-20 left-1/4 h-56 w-56 rounded-full bg-teal-500/10 blur-3xl"
              aria-hidden
            />
            <div className="relative">
              <h2 className="mx-auto max-w-xl font-bold font-bricolage text-3xl text-white md:text-4xl">
                Jangan Tunda Kenali Arahmu
              </h2>
              <p className="mx-auto mt-3 max-w-md font-manrope text-sm text-white/70">
                20 soal · ±10 menit · gratis. Hasil yang bisa mengubah keputusan kuliahmu.
              </p>
              <Link
                href="/login?callbackUrl=%2Fdashboard%2Fstudent%2Fassessment"
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 font-bold font-bricolage text-base text-brand-navy shadow-lg transition-all hover:bg-amber-50 active:scale-[0.98]"
              >
                Mulai Test Sekarang <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
